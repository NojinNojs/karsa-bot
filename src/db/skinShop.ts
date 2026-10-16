import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";
import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { getOrCreateUser } from "./users.ts";

export function equipOrBuySkin(userId: string, username: string, skinId: SkinId, payWith: "rp" | "gems" = "rp") {
  const user = getOrCreateUser(userId, username);
  const skin = SKIN_PALETTES[skinId];
  if (!skin) return { ok: false, bought: false, message: "Tema kartu tidak ditemukan.", user };

  const owned: string[] = JSON.parse(user.owned_skins || '["retro_gold"]');
  if (owned.includes(skinId)) {
    stmt("UPDATE users SET skin_id = ? WHERE id = ?").run(skinId, userId);
    return {
      ok: true,
      bought: false,
      message: `Skin **${skin.name}** berhasil dipasang ke Kartu Catatan Usaha kamu!`,
      user: getOrCreateUser(userId, username),
    };
  }

  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return {
      ok: false,
      bought: false,
      message: "🚨 **Lapak Sedang Disegel!** Lunasi tunggakan terlebih dahulu sebelum membeli tema kartu baru.",
      user,
    };
  }

  if (payWith === "gems") {
    if (user.gems < skin.priceGems) {
      return {
        ok: false,
        bought: false,
        message: `Permata 💎 belum cukup untuk membeli **${skin.name}** (Harga: **${skin.priceGems} 💎**, Permatamu: **${user.gems} 💎**).`,
        user,
      };
    }
    sqlite
      .transaction(() => {
        owned.push(skinId);
        stmt("UPDATE users SET gems = gems - ?, skin_id = ?, owned_skins = ? WHERE id = ?").run(
          skin.priceGems,
          skinId,
          JSON.stringify(owned),
          userId,
        );
        recordTransaction(userId, "BUY_SKIN_GEMS", 0, `Beli & pasang skin ${skin.name} (${skin.priceGems} Gems)`);
      })
      .immediate();
    return {
      ok: true,
      bought: true,
      message: `Selamat! Kamu membeli & memasang skin **${skin.name}** dengan **${skin.priceGems} 💎**!`,
      user: getOrCreateUser(userId, username),
    };
  }

  if (user.balance < skin.priceRp) {
    return {
      ok: false,
      bought: false,
      message: `Kas belum cukup untuk membeli **${skin.name}** (Harga: **Rp ${(skin.priceRp / 1_000_000).toFixed(1).replace(".", ",")}Jt**).`,
      user,
    };
  }

  sqlite
    .transaction(() => {
      owned.push(skinId);
      stmt("UPDATE users SET balance = balance - ?, skin_id = ?, owned_skins = ? WHERE id = ?").run(
        skin.priceRp,
        skinId,
        JSON.stringify(owned),
        userId,
      );
      recordTransaction(userId, "BUY_SKIN", -skin.priceRp, `Beli & pasang skin ${skin.name}`);
    })
    .immediate();

  return {
    ok: true,
    bought: true,
    message: `Selamat! Kamu berhasil membeli & memasang skin **${skin.name}**!`,
    user: getOrCreateUser(userId, username),
  };
}
