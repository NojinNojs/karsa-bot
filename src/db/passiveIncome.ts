import { getCurrentMarketEvent } from "../game/mechanics.ts";
import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { computeProgressionQuest, formatCooldown } from "./quests.ts";
import { PASSIVE_COOLDOWN_MS } from "./types.ts";
import { getOrCreateServerCoop, getOrCreateUser, getUserBusinesses } from "./users.ts";

export function claimPassiveIncome(userId: string, username: string, opts?: { enforceCooldown?: boolean; guildId?: string }) {
  const user = getOrCreateUser(userId, username);
  const now = Date.now();

  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return {
      ok: false,
      reason: "🚨 **Lapak Sedang Disegel / Memiliki Tunggakan!** Omzet usaha tertahan sampai tunggakan dilunasi.",
      gross: 0,
      net: 0,
      taxSaved: false,
      user,
    };
  }

  if (opts?.enforceCooldown && user.last_passive_at > 0 && now - user.last_passive_at < PASSIVE_COOLDOWN_MS) {
    const remainingMs = PASSIVE_COOLDOWN_MS - (now - user.last_passive_at);
    return {
      ok: false,
      reason: `⏳ **Setoran Omzet Belum Siap!** Tunggu **${formatCooldown(remainingMs)}** lagi sebelum mencairkan hasil usaha berikutnya.`,
      gross: 0,
      net: 0,
      taxSaved: false,
      user,
    };
  }

  const bizzes = getUserBusinesses(userId);
  const { event: marketEvent } = getCurrentMarketEvent();
  const gross = bizzes.reduce((acc, b) => acc + (b.level > 0 ? b.daily_yield : 0), 0);
  if (gross <= 0) {
    return {
      ok: false,
      reason: "⚠️ Belum ada unit usaha aktif yang menghasilkan omzet.",
      gross: 0,
      net: 0,
      taxSaved: false,
      user,
    };
  }

  const taxRate = user.karma >= 80 ? 0.05 : 0.2;
  const coop = getOrCreateServerCoop(opts?.guildId || "global_kota_mandiri");
  const marketLvlBonus = 1 + Math.max(0, coop.eco_level - 1) * 0.05;
  const net = Math.round(gross * marketEvent.passiveMultiplier * marketLvlBonus * (1 - taxRate));

  sqlite
    .transaction(() => {
      const newBal = user.balance + net;
      const nextQuest = computeProgressionQuest({ ...user, balance: newBal }, bizzes);
      stmt("UPDATE users SET balance = ?, last_passive_at = ?, active_quest = ? WHERE id = ?").run(newBal, now, nextQuest, userId);
      recordTransaction(userId, "PASSIVE_CLAIM", net, `Setoran usaha harian (Potongan sewa ${Math.round(taxRate * 100)}%)`);
    })
    .immediate();

  return { ok: true, gross, net, taxSaved: user.karma >= 80, user: getOrCreateUser(userId, username) };
}
