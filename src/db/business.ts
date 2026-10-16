import { BUSINESS_CATALOG, getCurrentMarketEvent } from "../game/mechanics.ts";
import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";
import { recordTransaction, sqlite } from "./connection.ts";
import { PASSIVE_COOLDOWN_MS, type UserRow } from "./types.ts";
import {
  computeProgressionQuest,
  formatCooldown,
  getOrCreateServerCoop,
  getOrCreateUser,
  getUserBusinesses,
} from "./users.ts";

export function buyOrUpgradeBusiness(
  userId: string,
  username: string,
  bizType: "kedai_kopi" | "brankas_darurat" | "saham_koperasi",
) {
  const user = getOrCreateUser(userId, username);
  const cat = BUSINESS_CATALOG[bizType]!;
  const allBizzes = getUserBusinesses(userId);
  const kedai = allBizzes.find((b) => b.biz_type === "kedai_kopi");
  const existing = allBizzes.find((b) => b.biz_type === bizType) ?? null;

  // Gate 1: Seizure Lock
  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return {
      ok: false,
      reason:
        "🚨 **Lapak Sedang Disegel / Memiliki Tunggakan!** Lunasi tagihan talangan terlebih dahulu di `/jalan-pintas` sebelum melakukan ekspansi usaha.",
      user,
    };
  }

  // Gate 2: Prerequisite Kedai Kopi Level
  const kedaiLvl = kedai?.level ?? 1;
  if (kedaiLvl < cat.requiredKedaiLevel) {
    return {
      ok: false,
      reason: `🔒 **Syarat Belum Terpenuhi!** Naikin **Kedai Kopi ke Lv.${cat.requiredKedaiLevel}** terlebih dahulu sebelum membuka/menaikkan **${cat.name}** (Saat ini: Kedai Lv.${kedaiLvl}).`,
      user,
    };
  }

  // Gate 3: Prerequisite Karma / Nama Baik
  if (user.karma < cat.requiredKarma) {
    return {
      ok: false,
      reason: `🔒 **Syarat Nama Baik Belum Cukup!** Butuh **Nama Baik minimal ${cat.requiredKarma}/100** untuk membuka **${cat.name}** (Saat ini: ${user.karma}/100).`,
      user,
    };
  }

  const currentLevel = existing?.level ?? 0;
  const nextLevel = currentLevel + 1;
  const rawCost = Math.round(cat.baseCost * 1.35 ** Math.max(0, nextLevel - 1));
  // Karma >= 80 grants 15% expansion discount
  const upgradeCost = user.karma >= 80 ? Math.round(rawCost * 0.85) : rawCost;
  const yieldBoost = currentLevel === 0 ? cat.baseYield : Math.round(cat.baseYield * 0.45);

  if (user.balance < upgradeCost) {
    const costLabel =
      upgradeCost >= 1_000_000
        ? `Rp${(upgradeCost / 1_000_000).toFixed(2)} Juta`
        : `Rp${Math.round(upgradeCost / 1_000).toLocaleString("id-ID")} Rb`;
    const balLabel =
      user.balance >= 1_000_000
        ? `Rp${(user.balance / 1_000_000).toFixed(2)} Juta`
        : `Rp${Math.round(user.balance / 1_000).toLocaleString("id-ID")} Rb`;
    return {
      ok: false,
      reason: `Kas belum cukup untuk **${cat.name} Lv.${nextLevel}**! Butuh **${costLabel}**, kas kamu saat ini **${balLabel}**.`,
      user,
    };
  }

  const tx = sqlite.transaction(() => {
    const emergencyAdd = bizType === "brankas_darurat" ? upgradeCost : 0;
    sqlite
      .query(
        "UPDATE users SET balance = balance - ?, emergency_fund = emergency_fund + ?, karma = MIN(100, karma + 3) WHERE id = ?",
      )
      .run(upgradeCost, emergencyAdd, userId);

    if (existing) {
      sqlite
        .query(
          "UPDATE user_businesses SET level = ?, name = ?, value = value + ?, daily_yield = daily_yield + ? WHERE id = ?",
        )
        .run(nextLevel, cat.name, upgradeCost, yieldBoost, existing.id);
    } else {
      sqlite
        .query(
          "INSERT INTO user_businesses (user_id, biz_type, name, level, value, daily_yield, ethical_mode) VALUES (?, ?, ?, ?, ?, ?, 1)",
        )
        .run(userId, bizType, cat.name, nextLevel, upgradeCost, yieldBoost);
    }

    const updatedBizzes = getUserBusinesses(userId);
    const updatedUser = sqlite.query("SELECT * FROM users WHERE id = ?").get(userId) as UserRow;
    const nextQuest = computeProgressionQuest(updatedUser, updatedBizzes);
    sqlite.query("UPDATE users SET active_quest = ? WHERE id = ?").run(nextQuest, userId);

    recordTransaction(userId, "BIZ_UPGRADE", -upgradeCost, `Ekspansi ${cat.name} ke Lv.${nextLevel}`);
  });
  tx.immediate();

  return {
    ok: true,
    nextLevel,
    upgradeCost,
    yieldBoost,
    user: getOrCreateUser(userId, username),
  };
}

