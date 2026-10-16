import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import {
  buyOrUpgradeBusiness,
  claimDailyBonus,
  claimPassiveIncome,
  equipOrBuySkin,
  formatCooldown,
  getOrCreateServerCoop,
  getOrCreateUser,
  getTopLeaderboard,
  getUserBusinesses,
  investOrRescueCoop,
  recordTransaction,
  sqlite,
  takeShortcutGambleOrPinjol,
  workShift,
} from "../src/db/index.ts";
import {
  renderAzabCard,
  renderCoopCard,
  renderLeaderboardCard,
  renderPortfolioCard,
} from "../src/renderer/pixelCard.ts";
import { renderAvatarV3 } from "../src/renderer/renderAvatarV3.ts";
import { renderBannerV3 } from "../src/renderer/renderBannerV3.ts";

const TEST_USERS = [
  "test_u_acid",
  "test_u_rollback",
  "test_u_daily",
  "test_u_work",
  "test_u_biz",
  "test_u_coop",
  "test_u_victim",
  "test_u_render",
] as const;

const TEST_GUILD_ID = "test_guild_karsa_suite";

function cleanupTestEntities(): void {
  const placeholders = TEST_USERS.map(() => "?").join(", ");
  sqlite.query(`DELETE FROM ledger_logs WHERE user_id IN (${placeholders})`).run(...TEST_USERS);
  sqlite.query(`DELETE FROM user_businesses WHERE user_id IN (${placeholders})`).run(...TEST_USERS);
  sqlite.query(`DELETE FROM users WHERE id IN (${placeholders})`).run(...TEST_USERS);
  sqlite.query("DELETE FROM server_coop WHERE guild_id = ?").run(TEST_GUILD_ID);
}

function assertValidPngBuffer(buf: Buffer): void {
  expect(Buffer.isBuffer(buf)).toBe(true);
  expect(buf.byteLength).toBeGreaterThan(1024);
  // PNG Magic Bytes: 89 50 4E 47 (\x89PNG)
  expect(buf[0]).toBe(0x89);
  expect(buf[1]).toBe(0x50);
  expect(buf[2]).toBe(0x4e);
  expect(buf[3]).toBe(0x47);
}

