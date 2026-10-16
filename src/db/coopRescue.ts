import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { computeProgressionQuest } from "./quests.ts";
import type { ServerCoopContributor, ServerCoopRow, UserRow } from "./types.ts";
import { getOrCreateServerCoop, getOrCreateUser, getUserBusinesses } from "./users.ts";

export function executeCoopRescue(user: UserRow, coop: ServerCoopRow, amount: number, guildId: string, targetUserId?: string) {
  let targetRow: UserRow | null = null;
  if (targetUserId) {
    targetRow = stmt("SELECT * FROM users WHERE id = ? AND (is_seized = 1 OR pinjol_debt > 0)").get(targetUserId) as UserRow | null;
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
    targetRow = stmt("SELECT * FROM users WHERE (is_seized = 1 OR pinjol_debt > 0) AND id != ? ORDER BY pinjol_debt DESC LIMIT 1").get(
      user.id,
    ) as UserRow | null;
    if (!targetRow && (user.is_seized === 1 || user.pinjol_debt > 0)) {
      targetRow = user;
    }
    if (!targetRow) {
      return {
        ok: false,
        amount: 0,
        rescuedUsername: null as string | null,
        message: "✅ **Seluruh Lapak Warga Sedang Aman!** Saat ini tidak ada pedagang yang disegel di pasar.",
        user,
        coop,
      };
    }
  }

  const rescuedUsername = targetRow.username;
  sqlite
    .transaction(() => {
      const contributors: ServerCoopContributor[] = [...(coop.contributors || [])];
      const existing = contributors.find((c) => c.userId === user.id || c.name.toUpperCase() === user.username.toUpperCase());
      const restoredQuest = computeProgressionQuest(
        { ...targetRow!, pinjol_debt: 0, is_seized: 0, karma: Math.min(100, targetRow!.karma + 15) },
        getUserBusinesses(targetRow!.id),
      );
      stmt(
        "UPDATE users SET pinjol_debt = 0, is_seized = 0, karma = MIN(100, karma + 15), badge = 'BANGKIT LAGI', active_quest = ? WHERE id = ?",
      ).run(restoredQuest, targetRow!.id);

      if (existing) {
        existing.totalRp += amount;
        existing.warungSaved += 1;
        existing.role = "PENEBUS WARGA";
      } else {
        contributors.push({
          userId: user.id,
          name: user.username,
          role: "PENEBUS WARGA",
          totalRp: amount,
          warungSaved: 1,
        });
      }

      stmt(
        "UPDATE users SET balance = balance - ?, karma = MIN(100, karma + 25), gems = gems + 2, badge = 'WARUNG JUJUR' WHERE id = ?",
      ).run(amount, user.id);
      stmt(
        "UPDATE server_coop SET pool_balance = pool_balance + ?, eco_level = MIN(5, 1 + CAST((pool_balance + ?) / 3000000 AS INTEGER)), rescued_count = rescued_count + 1, eco_health = MIN(100, eco_health + 10), contributors_json = ? WHERE guild_id = ?",
      ).run(amount, amount, JSON.stringify(contributors), guildId);
      recordTransaction(user.id, "COOP_RESCUE", -amount, `Tebus segel lapak @${rescuedUsername}`);
    })
    .immediate();

  return {
    ok: true,
    amount,
    rescuedUsername,
    message: "Berhasil!",
    user: getOrCreateUser(user.id, user.username),
    coop: getOrCreateServerCoop(guildId),
  };
}
