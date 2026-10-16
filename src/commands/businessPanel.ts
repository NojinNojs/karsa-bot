import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { getOrCreateServerCoop, PASSIVE_COOLDOWN_MS, type UserBusinessRow, type UserRow } from "../db/index.ts";
import { BUSINESS_CATALOG, formatRpShort, getCurrentMarketEvent } from "../game/mechanics.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildCooldownTag } from "./dashboardRows.ts";

export type BizType = "kedai_kopi" | "brankas_darurat" | "saham_koperasi";

export function upgradePricing(user: UserRow, businesses: UserBusinessRow[], bizType: BizType) {
  const cat = BUSINESS_CATALOG[bizType]!;
  const existing = businesses.find((b) => b.biz_type === bizType);
  const currentLevel = existing?.level ?? 0;
  const nextLevel = currentLevel + 1;
  const rawCost = Math.round(cat.baseCost * 1.35 ** Math.max(0, nextLevel - 1));
  const cost = user.karma >= 80 ? Math.round(rawCost * 0.85) : rawCost;
  const yieldBoost = currentLevel === 0 ? cat.baseYield : Math.round(cat.baseYield * 0.45);
  return { currentLevel, nextLevel, cost, yieldBoost };
}

export function buildBusinessPanelPayload(
  user: UserRow,
  businesses: UserBusinessRow[],
  headline?: string,
  guildId = "global_kota_mandiri",
) {
  const now = Date.now();
  const isSeized = user.is_seized === 1 || user.pinjol_debt > 0;
  const kedaiLvl = businesses.find((b) => b.biz_type === "kedai_kopi")?.level ?? 1;
  const gross = businesses.reduce((a, b) => a + (b.level > 0 ? b.daily_yield : 0), 0);
  const { event } = getCurrentMarketEvent();
  const coop = getOrCreateServerCoop(guildId);
  const marketLvlBonus = 1 + Math.max(0, coop.eco_level - 1) * 0.05;
  const taxRate = user.karma >= 80 ? 0.05 : 0.2;
  const netPreview = Math.round(gross * event.passiveMultiplier * marketLvlBonus * (1 - taxRate));
  const claimReady = !isSeized && gross > 0 && (!user.last_passive_at || now >= user.last_passive_at + PASSIVE_COOLDOWN_MS);
  const claimLabel = claimReady
    ? `💰 Ambil Omzet (+${formatRpShort(netPreview)})`
    : `⏳ Omzet ${buildCooldownTag(user.last_passive_at, PASSIVE_COOLDOWN_MS, "Siap")}`;

  const upKedai = upgradePricing(user, businesses, "kedai_kopi");
  const upEmas = upgradePricing(user, businesses, "brankas_darurat");
  const upSaham = upgradePricing(user, businesses, "saham_koperasi");

  const canKedai = !isSeized && user.balance >= upKedai.cost;
  const emasUnlocked = kedaiLvl >= 2;
  const canEmas = !isSeized && emasUnlocked && user.balance >= upEmas.cost;
  const sahamUnlocked = kedaiLvl >= 3 && user.karma >= 65;
  const canSaham = !isSeized && sahamUnlocked && user.balance >= upSaham.cost;

  const emasStatus = upEmas.currentLevel > 0 ? `Lv.${upEmas.currentLevel}` : emasUnlocked ? "✨ Siap Dibuka!" : "🔒 Terkunci";
  const sahamStatus = upSaham.currentLevel > 0 ? `Lv.${upSaham.currentLevel}` : sahamUnlocked ? "✨ Siap Dibuka!" : "🔒 Terkunci";

  const embed = new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle(`🏪 Kelola Usaha • Kas ${formatRpShort(user.balance)}`)
    .setDescription(
      (headline ? `${headline}\n\n` : "") +
        `☕ **Kedai Kopi Lv.${kedaiLvl}** → Naik ke Lv.${upKedai.nextLevel}: **${formatRpShort(upKedai.cost)}**\n` +
        `🛡️ **Tabungan Emas (${emasStatus})** → ${emasUnlocked ? `${upEmas.currentLevel === 0 ? "Buka" : "Naik ke"} Lv.${upEmas.nextLevel}: **${formatRpShort(upEmas.cost)}**` : "🔒 Butuh **Kedai Lv.2**"}\n` +
        `🤝 **Koperasi Warga (${sahamStatus})** → ${sahamUnlocked ? `${upSaham.currentLevel === 0 ? "Buka" : "Naik ke"} Lv.${upSaham.nextLevel}: **${formatRpShort(upSaham.cost)}**` : "🔒 Butuh **Kedai Lv.3 + Nama Baik 65**"}`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_BISNIS_CLAIM)
      .setLabel(claimLabel)
      .setStyle(claimReady ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!claimReady),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_BISNIS_KEDAI)
      .setLabel(`☕ Kedai Lv.${upKedai.nextLevel} — ${formatRpShort(upKedai.cost)}`)
      .setStyle(canKedai ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!canKedai),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_BISNIS_BRANKAS)
      .setLabel(
        !emasUnlocked
          ? "🔒 Emas (Butuh Kedai Lv.2)"
          : `🛡️ ${upEmas.currentLevel === 0 ? "Buka Emas" : `Emas Lv.${upEmas.nextLevel}`} — ${formatRpShort(upEmas.cost)}`,
      )
      .setStyle(canEmas ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canEmas),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_BISNIS_SAHAM)
      .setLabel(
        !sahamUnlocked
          ? "🔒 Saham (Butuh Kedai Lv.3)"
          : `🤝 ${upSaham.currentLevel === 0 ? "Buka Saham" : `Saham Lv.${upSaham.nextLevel}`} — ${formatRpShort(upSaham.cost)}`,
      )
      .setStyle(canSaham ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canSaham),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH).setLabel("🪪 Kartu Usaha").setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row] };
}
