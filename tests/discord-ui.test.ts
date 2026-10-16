import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { MessageFlags } from "discord.js";
import { CUSTOM_IDS } from "../src/commands/definitions.ts";
import { buildCooldownTag, buildStateAwarePortfolioRows } from "../src/commands/handlers.ts";
import { DAILY_COOLDOWN_MS, getOrCreateUser, sqlite, WORK_COOLDOWN_MS } from "../src/db/index.ts";
import { BUSINESS_CATALOG, PRESTIGE_RANKS } from "../src/game/mechanics.ts";

const TEST_USERS = ["ui_lv1", "ui_lv2", "ui_debt", "ui_seized"] as const;

function cleanup(): void {
  const ph = TEST_USERS.map(() => "?").join(", ");
  sqlite.query(`DELETE FROM ledger_logs WHERE user_id IN (${ph})`).run(...TEST_USERS);
  sqlite.query(`DELETE FROM user_businesses WHERE user_id IN (${ph})`).run(...TEST_USERS);
  sqlite.query(`DELETE FROM users WHERE id IN (${ph})`).run(...TEST_USERS);
}

/** Discord hard limits — a button label over 80 chars is rejected by the API at runtime. */
const DISCORD_LIMITS = {
  maxButtonLabel: 80,
  maxButtonsPerRow: 5,
  maxRowsPerMessage: 5,
  maxEmbedTitle: 256,
  maxEmbedDescription: 4096,
  maxEmbedFields: 25,
};

/** Narrow view of the serialized button payload we assert against. */
interface ButtonJSON {
  custom_id: string;
  label?: string;
  disabled?: boolean;
}

function buttonsOf(row: ReturnType<typeof buildStateAwarePortfolioRows>[number]): ButtonJSON[] {
  return row.toJSON().components as unknown as ButtonJSON[];
}

function assertButtonRowPayload(rows: ReturnType<typeof buildStateAwarePortfolioRows>, context: string): void {
  expect(rows.length).toBeLessThanOrEqual(DISCORD_LIMITS.maxRowsPerMessage);
  for (const row of rows) {
    const components = buttonsOf(row);
    expect(components.length).toBeLessThanOrEqual(DISCORD_LIMITS.maxButtonsPerRow);
    for (const btn of components) {
      expect(typeof btn.label).toBe("string");
      const label = btn.label ?? "";
      expect(label.length, `${context}: button label "${label}" must be <= 80 chars`).toBeLessThanOrEqual(DISCORD_LIMITS.maxButtonLabel);
      expect(label.length, `${context}: button "${label}" must not be empty`).toBeGreaterThan(0);
    }
  }
}

function labelsOf(rows: ReturnType<typeof buildStateAwarePortfolioRows>): string[] {
  return rows.flatMap((r) => buttonsOf(r).map((c) => c.label ?? ""));
}

function findButton(rows: ReturnType<typeof buildStateAwarePortfolioRows>, customId: string): ButtonJSON | null {
  for (const row of rows) {
    for (const c of buttonsOf(row)) {
      if (c.custom_id === customId) return c;
    }
  }
  return null;
}