describe("KARSA Bot — Unit & Integration Test Suite", () => {
  beforeEach(() => {
    cleanupTestEntities();
  });

  afterAll(() => {
    cleanupTestEntities();
  });

  describe("1. Database ACID Transactions & Ledger Integrity", () => {
    test("getOrCreateUser initializes exact starter balances, 3 business rows, and starter ledger entry", () => {
      const user = getOrCreateUser("test_u_acid", "JuraganAcid");

      expect(user.id).toBe("test_u_acid");
      expect(user.username).toBe("JuraganAcid");
      expect(user.balance).toBe(48_250_000);
      expect(user.emergency_fund).toBe(55_000_000);
      expect(user.karma).toBe(90);
      expect(user.pinjol_debt).toBe(0);
      expect(user.gems).toBe(3);

      const businesses = getUserBusinesses("test_u_acid");
      expect(businesses).toHaveLength(3);
      expect(businesses.map((b) => b.biz_type)).toEqual([
        "kedai_kopi",
        "brankas_darurat",
        "saham_koperasi",
      ]);

      const logs = sqlite
        .query("SELECT kind, amount, note FROM ledger_logs WHERE user_id = ?")
        .all("test_u_acid") as Array<{ kind: string; amount: number; note: string }>;
      expect(logs).toHaveLength(1);
      expect(logs[0]?.kind).toBe("STARTER");
      expect(logs[0]?.amount).toBe(48_250_000);
    });

    test("SQLite transaction rolls back completely when an error occurs mid-transaction", () => {
      const userBefore = getOrCreateUser("test_u_rollback", "WargaRollback");
      const initialBalance = userBefore.balance;

      const failingTx = sqlite.transaction(() => {
        sqlite
          .query("UPDATE users SET balance = balance + 99000000 WHERE id = ?")
          .run("test_u_rollback");
        recordTransaction("test_u_rollback", "UNCOMMITTED_TX", 99_000_000, "Should roll back");
        throw new Error("Simulated mid-transaction failure");
      });

      expect(() => failingTx()).toThrow("Simulated mid-transaction failure");

      const userAfter = getOrCreateUser("test_u_rollback", "WargaRollback");
      expect(userAfter.balance).toBe(initialBalance);

      const uncommittedLog = sqlite
        .query("SELECT * FROM ledger_logs WHERE user_id = ? AND kind = 'UNCOMMITTED_TX'")
        .get("test_u_rollback");
      expect(uncommittedLog).toBeNull();
    });
  });

  describe("2. Daily Streak & Cooldown Math (/daily)", () => {
    test("claimDailyBonus grants base + streak reward and enforces 20h cooldown", () => {
      const firstClaim = claimDailyBonus("test_u_daily", "WargaDaily");
      expect(firstClaim.ok).toBe(true);
      expect(firstClaim.streak).toBe(1);
      expect(firstClaim.rewardRp).toBeGreaterThan(0);
      expect(firstClaim.remainingMs).toBe(0);

      // Immediate second call within 20h cooldown window
      const secondClaim = claimDailyBonus("test_u_daily", "WargaDaily");
      expect(secondClaim.ok).toBe(false);
      expect(secondClaim.rewardRp).toBe(0);
      expect(secondClaim.remainingMs).toBeGreaterThan(0);
      expect(secondClaim.cooldownText.length).toBeGreaterThan(0);

      // Verify formatCooldown formatting
      expect(formatCooldown(0)).toBe("0d");
      expect(formatCooldown(45_000)).toBe("45d");
      expect(formatCooldown(125_000)).toBe("2m 5d");
      expect(formatCooldown(2 * 3600 * 1000 + 15 * 60 * 1000)).toBe("2j 15m");
    });

    test("simulating last claim between 20h and 48h ago increments streak to 2 with higher rewardRp", () => {
      const firstClaim = claimDailyBonus("test_u_daily", "WargaDaily");
      expect(firstClaim.ok).toBe(true);
      expect(firstClaim.streak).toBe(1);

      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      sqlite
        .query("UPDATE users SET last_daily_at = ? WHERE id = ?")
        .run(twentyFourHoursAgo, "test_u_daily");
      sqlite
        .query("UPDATE ledger_logs SET created_at = ? WHERE user_id = ? AND kind = 'DAILY_MODAL'")
        .run(twentyFourHoursAgo, "test_u_daily");

      const secondClaim = claimDailyBonus("test_u_daily", "WargaDaily");
      expect(secondClaim.ok).toBe(true);
      expect(secondClaim.streak).toBe(2);
      expect(secondClaim.rewardRp).toBeGreaterThan(firstClaim.rewardRp);
    });

    test("simulating expired streak resets streak count back to 1", () => {
      const firstClaim = claimDailyBonus("test_u_daily", "WargaDaily");
      expect(firstClaim.streak).toBe(1);

      const sixtyHoursAgo = Date.now() - 60 * 60 * 60 * 1000;
      sqlite
        .query("UPDATE users SET last_daily_at = ? WHERE id = ?")
        .run(sixtyHoursAgo, "test_u_daily");
      sqlite
        .query("DELETE FROM ledger_logs WHERE user_id = ? AND kind = 'DAILY_MODAL'")
        .run("test_u_daily");

      const resetClaim = claimDailyBonus("test_u_daily", "WargaDaily");
      expect(resetClaim.ok).toBe(true);
      expect(resetClaim.streak).toBe(1);
    });
  });

  describe("3. Work Shifts (/work)", () => {
    test("workShift ethical increases balance, karma, and xp", () => {
      const before = getOrCreateUser("test_u_work", "BaristaJujur");
      // Lower karma slightly so we can observe karma increase without hitting the 100 ceiling
      sqlite.query("UPDATE users SET karma = 75 WHERE id = ?").run("test_u_work");

      const res = workShift("test_u_work", "BaristaJujur", "ethical", 0);
      expect(res.deltaRp).toBeGreaterThan(0);
      expect(res.karmaDelta).toBeGreaterThan(0);
      expect(res.busted).toBe(false);
      expect(res.user.balance).toBe(before.balance + res.deltaRp);
      expect(res.user.karma).toBe(75 + res.karmaDelta);
      expect(res.user.xp).toBeGreaterThan(before.xp);

      const log = sqlite
        .query("SELECT kind, amount FROM ledger_logs WHERE user_id = ? AND kind = 'WORK_ETHICAL'")
        .get("test_u_work") as { kind: string; amount: number } | null;
      expect(log).not.toBeNull();
      expect(log?.amount).toBe(res.deltaRp);
    });

    test("workShift corrupt updates balance, reduces karma, and records WORK_CORRUPT ledger entry", () => {
      const before = getOrCreateUser("test_u_work", "BaristaNakal");
      const res = workShift("test_u_work", "BaristaNakal", "corrupt", 0);

      expect(res.karmaDelta).toBeLessThan(0);
      expect(res.user.karma).toBeLessThan(before.karma);
      expect(res.user.balance).not.toBe(before.balance);

      const log = sqlite
        .query("SELECT kind, amount FROM ledger_logs WHERE user_id = ? AND kind = 'WORK_CORRUPT'")
        .get("test_u_work") as { kind: string; amount: number } | null;
      expect(log).not.toBeNull();
      expect(log?.amount).toBe(res.deltaRp);
    });
  });

  describe("4. Business Upgrades & Passive Income (/bisnis)", () => {
    test("buyOrUpgradeBusiness upgrades kedai_kopi, brankas_darurat, and saham_koperasi", () => {
      getOrCreateUser("test_u_biz", "JuraganBisnis");
      // Ensure ample capital to upgrade all 3 businesses consecutively
      sqlite.query("UPDATE users SET balance = 200000000 WHERE id = ?").run("test_u_biz");

      const beforeBizzes = getUserBusinesses("test_u_biz");
      const kopiBefore = beforeBizzes.find((b) => b.biz_type === "kedai_kopi")!;
      const brankasBefore = beforeBizzes.find((b) => b.biz_type === "brankas_darurat")!;
      const koperasiBefore = beforeBizzes.find((b) => b.biz_type === "saham_koperasi")!;

      const upKopi = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "kedai_kopi");
      expect(upKopi.ok).toBe(true);
      expect(upKopi.nextLevel).toBe(kopiBefore.level + 1);

      const upBrankas = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "brankas_darurat");
      expect(upBrankas.ok).toBe(true);
      expect(upBrankas.nextLevel).toBe(brankasBefore.level + 1);

      const upKoperasi = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "saham_koperasi");
      expect(upKoperasi.ok).toBe(true);
      expect(upKoperasi.nextLevel).toBe(koperasiBefore.level + 1);

      const afterBizzes = getUserBusinesses("test_u_biz");
      const brankasAfter = afterBizzes.find((b) => b.biz_type === "brankas_darurat")!;
      expect(brankasAfter.value).toBe(brankasBefore.value + (upBrankas.upgradeCost ?? 0));
      expect(brankasAfter.daily_yield).toBeGreaterThan(brankasBefore.daily_yield);
    });

    test("claimPassiveIncome applies 15% Karma >= 80 fee discount and credits net passive yield", () => {
      getOrCreateUser("test_u_biz", "JuraganPasif");

      // High Karma (>= 80): 5% fee (95% net)
      sqlite.query("UPDATE users SET karma = 90, balance = 10000000 WHERE id = ?").run("test_u_biz");
      const highKarmaClaim = claimPassiveIncome("test_u_biz", "JuraganPasif");
      expect(highKarmaClaim.taxSaved).toBe(true);
      expect(highKarmaClaim.net).toBe(Math.round(highKarmaClaim.gross * 0.95));
      expect(highKarmaClaim.user.balance).toBe(10_000_000 + highKarmaClaim.net);

      // Low Karma (< 80): 20% fee (80% net) -> 15% difference
      sqlite.query("UPDATE users SET karma = 50, balance = 10000000 WHERE id = ?").run("test_u_biz");
      const lowKarmaClaim = claimPassiveIncome("test_u_biz", "JuraganPasif");
      expect(lowKarmaClaim.taxSaved).toBe(false);
      expect(lowKarmaClaim.net).toBe(Math.round(lowKarmaClaim.gross * 0.8));
      expect(highKarmaClaim.net).toBeGreaterThan(lowKarmaClaim.net);
    });
  });

  describe("5. Shortcut Risk & Koperasi Rescue (/jalan-pintas & /koperasi)", () => {
    test("takeShortcutGambleOrPinjol increases pinjol_debt (>20M), triggers asset seizure, and leaves emergency_fund untouched", () => {
      const userBefore = getOrCreateUser("test_u_victim", "KorbanPinjol");
      const coopBefore = getOrCreateServerCoop(TEST_GUILD_ID);

      const shortcutRes = takeShortcutGambleOrPinjol(
        "test_u_victim",
        "KorbanPinjol",
        "pinjol",
        TEST_GUILD_ID
      );

      expect(shortcutRes.newDebtAdded).toBeGreaterThan(20_000_000);
      expect(shortcutRes.totalDebt).toBeGreaterThan(20_000_000);
      expect(shortcutRes.assetSeizedName).toBe("Mesin Kopi Kedai");
      expect(shortcutRes.assetSeizedValue).toBeGreaterThan(0);
      expect(shortcutRes.user.pinjol_debt).toBe(shortcutRes.totalDebt);
      expect(shortcutRes.user.pinjol_strikes).toBe(userBefore.pinjol_strikes + 1);
      // Emergency fund must remain strictly untouched by pinjol seizure
      expect(shortcutRes.user.emergency_fund).toBe(userBefore.emergency_fund);

      const coopAfter = getOrCreateServerCoop(TEST_GUILD_ID);
      expect(coopAfter.eco_health).toBeLessThan(coopBefore.eco_health);
    });

    test("investOrRescueCoop patungan adds to pool_balance and increases Karma", () => {
      getOrCreateUser("test_u_coop", "WargaKoperasi");
      sqlite.query("UPDATE users SET karma = 75 WHERE id = ?").run("test_u_coop");
      const coopBefore = getOrCreateServerCoop(TEST_GUILD_ID);

      const patunganRes = investOrRescueCoop(
        "test_u_coop",
        "WargaKoperasi",
        "patungan",
        TEST_GUILD_ID
      );

      expect(patunganRes.ok).toBe(true);
      expect(patunganRes.coop.pool_balance).toBe(coopBefore.pool_balance + patunganRes.amount!);
      expect(patunganRes.user.karma).toBe(83);
      expect(patunganRes.user.coop_shares).toBe(patunganRes.amount!);
    });

    test("investOrRescueCoop rescue clears debt, increments rescued_count, and rewards +20 Karma and +1 Gem", () => {
      getOrCreateUser("test_u_victim", "WargaTerselamatkan");
      takeShortcutGambleOrPinjol("test_u_victim", "WargaTerselamatkan", "pinjol", TEST_GUILD_ID);

      const indebtedUser = getOrCreateUser("test_u_victim", "WargaTerselamatkan");
      expect(indebtedUser.pinjol_debt).toBeGreaterThan(0);
      const coopBefore = getOrCreateServerCoop(TEST_GUILD_ID);

      const rescueRes = investOrRescueCoop(
        "test_u_victim",
        "WargaTerselamatkan",
        "rescue",
        TEST_GUILD_ID
      );

      expect(rescueRes.ok).toBe(true);
      expect(rescueRes.user.pinjol_debt).toBe(0);
      expect(rescueRes.user.karma).toBe(indebtedUser.karma + 20);
      expect(rescueRes.user.gems).toBe(indebtedUser.gems + 1);
      expect(rescueRes.coop.rescued_count).toBe(coopBefore.rescued_count + 1);
    });
  });

  describe("6. PNG Magic Bytes (89 50 4E 47) & Buffer Size Verification for All 6 Renderers", () => {
    test("all 6 pixel-art canvas renderers produce valid non-empty PNG buffers", () => {
      const user = getOrCreateUser("test_u_render", "JuraganVisual");
      const businesses = getUserBusinesses("test_u_render");
      const coop = getOrCreateServerCoop(TEST_GUILD_ID);
      const leaders = getTopLeaderboard(5);

      // 1. Portfolio Card
      const portfolioBuf = renderPortfolioCard({ user, businesses, coop });
      assertValidPngBuffer(portfolioBuf);

      // 2. Azab / Seizure Warning Card
      const azabBuf = renderAzabCard({
        username: user.username,
        mode: "pinjol",
        cashLost: 18_000_000,
        totalDebt: 43_500_000,
        assetSeizedName: "Mesin Kopi Kedai",
        karmaAfter: 55,
      });
      assertValidPngBuffer(azabBuf);

      // 3. Koperasi Card
      const coopBuf = renderCoopCard(coop);
      assertValidPngBuffer(coopBuf);

      // 4. Leaderboard Card
      const leaderboardBuf = renderLeaderboardCard(leaders, coop);
      assertValidPngBuffer(leaderboardBuf);

      // 5. Bot Avatar V3 (512x512 upscaled from 32x32)
      const avatarBuf = renderAvatarV3();
      assertValidPngBuffer(avatarBuf);

      // 6. Bot Banner V3
      const bannerBuf = renderBannerV3();
      assertValidPngBuffer(bannerBuf);

      // Also verify skin equip/buy integration
      const skinRes = equipOrBuySkin("test_u_render", "JuraganVisual", "cyberpunk_neon");
      expect(skinRes.ok).toBe(true);
      expect(skinRes.user.skin_id).toBe("cyberpunk_neon");
    });
  });
});