export function claimPassiveIncome(
  userId: string,
  username: string,
  opts?: { enforceCooldown?: boolean; guildId?: string },
) {
  const user = getOrCreateUser(userId, username);
  const now = Date.now();

  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return {
      ok: false,
      reason:
        "🚨 **Lapak Sedang Disegel / Memiliki Tunggakan!** Omzet usaha tertahan sampai tunggakan dilunasi.",
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

  const tx = sqlite.transaction(() => {
    const newBal = user.balance + net;
    const nextQuest = computeProgressionQuest({ ...user, balance: newBal }, bizzes);
    sqlite
      .query("UPDATE users SET balance = ?, last_passive_at = ?, active_quest = ? WHERE id = ?")
      .run(newBal, now, nextQuest, userId);
    recordTransaction(
      userId,
      "PASSIVE_CLAIM",
      net,
      `Setoran usaha harian (Potongan sewa ${Math.round(taxRate * 100)}%)`,
    );
  });
  tx.immediate();

  return {
    ok: true,
    gross,
    net,
    taxSaved: user.karma >= 80,
    user: getOrCreateUser(userId, username),
  };
}

export function equipOrBuySkin(
  userId: string,
  username: string,
  skinId: SkinId,
  payWith: "rp" | "gems" = "rp",
) {
  const user = getOrCreateUser(userId, username);
  const skin = SKIN_PALETTES[skinId];
  if (!skin) {
    return { ok: false, bought: false, message: "Tema kartu tidak ditemukan.", user };
  }

  const owned: string[] = JSON.parse(user.owned_skins || '["retro_gold"]');

  if (owned.includes(skinId)) {
    sqlite.query("UPDATE users SET skin_id = ? WHERE id = ?").run(skinId, userId);
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
      message:
        "🚨 **Lapak Sedang Disegel!** Lunasi tunggakan terlebih dahulu sebelum membeli tema kartu baru.",
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
    const tx = sqlite.transaction(() => {
      owned.push(skinId);
      sqlite
        .query("UPDATE users SET gems = gems - ?, skin_id = ?, owned_skins = ? WHERE id = ?")
        .run(skin.priceGems, skinId, JSON.stringify(owned), userId);
      recordTransaction(
        userId,
        "BUY_SKIN_GEMS",
        0,
        `Beli & pasang skin ${skin.name} (${skin.priceGems} Gems)`,
      );
    });
    tx.immediate();
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
      message: `Kas belum cukup untuk membeli **${skin.name}** (Harga: **Rp ${(skin.priceRp / 1_000_000).toFixed(1).replace(".", ",")}Jt**, Kasmu: **Rp ${(user.balance / 1_000_000).toFixed(1).replace(".", ",")}Jt**).`,
      user,
    };
  }

  const tx = sqlite.transaction(() => {
    owned.push(skinId);
    sqlite
      .query("UPDATE users SET balance = balance - ?, skin_id = ?, owned_skins = ? WHERE id = ?")
      .run(skin.priceRp, skinId, JSON.stringify(owned), userId);
    recordTransaction(userId, "BUY_SKIN", -skin.priceRp, `Beli & pasang skin ${skin.name}`);
  });
  tx.immediate();

  return {
    ok: true,
    bought: true,
    message: `Selamat! Kamu berhasil membeli & memasang skin **${skin.name}**!`,
    user: getOrCreateUser(userId, username),
  };
}