describe("KARSA Discord UI — State-Driven Button Logic & Payload Limits", () => {
  beforeEach(() => {
    cleanup();
  });

  afterAll(() => {
    cleanup();
  });

  test("fresh Level 1 player: coop button is locked + disabled, daily is enabled, pay-seal buttons absent", () => {
    const user = getOrCreateUser("ui_lv1", "PemainBaru");
    expect(user.level).toBe(1);
    expect(user.pinjol_debt).toBe(0);

    const rows = buildStateAwarePortfolioRows(user);
    assertButtonRowPayload(rows, "lv1");

    const labels = labelsOf(rows);
    expect(labels).toContain("☕ Seduh Kopi");
    expect(labels).toContain("☀️ Uang Harian");
    expect(labels).toContain("🏪 Kelola Usaha");

    const coopBtn = findButton(rows, CUSTOM_IDS.BTN_KOPERASI);
    expect(coopBtn).not.toBeNull();
    expect(coopBtn!.label).toBe("🔒 Koperasi (Lv.2)");
    expect(coopBtn!.disabled).toBe(true);

    // Talangan replaces the pay-seal button for a debt-free player
    expect(findButton(rows, CUSTOM_IDS.BTN_JALAN_PINTAS)).not.toBeNull();
    expect(findButton(rows, CUSTOM_IDS.BTN_REPAY_DEBT)).toBeNull();
    expect(findButton(rows, CUSTOM_IDS.BTN_REPAY_MODAL_OPEN)).toBeNull();
  });

  test("Level 2 player: coop unlocks (enabled, no lock label)", () => {
    const _user = getOrCreateUser("ui_lv2", "PedagangNaik");
    sqlite.query("UPDATE users SET level = 2 WHERE id = ?").run("ui_lv2");
    const updated = getOrCreateUser("ui_lv2", "PedagangNaik");

    const rows = buildStateAwarePortfolioRows(updated);
    const coopBtn = findButton(rows, CUSTOM_IDS.BTN_KOPERASI);
    expect(coopBtn!.label).toBe("🤝 Koperasi");
    expect(coopBtn!.disabled).toBe(false);
  });

  test("player who already claimed /daily: daily button becomes disabled 'Harian Diambil'", () => {
    const user = getOrCreateUser("ui_lv1", "PemainBaru");
    const justClaimed = { ...user, last_daily_at: Date.now() };
    const rows = buildStateAwarePortfolioRows(justClaimed);
    const dailyBtn = findButton(rows, CUSTOM_IDS.BTN_DAILY);
    expect(dailyBtn!.label).toBe("✅ Harian Diambil");
    expect(dailyBtn!.disabled).toBe(true);
    assertButtonRowPayload(rows, "daily-claimed");
  });

  test("indebted player: business button is disabled, pay-seal + cicil buttons appear, coop stays gated by level", () => {
    const _user = getOrCreateUser("ui_debt", "WargaUtang");
    sqlite.query("UPDATE users SET pinjol_debt = 43500000, balance = 1500000 WHERE id = ?").run("ui_debt");
    const indebted = getOrCreateUser("ui_debt", "WargaUtang");

    const rows = buildStateAwarePortfolioRows(indebted);
    assertButtonRowPayload(rows, "indebted");
    const labels = labelsOf(rows);

    expect(labels).toContain("☕ Seduh Cari Uang");
    expect(labels.some((l) => l.startsWith("💸 Bayar Segel"))).toBe(true);
    expect(findButton(rows, CUSTOM_IDS.BTN_REPAY_MODAL_OPEN)).not.toBeNull();

    const bizBtn = findButton(rows, CUSTOM_IDS.BTN_BISNIS);
    expect(bizBtn!.disabled).toBe(true);
    expect(bizBtn!.label).toBe("🔒 Usaha Disegel");

    // Level 1 + debt: coop remains locked
    expect(findButton(rows, CUSTOM_IDS.BTN_KOPERASI)!.disabled).toBe(true);
    // No Talangan entry while already indebted
    expect(findButton(rows, CUSTOM_IDS.BTN_JALAN_PINTAS)).toBeNull();
  });

  test("seized player with zero liquid cash: pay buttons are disabled (cannot pay with nothing)", () => {
    const _user = getOrCreateUser("ui_seized", "LapakSegel");
    sqlite.query("UPDATE users SET pinjol_debt = 43500000, balance = 0, emergency_fund = 0, is_seized = 1 WHERE id = ?").run("ui_seized");
    const seized = getOrCreateUser("ui_seized", "LapakSegel");

    const rows = buildStateAwarePortfolioRows(seized);
    assertButtonRowPayload(rows, "seized-broke");
    expect(findButton(rows, CUSTOM_IDS.BTN_REPAY_DEBT)!.disabled).toBe(true);
    expect(findButton(rows, CUSTOM_IDS.BTN_REPAY_MODAL_OPEN)!.disabled).toBe(true);
    // Work is still the intended escape hatch (Discord omits `disabled` when false)
    expect(findButton(rows, CUSTOM_IDS.BTN_WORK)!.disabled ?? false).toBe(false);
  });

  test("every state produces labels that fit Discord's 80-char button limit", () => {
    const huge = getOrCreateUser("ui_debt", "NamaPedagangSangatPanjangSekali");
    sqlite.query("UPDATE users SET pinjol_debt = 999999999999, balance = 123456789 WHERE id = ?").run("ui_debt");
    const loaded = getOrCreateUser("ui_debt", "NamaPedagangSangatPanjangSekali");
    const rows = buildStateAwarePortfolioRows(loaded);
    assertButtonRowPayload(rows, "huge-numbers");
    expect(huge.username.length).toBeGreaterThan(0);
  });

  test("buildCooldownTag returns ready label off-cooldown and a live <t:..:R> tag on-cooldown", () => {
    expect(buildCooldownTag(0, WORK_COOLDOWN_MS, "Siap")).toBe("Siap");
    const justWorked = { lastAt: Date.now(), ms: WORK_COOLDOWN_MS };
    const tag = buildCooldownTag(justWorked.lastAt, justWorked.ms, "Siap");
    expect(tag).toMatch(/^Siap <t:\d+:R>$/);

    const expired = buildCooldownTag(Date.now() - WORK_COOLDOWN_MS - 1000, WORK_COOLDOWN_MS, "Siap");
    expect(expired).toBe("Siap");
    expect(DAILY_COOLDOWN_MS).toBe(20 * 60 * 60 * 1000);
    expect(MessageFlags.Ephemeral).toBeDefined();
  });

  test("all Prestige Ranks, Badges, and Business Subtitles fit inside pixel-card bounding boxes without truncation", () => {
    for (const rank of PRESTIGE_RANKS) {
      expect(rank.title.length, `Rank title "${rank.title}" must be <= 14 chars`).toBeLessThanOrEqual(14);
    }
    const allBadges = ["WARGA BARU", "WARUNG JUJUR", "WARGA PASAR", "CATATAN MERAH", "LAPAK DISEGEL", "BANGKIT LAGI"];
    for (const badge of allBadges) {
      expect(badge.length, `Badge "${badge}" must be <= 13 chars`).toBeLessThanOrEqual(13);
    }
    for (const item of Object.values(BUSINESS_CATALOG)) {
      const fullSub = `LV.9 • ${item.subtitle.toUpperCase()}`;
      expect(fullSub.length, `Business subtitle "${fullSub}" must be <= 18 chars`).toBeLessThanOrEqual(18);
    }
  });

  test("v1.5.0 Atomic Clean Architecture: every single .ts file in src/ is strictly <= 100 lines", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else if (full.endsWith(".ts")) out.push(full);
      }
      return out;
    };
    const files = walk(join(process.cwd(), "src"));
    expect(files.length).toBeGreaterThan(50);
    for (const f of files) {
      const lines = readFileSync(f, "utf-8").split("\n").length - (readFileSync(f, "utf-8").endsWith("\n") ? 1 : 0);
      expect(lines, `File ${f} has ${lines} lines (must be <= 100)`).toBeLessThanOrEqual(100);
    }
  });

  test("v1.5.0 Feedback, Update Notice, Render Cache & Concurrency Guard work cleanly", async () => {
    const { submitUserFeedback, getRecentFeedback } = await import("../src/db/index.ts");
    const { BOT_VERSION, buildUpdateInfoPayload } = await import("../src/game/mechanics.ts");
    const { getCachedOrRenderPng, getRenderCacheStats } = await import("../src/renderer/renderCache.ts");
    const { withUserLock } = await import("../src/commands/concurrencyGuard.ts");

    expect(BOT_VERSION).toBe("1.5.0");
    const upd = buildUpdateInfoPayload();
    expect(upd.embeds.length).toBe(1);
    expect(upd.components.length).toBe(1);

    const fb = submitUserFeedback("u_fb_1", "AqsanTester", "Saran Fitur", "Tambahkan fitur koperasi patungan otomatis!");
    expect(fb.username).toBe("AqsanTester");
    const list = getRecentFeedback(5);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0]!.username).toBe("AqsanTester");

    let calls = 0;
    const b1 = getCachedOrRenderPng("test_key_v150", () => {
      calls++;
      return Buffer.from("89504e47", "hex");
    });
    const b2 = getCachedOrRenderPng("test_key_v150", () => {
      calls++;
      return Buffer.from("89504e47", "hex");
    });
    expect(calls).toBe(1);
    expect(b1.equals(b2)).toBe(true);
    expect(getRenderCacheStats().hits).toBeGreaterThanOrEqual(1);

    const first = await withUserLock("u_lock_1", async () => "ok");
    expect(first.locked).toBe(false);
  });
});
