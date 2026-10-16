import { recordTransaction, sqlite } from "./connection.ts";
import {
  COOP_PATUNGAN_COST_RP,
  COOP_RESCUE_COST_RP,
  type LeaderboardEntry,
  type ServerCoopContributor,
  type UserRow,
} from "./types.ts";
import {
  computeProgressionQuest,
  getOrCreateServerCoop,
  getOrCreateUser,
  getUserBusinesses,
} from "./users.ts";

export function takeShortcutGambleOrPinjol(
  userId: string,
  username: string,
  mode: "pinjol" | "slot",
  guildId = "global_kota_mandiri",
) {
  const user = getOrCreateUser(userId, username);

  let cashLost = 0;
  let newDebtAdded = 0;
  let assetSeizedName = "Mesin Kopi Kedai";
  let assetSeizedValue = 1_500_000;
  let narrative = "";

  const tx = sqlite.transaction(() => {
    if (mode === "pinjol") {
      const loanPrincipal = 1_500_000;
      const illegalFeeAndInterest = 1_500_000;
      newDebtAdded = loanPrincipal + illegalFeeAndInterest;
      cashLost = Math.min(user.balance, 1_000_000);
      assetSeizedName = "Mesin Kopi Kedai";
      assetSeizedValue = 1_500_000;
      narrative =
        "Dana talangan kilat jatuh tempo! Bunga berbunga 8%/hari menguras laci kas dan penagih menyegel mesin kopi warungmu.";
    } else {
      cashLost = Math.min(user.balance, Math.max(250_000, Math.round(user.balance * 0.65)));
      newDebtAdded = 2_000_000;
      assetSeizedName = "Gerobak & Stok Biji";
      assetSeizedValue = Math.max(500_000, cashLost);
      narrative =
        "Modal belanja bahan baku habis di meja putaran malam! Warung gagal buka pagi ini dan gerobak disita penagih.";
    }

    const updatedBalance = Math.max(0, user.balance - cashLost);
    const updatedKarma = Math.max(10, user.karma - 25);
    const updatedDebt = user.pinjol_debt + newDebtAdded;
    const isSeized = updatedDebt >= 2_000_000 ? 1 : 0;

    // Degrade Kedai Kopi by 1 level (min 1) on seizure, while emergency_fund remains 100% untouched!
    if (isSeized === 1) {
      sqlite
        .query(
          "UPDATE user_businesses SET level = MAX(1, level - 1), value = MAX(1500000, value - 500000) WHERE user_id = ? AND biz_type = 'kedai_kopi'",
        )
        .run(userId);
    }

    sqlite
      .query(
        "UPDATE users SET balance = ?, karma = ?, pinjol_debt = ?, pinjol_strikes = pinjol_strikes + 1, is_seized = ?, badge = 'LAPAK DISEGEL', active_quest = 'Seduh kopi lalu klik Bayar Segel di bawah' WHERE id = ?",
      )
      .run(updatedBalance, updatedKarma, updatedDebt, isSeized, userId);

    sqlite
      .query("UPDATE server_coop SET eco_health = MAX(20, eco_health - 5) WHERE guild_id = ?")
      .run(guildId);

    recordTransaction(userId, mode === "pinjol" ? "SEGEL_TAGIHAN" : "KAS_LUDES", -cashLost, narrative);
  });
  tx.immediate();

  const updatedUser = getOrCreateUser(userId, username);
  return {
    mode,
    user: updatedUser,
    cashLost,
    newDebtAdded,
    totalDebt: updatedUser.pinjol_debt,
    assetSeizedName,
    assetSeizedValue,
    narrative,
  };
}

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

  const totalLiquid = user.balance;
  if (totalLiquid <= 0) {
    return {
      ok: false,
      paidRp: 0,
      remainingDebt: user.pinjol_debt,
      sealLifted: false,
      message:
        "⚠️ **Laci Kas Kosong!** Klik **☕ Seduh Cari Uang** atau **☀️ Uang Harian** terlebih dahulu untuk mengumpulkan uang cicilan (Tabungan Emas tetap aman & tidak ikut terpakai).",
      user,
    };
  }

  const targetPay = customAmount ? Math.min(customAmount, user.pinjol_debt) : user.pinjol_debt;
  const actualPay = Math.min(totalLiquid, targetPay);
  const fromCash = actualPay;
  const fromEmergency = 0;
  const newDebt = Math.max(0, user.pinjol_debt - actualPay);
  const sealLifted = newDebt === 0;

  const tx = sqlite.transaction(() => {
    const newBadge = sealLifted ? "BANGKIT LAGI" : "LAPAK DISEGEL";
    const newKarma = sealLifted ? Math.min(100, user.karma + 15) : Math.min(100, user.karma + 5);
    const bizzes = getUserBusinesses(userId);
    const nextQuest = sealLifted
      ? computeProgressionQuest({ ...user, pinjol_debt: 0, is_seized: 0, karma: newKarma }, bizzes)
      : `Sisa tagihan Rp${(newDebt / 1_000_000).toFixed(1)} Jt di /jalan-pintas`;

    sqlite
      .query(
        "UPDATE users SET balance = balance - ?, emergency_fund = emergency_fund - ?, pinjol_debt = ?, is_seized = ?, karma = ?, badge = ?, active_quest = ? WHERE id = ?",
      )
      .run(fromCash, fromEmergency, newDebt, sealLifted ? 0 : 1, newKarma, newBadge, nextQuest, userId);

    recordTransaction(
      userId,
      "REPAY_PINJOL",
      -actualPay,
      sealLifted ? "Pelunasan penuh tagihan & pembukaan segel lapak" : "Cicilan tagihan talangan",
    );
  });
  tx.immediate();

  const updated = getOrCreateUser(userId, username);
  return {
    ok: true,
    paidRp: actualPay,
    remainingDebt: newDebt,
    sealLifted,
    message: sealLifted
      ? `🎉 **SEGEL LAPAK RESMI DIBUKA!** Kamu melunasi **Rp${(actualPay / 1_000_000).toFixed(2)} Juta** hingga tuntas. Gerobak dan Kedai Kopi kembali beroperasi penuh!`
      : `💸 **Cicilan Tagihan Diterima!** Terbayar **Rp${(actualPay / 1_000_000).toFixed(2)} Juta** (Sisa tagihan: **Rp${(newDebt / 1_000_000).toFixed(2)} Juta**). Terus seduh kopi di \`/work\` sampai segel terbuka!`,
    user: updated,
  };
}

