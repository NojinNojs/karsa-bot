import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { computeProgressionQuest } from "./quests.ts";
import { getOrCreateUser, getUserBusinesses } from "./users.ts";

export function repayPinjolDebt(userId: string, username: string, customAmount?: number) {
  const user = getOrCreateUser(userId, username);
  if (user.pinjol_debt <= 0) {
    return {
      ok: false,
      paidRp: 0,
      remainingDebt: 0,
      sealLifted: false,
      message: "✅ **Lapakmu Bebas Tunggakan!** Tidak ada tagihan talangan yang perlu dibayar.",
      user,
    };
  }

  if (user.balance <= 0) {
    return {
      ok: false,
      paidRp: 0,
      remainingDebt: user.pinjol_debt,
      sealLifted: false,
      message:
        "⚠️ **Laci Kas Kosong!** Klik **☕ Seduh Cari Uang** atau **☀️ Uang Harian** terlebih dahulu (Tabungan Emas tetap aman & tidak ikut terpakai).",
      user,
    };
  }

  const targetPay = customAmount ? Math.min(customAmount, user.pinjol_debt) : user.pinjol_debt;
  const actualPay = Math.min(user.balance, targetPay);
  const newDebt = Math.max(0, user.pinjol_debt - actualPay);
  const sealLifted = newDebt === 0;

  sqlite
    .transaction(() => {
      const newBadge = sealLifted ? "BANGKIT LAGI" : "LAPAK DISEGEL";
      const newKarma = sealLifted ? Math.min(100, user.karma + 15) : Math.min(100, user.karma + 5);
      const nextQuest = sealLifted
        ? computeProgressionQuest({ ...user, pinjol_debt: 0, is_seized: 0, karma: newKarma }, getUserBusinesses(userId))
        : `Sisa tagihan Rp${(newDebt / 1_000_000).toFixed(1)} Jt di /jalan-pintas`;

      stmt(
        "UPDATE users SET balance = balance - ?, pinjol_debt = ?, is_seized = ?, karma = ?, badge = ?, active_quest = ? WHERE id = ?",
      ).run(actualPay, newDebt, sealLifted ? 0 : 1, newKarma, newBadge, nextQuest, userId);

      recordTransaction(
        userId,
        "REPAY_PINJOL",
        -actualPay,
        sealLifted ? "Pelunasan penuh tagihan & pembukaan segel lapak" : "Cicilan tagihan talangan",
      );
    })
    .immediate();

  return {
    ok: true,
    paidRp: actualPay,
    remainingDebt: newDebt,
    sealLifted,
    message: sealLifted
      ? `🎉 **SEGEL LAPAK RESMI DIBUKA!** Kamu melunasi **Rp${(actualPay / 1_000_000).toFixed(2)} Juta** hingga tuntas!`
      : `💸 **Cicilan Diterima!** Terbayar **Rp${(actualPay / 1_000_000).toFixed(2)} Juta** (Sisa: **Rp${(newDebt / 1_000_000).toFixed(2)} Juta**).`,
    user: getOrCreateUser(userId, username),
  };
}
