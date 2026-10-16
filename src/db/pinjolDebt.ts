import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { getOrCreateUser } from "./users.ts";

export function takeShortcutGambleOrPinjol(userId: string, username: string, mode: "pinjol" | "slot", guildId = "global_kota_mandiri") {
  const user = getOrCreateUser(userId, username);
  let cashLost = 0;
  let newDebtAdded = 0;
  let assetSeizedName = "Mesin Kopi Kedai";
  let assetSeizedValue = 1_500_000;
  let narrative = "";

  sqlite
    .transaction(() => {
      if (mode === "pinjol") {
        newDebtAdded = 3_000_000;
        cashLost = Math.min(user.balance, 1_000_000);
        assetSeizedName = "Mesin Kopi Kedai";
        assetSeizedValue = 1_500_000;
        narrative = "Dana talangan kilat jatuh tempo! Bunga berbunga 8%/hari menguras laci kas dan penagih menyegel mesin kopi warungmu.";
      } else {
        cashLost = Math.min(user.balance, Math.max(250_000, Math.round(user.balance * 0.65)));
        newDebtAdded = 2_000_000;
        assetSeizedName = "Gerobak & Stok Biji";
        assetSeizedValue = Math.max(500_000, cashLost);
        narrative = "Modal belanja bahan baku habis di meja putaran malam! Warung gagal buka pagi ini dan gerobak disita penagih.";
      }

      const updatedBalance = Math.max(0, user.balance - cashLost);
      const updatedKarma = Math.max(10, user.karma - 25);
      const updatedDebt = user.pinjol_debt + newDebtAdded;
      const isSeized = updatedDebt >= 2_000_000 ? 1 : 0;

      if (isSeized === 1) {
        stmt(
          "UPDATE user_businesses SET level = MAX(1, level - 1), value = MAX(1500000, value - 500000) WHERE user_id = ? AND biz_type = 'kedai_kopi'",
        ).run(userId);
      }

      stmt(
        "UPDATE users SET balance = ?, karma = ?, pinjol_debt = ?, pinjol_strikes = pinjol_strikes + 1, is_seized = ?, badge = 'LAPAK DISEGEL', active_quest = 'Seduh kopi lalu klik Bayar Segel di bawah' WHERE id = ?",
      ).run(updatedBalance, updatedKarma, updatedDebt, isSeized, userId);

      stmt("UPDATE server_coop SET eco_health = MAX(20, eco_health - 5) WHERE guild_id = ?").run(guildId);
      recordTransaction(userId, mode === "pinjol" ? "SEGEL_TAGIHAN" : "KAS_LUDES", -cashLost, narrative);
    })
    .immediate();

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
