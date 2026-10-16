import { BUSINESS_CATALOG } from "../game/mechanics.ts";
import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { computeProgressionQuest } from "./quests.ts";
import type { UserRow } from "./types.ts";
import { getOrCreateUser, getUserBusinesses } from "./users.ts";

export function buyOrUpgradeBusiness(userId: string, username: string, bizType: "kedai_kopi" | "brankas_darurat" | "saham_koperasi") {
  const user = getOrCreateUser(userId, username);
  const cat = BUSINESS_CATALOG[bizType]!;
  const allBizzes = getUserBusinesses(userId);
  const kedai = allBizzes.find((b) => b.biz_type === "kedai_kopi");
  const existing = allBizzes.find((b) => b.biz_type === bizType) ?? null;

  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return {
      ok: false,
      reason: "🚨 **Lapak Sedang Disegel / Memiliki Tunggakan!** Lunasi tagihan talangan terlebih dahulu di `/jalan-pintas`.",
      user,
    };
  }

  const kedaiLvl = kedai?.level ?? 1;
  if (kedaiLvl < cat.requiredKedaiLevel) {
    return {
      ok: false,
      reason: `🔒 **Syarat Belum Terpenuhi!** Naikin **Kedai Kopi ke Lv.${cat.requiredKedaiLevel}** terlebih dahulu (Saat ini: Kedai Lv.${kedaiLvl}).`,
      user,
    };
  }

  if (user.karma < cat.requiredKarma) {
    return {
      ok: false,
      reason: `🔒 **Syarat Nama Baik Belum Cukup!** Butuh **Nama Baik minimal ${cat.requiredKarma}/100** (Saat ini: ${user.karma}/100).`,
      user,
    };
  }

  const currentLevel = existing?.level ?? 0;
  const nextLevel = currentLevel + 1;
  const rawCost = Math.round(cat.baseCost * 1.35 ** Math.max(0, nextLevel - 1));
  const upgradeCost = user.karma >= 80 ? Math.round(rawCost * 0.85) : rawCost;
  const yieldBoost = currentLevel === 0 ? cat.baseYield : Math.round(cat.baseYield * 0.45);

  if (user.balance < upgradeCost) {
    return {
      ok: false,
      reason: `Kas belum cukup untuk **${cat.name} Lv.${nextLevel}**! Butuh **Rp ${(upgradeCost / 1_000_000).toFixed(2)} Juta**.`,
      user,
    };
  }

  sqlite
    .transaction(() => {
      const emergencyAdd = bizType === "brankas_darurat" ? upgradeCost : 0;
      stmt("UPDATE users SET balance = balance - ?, emergency_fund = emergency_fund + ?, karma = MIN(100, karma + 3) WHERE id = ?").run(
        upgradeCost,
        emergencyAdd,
        userId,
      );
      if (existing) {
        stmt("UPDATE user_businesses SET level = ?, name = ?, value = value + ?, daily_yield = daily_yield + ? WHERE id = ?").run(
          nextLevel,
          cat.name,
          upgradeCost,
          yieldBoost,
          existing.id,
        );
      } else {
        stmt(
          "INSERT INTO user_businesses (user_id, biz_type, name, level, value, daily_yield, ethical_mode) VALUES (?, ?, ?, ?, ?, ?, 1)",
        ).run(userId, bizType, cat.name, nextLevel, upgradeCost, yieldBoost);
      }
      const updatedUser = stmt("SELECT * FROM users WHERE id = ?").get(userId) as UserRow;
      const nextQuest = computeProgressionQuest(updatedUser, getUserBusinesses(userId));
      stmt("UPDATE users SET active_quest = ? WHERE id = ?").run(nextQuest, userId);
      recordTransaction(userId, "BIZ_UPGRADE", -upgradeCost, `Ekspansi ${cat.name} ke Lv.${nextLevel}`);
    })
    .immediate();

  return { ok: true, nextLevel, upgradeCost, yieldBoost, user: getOrCreateUser(userId, username) };
}
