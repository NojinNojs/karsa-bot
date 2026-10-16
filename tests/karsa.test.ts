import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import {
  buyOrUpgradeBusiness,
  claimDailyBonus,
  claimPassiveIncome,
  devClearAllCooldowns,
  devModifyPlayer,
  equipOrBuySkin,
  formatCooldown,
  getDeveloperTelemetry,
  getOrCreateServerCoop,
  getOrCreateUser,
  getTopLeaderboard,
  getUserBusinesses,
  hasUserAccount,
  investOrRescueCoop,
  recordTransaction,
  registerNewUser,
  repayPinjolDebt,
  sqlite,
  takeShortcutGambleOrPinjol,
  workShift,
} from "../src/db/index.ts";
import {
  getCurrentMarketEvent,
  getRankForLevel,
  MARKET_EVENTS,
  PRESTIGE_RANKS,
} from "../src/game/mechanics.ts";
import {
  renderAzabCard,
  renderCoopCard,
  renderDevMonitorCard,
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

  describe("1. Account Onboarding Gate & True-Zero Starter Stats (/start)", () => {
    test("hasUserAccount is false before /start, registerNewUser initializes Lv.1 Rp500k starter with locked tier-2/3 assets, and re-running /start never overwrites progress", () => {
      expect(hasUserAccount("test_u_acid")).toBe(false);

      const reg1 = registerNewUser("test_u_acid", "PerintisBaru");
      expect(reg1.created).toBe(true);
      expect(hasUserAccount("test_u_acid")).toBe(true);

      const user = reg1.user;
      expect(user.level).toBe(1);
      expect(user.xp).toBe(0);
      expect(user.balance).toBe(500_000);
      expect(user.emergency_fund).toBe(0);
      expect(user.karma).toBe(60);
      expect(user.pinjol_debt).toBe(0);
      expect(user.is_seized).toBe(0);
      expect(user.gems).toBe(0);

      const businesses = getUserBusinesses("test_u_acid");
      expect(businesses).toHaveLength(3);
      const kedai = businesses.find((b) => b.biz_type === "kedai_kopi")!;
      const brankas = businesses.find((b) => b.biz_type === "brankas_darurat")!;
      const saham = businesses.find((b) => b.biz_type === "saham_koperasi")!;

      expect(kedai.level).toBe(1);
      expect(kedai.value).toBe(1_500_000);
      expect(brankas.level).toBe(0); // Locked until Kedai Lv.2
      expect(saham.level).toBe(0); // Locked until Kedai Lv.3 & Karma >= 65

      // Modify balance and verify re-running registerNewUser does NOT overwrite
      sqlite.query("UPDATE users SET balance = 9500000 WHERE id = ?").run("test_u_acid");
      const reg2 = registerNewUser("test_u_acid", "PerintisBaru");
      expect(reg2.created).toBe(false);
      expect(reg2.user.balance).toBe(9_500_000);
    });

    test("SQLite ACID transaction rolls back completely when an error occurs mid-transaction", () => {
      const userBefore = getOrCreateUser("test_u_rollback", "WargaRollback");
      const initialBalance = userBefore.balance;

      const failingTx = sqlite.transaction(() => {
        sqlite.query("UPDATE users SET balance = balance + 99000000 WHERE id = ?").run("test_u_rollback");
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
      sqlite.query("UPDATE users SET last_daily_at = ? WHERE id = ?").run(twentyFourHoursAgo, "test_u_daily");
      sqlite
        .query("UPDATE ledger_logs SET created_at = ? WHERE user_id = ? AND kind = 'DAILY_MODAL'")
        .run(twentyFourHoursAgo, "test_u_daily");

      const secondClaim = claimDailyBonus("test_u_daily", "WargaDaily");
      expect(secondClaim.ok).toBe(true);
      expect(secondClaim.streak).toBe(2);
      expect(secondClaim.rewardRp).toBeGreaterThan(firstClaim.rewardRp);
    });
  });

  describe("3. Work Shifts, 30s Cooldown & XP Level-Up (/work)", () => {
    test("workShift ethical increases balance, karma, xp, auto-levels up after 3 shifts, and enforces 30s cooldown when enabled", () => {
      const before = getOrCreateUser("test_u_work", "BaristaJujur");
      expect(before.level).toBe(1);

      // Shift 1 (with enforceCooldown)
      const res1 = workShift("test_u_work", "BaristaJujur", "ethical", 0, { enforceCooldown: true });
      expect(res1.ok).toBe(true);
      expect(res1.deltaRp).toBeGreaterThan(0);

      // Immediate Shift 2 with enforceCooldown: true MUST be blocked by 30s cooldown!
      const blocked = workShift("test_u_work", "BaristaJujur", "ethical", 0, { enforceCooldown: true });
      expect(blocked.ok).toBe(false);
      expect(blocked.cooldownRemainingMs).toBeGreaterThan(0);

      // Shifts 2 & 3 (without cooldown wait) push XP >= 100 -> Level 2!
      workShift("test_u_work", "BaristaJujur", "ethical", 1);
      const res3 = workShift("test_u_work", "BaristaJujur", "ethical", 2);
      expect(res3.user.xp).toBeGreaterThanOrEqual(100);
      expect(res3.user.level).toBe(2);
      expect(res3.user.job_title).toBe("BARISTA PASAR");
    });

    test("workShift corrupt updates balance, reduces karma, and records WORK_CORRUPT ledger entry", () => {
      const before = getOrCreateUser("test_u_work", "BaristaNakal");
      const res = workShift("test_u_work", "BaristaNakal", "corrupt", 0);

      expect(res.karmaDelta).toBeLessThan(0);
      expect(res.user.karma).toBeLessThan(before.karma);

      const log = sqlite
        .query("SELECT kind, amount FROM ledger_logs WHERE user_id = ? AND kind = 'WORK_CORRUPT'")
        .get("test_u_work") as { kind: string; amount: number } | null;
      expect(log).not.toBeNull();
    });
  });

  describe("4. Prerequisite Gates ('If Not A, Cannot Do B') & Passive Income (/bisnis)", () => {
    test("blocks Brankas Darurat before Kedai Lv.2, blocks Saham Koperasi before Kedai Lv.3 & Karma 65, then unlocks them in order", () => {
      getOrCreateUser("test_u_biz", "JuraganBisnis");
      sqlite.query("UPDATE users SET balance = 50000000 WHERE id = ?").run("test_u_biz");

      // Gate B: Try buying Brankas while Kedai is still Lv.1 -> MUST FAIL!
      const blockedBrankas = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "brankas_darurat");
      expect(blockedBrankas.ok).toBe(false);
      expect(blockedBrankas.reason).toContain("Kedai Kopi ke Lv.2");

      // Gate C: Try buying Saham Koperasi while Kedai is Lv.1 -> MUST FAIL!
      const blockedSaham1 = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "saham_koperasi");
      expect(blockedSaham1.ok).toBe(false);
      expect(blockedSaham1.reason).toContain("Kedai Kopi ke Lv.3");

      // Step 1: Upgrade Kedai Kopi to Lv.2
      const upKedai2 = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "kedai_kopi");
      expect(upKedai2.ok).toBe(true);
      expect(upKedai2.nextLevel).toBe(2);

      // Step 2: Now Brankas Darurat unlocks at Lv.1 and increases emergency_fund!
      const openBrankas = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "brankas_darurat");
      expect(openBrankas.ok).toBe(true);
      expect(openBrankas.nextLevel).toBe(1);
      expect(openBrankas.user.emergency_fund).toBeGreaterThan(0);

      // Step 3: Upgrade Kedai Kopi to Lv.3, ensure Karma >= 65, then unlock Saham Koperasi!
      const upKedai3 = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "kedai_kopi");
      expect(upKedai3.ok).toBe(true);
      expect(upKedai3.nextLevel).toBe(3);

      const openSaham = buyOrUpgradeBusiness("test_u_biz", "JuraganBisnis", "saham_koperasi");
      expect(openSaham.ok).toBe(true);
      expect(openSaham.nextLevel).toBe(1);
    });

    test("claimPassiveIncome applies 15% Karma >= 80 fee discount, live market multiplier and 5m cooldown when enabled", () => {
      getOrCreateUser("test_u_biz", "JuraganPasif");
      const { event } = getCurrentMarketEvent();

      // High Karma (>= 80): 5% fee (95% net) × live market multiplier
      sqlite.query("UPDATE users SET karma = 90, balance = 10000000 WHERE id = ?").run("test_u_biz");
      const highKarmaClaim = claimPassiveIncome("test_u_biz", "JuraganPasif", { enforceCooldown: true });
      expect(highKarmaClaim.ok).toBe(true);
      expect(highKarmaClaim.taxSaved).toBe(true);
      expect(highKarmaClaim.net).toBe(Math.round(highKarmaClaim.gross * event.passiveMultiplier * 0.95));

      // Immediate second claim with enforceCooldown: true MUST be blocked
      const cooldownBlocked = claimPassiveIncome("test_u_biz", "JuraganPasif", { enforceCooldown: true });
      expect(cooldownBlocked.ok).toBe(false);
    });

    test("dynamic market events rotate hourly with deterministic multi-key output and prestige ranks scale with level", () => {
      const a = getCurrentMarketEvent(0);
      const b = getCurrentMarketEvent(3600 * 1000);
      expect(a.event.id).not.toBe(b.event.id);
      expect(a.nextChangeUnixSec).toBe(3600);
      expect(b.nextChangeUnixSec).toBe(2 * 3600);
      expect(MARKET_EVENTS.some((e) => e.id === "ihsg_goyang")).toBe(true);

      expect(getRankForLevel(1).title).toBe("PERINTIS LAPAK");
      expect(getRankForLevel(2).title).toBe("BARISTA PASAR");
      expect(getRankForLevel(30).title).toBe(PRESTIGE_RANKS[PRESTIGE_RANKS.length - 1]!.title);
    });
  });

  describe("5. Seizure Lockdown, Debt Repayment & Koperasi Rescue (/jalan-pintas & /koperasi)", () => {
    test("seizure locks upgrades & passive claims, preserves emergency_fund, and repayPinjolDebt lifts the seal", () => {
      getOrCreateUser("test_u_victim", "KorbanPinjol");
      sqlite
        .query("UPDATE users SET balance = 5000000, emergency_fund = 12000000 WHERE id = ?")
        .run("test_u_victim");

      const shortcutRes = takeShortcutGambleOrPinjol(
        "test_u_victim",
        "KorbanPinjol",
        "pinjol",
        TEST_GUILD_ID,
      );

      expect(shortcutRes.user.is_seized).toBe(1);
      expect(shortcutRes.user.pinjol_debt).toBeGreaterThanOrEqual(2_000_000);
      // Emergency fund must remain 100% untouched by seizure!
      expect(shortcutRes.user.emergency_fund).toBe(12_000_000);

      // Seizure must block business upgrades and passive claims
      const blockedUp = buyOrUpgradeBusiness("test_u_victim", "KorbanPinjol", "kedai_kopi");
      expect(blockedUp.ok).toBe(false);
      const blockedClaim = claimPassiveIncome("test_u_victim", "KorbanPinjol");
      expect(blockedClaim.ok).toBe(false);

      // Give player enough cash to pay off debt and verify seal is lifted
      sqlite.query("UPDATE users SET balance = 60000000 WHERE id = ?").run("test_u_victim");
      const repayRes = repayPinjolDebt("test_u_victim", "KorbanPinjol");
      expect(repayRes.ok).toBe(true);
      expect(repayRes.sealLifted).toBe(true);
      expect(repayRes.user.pinjol_debt).toBe(0);
      expect(repayRes.user.is_seized).toBe(0);
    });

    test("investOrRescueCoop enforces Level 2 gate, then patungan & rescue work cleanly", () => {
      getOrCreateUser("test_u_coop", "WargaKoperasi");
      // At Level 1 with Rp 500k, patungan is blocked by Level 2 gate
      const blockedCoop = investOrRescueCoop("test_u_coop", "WargaKoperasi", "patungan", TEST_GUILD_ID);
      expect(blockedCoop.ok).toBe(false);

      // Promote to Level 2 with Rp 20M balance
      sqlite
        .query("UPDATE users SET level = 2, balance = 20000000, karma = 75 WHERE id = ?")
        .run("test_u_coop");
      const coopBefore = getOrCreateServerCoop(TEST_GUILD_ID);

      const patunganRes = investOrRescueCoop("test_u_coop", "WargaKoperasi", "patungan", TEST_GUILD_ID);
      expect(patunganRes.ok).toBe(true);
      expect(patunganRes.coop.pool_balance).toBe(coopBefore.pool_balance + 1_500_000);
      expect((patunganRes.coop.contributors || []).length).toBeGreaterThanOrEqual(1);
      // Verify patungan at Level 2 does NOT prematurely unlock saham_koperasi (requires Kedai Lv.3)
      const coopBizAfterPatungan = getUserBusinesses("test_u_coop").find(
        (b) => b.biz_type === "saham_koperasi",
      );
      expect(coopBizAfterPatungan?.level).toBe(0);

      // Verify rescue is rejected without deducting cash when nobody is seized
      const balBeforeEmptyRescue = getOrCreateUser("test_u_coop", "WargaKoperasi").balance;
      const noVictimRescue = investOrRescueCoop("test_u_coop", "WargaKoperasi", "rescue", TEST_GUILD_ID);
      expect(noVictimRescue.ok).toBe(false);
      expect(getOrCreateUser("test_u_coop", "WargaKoperasi").balance).toBe(balBeforeEmptyRescue);

      // Create an indebted fellow player to verify cross-player rescue!
      getOrCreateUser("test_u_victim", "KorbanSegel");
      takeShortcutGambleOrPinjol("test_u_victim", "KorbanSegel", "slot", TEST_GUILD_ID);
      expect(getOrCreateUser("test_u_victim", "KorbanSegel").is_seized).toBe(1);

      const rescueRes = investOrRescueCoop(
        "test_u_coop",
        "WargaKoperasi",
        "rescue",
        TEST_GUILD_ID,
        "test_u_victim",
      );
      expect(rescueRes.ok).toBe(true);
      expect(rescueRes.rescuedUsername).toBe("KorbanSegel");
      expect(rescueRes.user.gems).toBe(2);
      expect(getOrCreateUser("test_u_victim", "KorbanSegel").is_seized).toBe(0);
      expect(getOrCreateUser("test_u_victim", "KorbanSegel").pinjol_debt).toBe(0);
    });
  });

  describe("6. PNG Magic Bytes (89 50 4E 47) & Buffer Size Verification for All 7 Renderers + /dev Telemetry", () => {
    test("all 7 pixel-art canvas renderers & /dev telemetry tools work cleanly", () => {
      const user = getOrCreateUser("test_u_render", "JuraganVisual");
      sqlite.query("UPDATE users SET balance = 50000000 WHERE id = ?").run("test_u_render");
      const businesses = getUserBusinesses("test_u_render");
      const coop = getOrCreateServerCoop(TEST_GUILD_ID);
      const leaders = getTopLeaderboard(5);
      const tel = getDeveloperTelemetry(TEST_GUILD_ID);

      expect(tel.cpuCores).toBeGreaterThanOrEqual(1);
      expect(tel.ramPct).toBeGreaterThanOrEqual(1);

      assertValidPngBuffer(renderPortfolioCard({ user, businesses, coop }));
      assertValidPngBuffer(
        renderAzabCard({
          username: user.username,
          mode: "pinjol",
          cashLost: 1_000_000,
          totalDebt: 3_000_000,
          assetSeizedName: "Mesin Kopi Kedai",
          karmaAfter: 55,
        }),
      );
      assertValidPngBuffer(renderCoopCard(coop));
      assertValidPngBuffer(renderLeaderboardCard(leaders, coop));
      assertValidPngBuffer(renderDevMonitorCard(tel, 38));
      assertValidPngBuffer(renderAvatarV3());
      assertValidPngBuffer(renderBannerV3());

      const devMod = devModifyPlayer({
        targetQuery: "JuraganVisual",
        callerId: "test_u_render",
        callerName: "JuraganVisual",
        cashInput: "+1000000",
        statsInput: "level=4, gems=12, karma=90",
      });
      expect(devMod.ok).toBe(true);
      expect(devMod.user.level).toBe(4);
      expect(devMod.user.gems).toBe(12);
      expect(devClearAllCooldowns("test_u_render")).toBe(1);

      const skinRes = equipOrBuySkin("test_u_render", "JuraganVisual", "cyberpunk_neon", "gems");
      expect(skinRes.ok).toBe(true);
      expect(skinRes.user.skin_id).toBe("cyberpunk_neon");
      expect(skinRes.user.gems).toBe(2);
    });
  });
});