export function investOrRescueCoop(
  userId: string,
  username: string,
  action: "patungan" | "rescue",
  guildId = "global_kota_mandiri",
  targetUserId?: string,
) {
  const user = getOrCreateUser(userId, username);
  const coop = getOrCreateServerCoop(guildId);
  const amount = action === "patungan" ? COOP_PATUNGAN_COST_RP : COOP_RESCUE_COST_RP;

  if (action === "patungan") {
    if (user.level < 2 && user.balance < amount) {
      return {
        ok: false,
        amount: 0,
        rescuedUsername: null as string | null,
        message:
          "🔒 **Syarat Belum Terpenuhi!** Capai **Level 2** terlebih dahulu dengan menyeduh kopi di `/work` sebelum menyetor patungan Koperasi Pasar.",
        user,
        coop,
      };
    }
    if (user.pinjol_debt > 0 || user.is_seized === 1) {
      return {
        ok: false,
        amount: 0,
        rescuedUsername: null as string | null,
        message:
          "🔒 **Tunggakan Aktif!** Lunasi tagihan talanganmu terlebih dahulu sebelum menyetor modal ke Koperasi Pasar.",
        user,
        coop,
      };
    }
  }

  if (user.balance < amount) {
    return {
      ok: false,
      amount: 0,
      rescuedUsername: null as string | null,
      message: `Kas belum cukup untuk aksi koperasi ini (Butuh **Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")}Jt**, Kasmu: **Rp ${(user.balance / 1_000_000).toFixed(1).replace(".", ",")}Jt**).`,
      user,
      coop,
    };
  }

  // Pre-locate target indebted player for rescue before deducting any cash!
  let targetRow: UserRow | null = null;
  if (action === "rescue") {
    if (targetUserId) {
      targetRow = sqlite
        .query("SELECT * FROM users WHERE id = ? AND (is_seized = 1 OR pinjol_debt > 0)")
        .get(targetUserId) as UserRow | null;
      if (!targetRow) {
        return {
          ok: false,
          amount: 0,
          rescuedUsername: null as string | null,
          message: "✅ **Lapak warga tersebut sudah bebas segel / lunas!** Uangmu tidak dipotong.",
          user,
          coop,
        };
      }
    } else {
      targetRow = sqlite
        .query(
          "SELECT * FROM users WHERE (is_seized = 1 OR pinjol_debt > 0) AND id != ? ORDER BY pinjol_debt DESC LIMIT 1",
        )
        .get(userId) as UserRow | null;
      if (!targetRow && (user.is_seized === 1 || user.pinjol_debt > 0)) {
        targetRow = user;
      }
      if (!targetRow) {
        return {
          ok: false,
          amount: 0,
          rescuedUsername: null as string | null,
          message:
            "✅ **Seluruh Lapak Warga Sedang Aman!** Saat ini tidak ada pedagang yang disegel di pasar.",
          user,
          coop,
        };
      }
    }
  }

  let rescuedUsername: string | null = null;

  const tx = sqlite.transaction(() => {
    const contributors: ServerCoopContributor[] = [...(coop.contributors || [])];
    const existingContrib = contributors.find(
      (c) => c.userId === userId || c.name.toUpperCase() === username.toUpperCase(),
    );

    if (action === "patungan") {
      if (existingContrib) {
        existingContrib.totalRp += amount;
        existingContrib.role = existingContrib.totalRp >= 4_500_000 ? "PENDIRI KOPERASI" : "MITRA AKTIF";
      } else {
        contributors.push({
          userId,
          name: username,
          role: "MITRA AKTIF",
          totalRp: amount,
          warungSaved: 0,
        });
      }

      const newBal = user.balance - amount;
      const newKarma = Math.min(100, user.karma + 8);
      const bizzes = getUserBusinesses(userId);
      const nextQuest = computeProgressionQuest({ ...user, balance: newBal, karma: newKarma }, bizzes);

      sqlite
        .query(
          "UPDATE users SET balance = ?, coop_shares = coop_shares + ?, karma = ?, active_quest = ? WHERE id = ?",
        )
        .run(newBal, amount, newKarma, nextQuest, userId);
      sqlite
        .query(
          "UPDATE server_coop SET pool_balance = pool_balance + ?, eco_level = MIN(5, 1 + CAST((pool_balance + ?) / 3000000 AS INTEGER)), eco_health = MIN(100, eco_health + 6), contributors_json = ? WHERE guild_id = ?",
        )
        .run(amount, amount, JSON.stringify(contributors), guildId);
      // Only boost saham_koperasi if already unlocked (level >= 1); do NOT bypass Kedai Lv.3 prerequisite gate!
      sqlite
        .query(
          "UPDATE user_businesses SET value = value + ?, daily_yield = daily_yield + 250000 WHERE user_id = ? AND biz_type = 'saham_koperasi' AND level >= 1",
        )
        .run(amount, userId);
      recordTransaction(userId, "COOP_INVEST", -amount, "Iuran Koperasi Warga");
    } else {
      if (targetRow) {
        rescuedUsername = targetRow.username;
        const targetBizzes = getUserBusinesses(targetRow.id);
        const restoredQuest = computeProgressionQuest(
          { ...targetRow, pinjol_debt: 0, is_seized: 0, karma: Math.min(100, targetRow.karma + 15) },
          targetBizzes,
        );
        sqlite
          .query(
            "UPDATE users SET pinjol_debt = 0, is_seized = 0, karma = MIN(100, karma + 15), badge = 'BANGKIT LAGI', active_quest = ? WHERE id = ?",
          )
          .run(restoredQuest, targetRow.id);
      }

      if (existingContrib) {
        existingContrib.totalRp += amount;
        existingContrib.warungSaved += 1;
        existingContrib.role = "PENEBUS WARGA";
      } else {
        contributors.push({
          userId,
          name: username,
          role: "PENEBUS WARGA",
          totalRp: amount,
          warungSaved: 1,
        });
      }

      sqlite
        .query(
          "UPDATE users SET balance = balance - ?, karma = MIN(100, karma + 25), gems = gems + 2, badge = 'WARUNG JUJUR' WHERE id = ?",
        )
        .run(amount, userId);
      sqlite
        .query(
          "UPDATE server_coop SET pool_balance = pool_balance + ?, eco_level = MIN(5, 1 + CAST((pool_balance + ?) / 3000000 AS INTEGER)), rescued_count = rescued_count + 1, eco_health = MIN(100, eco_health + 10), contributors_json = ? WHERE guild_id = ?",
        )
        .run(amount, amount, JSON.stringify(contributors), guildId);
      recordTransaction(
        userId,
        "COOP_RESCUE",
        -amount,
        rescuedUsername ? `Tebus segel lapak @${rescuedUsername}` : "Dana talangan darurat Koperasi Warga",
      );
    }
  });
  tx.immediate();

  return {
    ok: true,
    amount,
    rescuedUsername,
    user: getOrCreateUser(userId, username),
    coop: getOrCreateServerCoop(guildId),
  };
}

export function getTopLeaderboard(limit = 5): LeaderboardEntry[] {
  const safeLimit = Math.max(1, limit);
  const rows = sqlite
    .query(
      `SELECT
         u.id AS userId,
         u.username AS username,
         u.badge AS badge,
         u.level AS level,
         u.karma AS karma,
         u.balance AS balance,
         COALESCE(SUM(b.value), 0) AS businessValue,
         MAX(0, u.balance + COALESCE(SUM(b.value), 0) - u.pinjol_debt) AS netWorth
       FROM users u
       LEFT JOIN user_businesses b ON u.id = b.user_id
       GROUP BY u.id
       ORDER BY MAX(0, u.balance + COALESCE(SUM(b.value), 0) - u.pinjol_debt) DESC, u.karma DESC
       LIMIT ?`,
    )
    .all(safeLimit) as Array<Omit<LeaderboardEntry, "rank">>;

  return rows.map((entry, idx) => ({
    rank: idx + 1,
    ...entry,
  }));
}
