import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
} from "discord.js";
import {
  DAILY_COOLDOWN_MS,
  getOrCreateServerCoop,
  getOrCreateUser,
  getUserBusinesses,
  PASSIVE_COOLDOWN_MS,
  type ServerCoopRow,
  type UserBusinessRow,
  type UserRow,
  WORK_COOLDOWN_MS,
} from "../db/index.ts";
import {
  BUSINESS_CATALOG,
  formatRpShort,
  getCurrentMarketEvent,
  getRankForLevel,
  WORK_DILEMMAS,
} from "../game/mechanics.ts";
import { renderPortfolioCard } from "../renderer/pixelCard.ts";
import { CUSTOM_IDS } from "./definitions.ts";

export function buildCooldownTag(lastAtMs: number, cooldownMs: number, readyLabel = "✅ Siap"): string {
  if (!lastAtMs || lastAtMs <= 0) return readyLabel;
  const readyAtMs = lastAtMs + cooldownMs;
  if (Date.now() >= readyAtMs) return readyLabel;
  return `Siap <t:${Math.ceil(readyAtMs / 1000)}:R>`;
}

export type BizType = "kedai_kopi" | "brankas_darurat" | "saham_koperasi";

export function upgradePricing(user: UserRow, businesses: UserBusinessRow[], bizType: BizType) {
  const cat = BUSINESS_CATALOG[bizType]!;
  const existing = businesses.find((b) => b.biz_type === bizType);
  const currentLevel = existing?.level ?? 0;
  const nextLevel = currentLevel + 1;
  const rawCost = Math.round(cat.baseCost * 1.35 ** Math.max(0, nextLevel - 1));
  return {
    currentLevel,
    nextLevel,
    cost: user.karma >= 80 ? Math.round(rawCost * 0.85) : rawCost,
  };
}

export function buildOnboardingPrompt() {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_START_LAPAK)
      .setLabel("🪪 Buka Lapak Pertama")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_HELP_DASAR)
      .setLabel("📖 Cara Main")
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    content:
      "🛑 **Lapak Belum Dibuka!**\nKlik **🪪 Buka Lapak Pertama** untuk mulai dari **Lv.1** dengan modal **Rp 500Rb** & **Kedai Kopi Lv.1**.",
    components: [row],
    flags: MessageFlags.Ephemeral,
  } as const;
}

/**
 * Tombol navigasi yang dibuat 100% mengikuti state pemain:
 * - Disegel/punya utang → fokus Seduh + Bayar Segel, Usaha dikunci, Koperasi jadi "Minta Tebus".
 * - Belum Lv.2 → tombol Koperasi terkunci & nonaktif.
 * - Uang harian sudah diambil → tombol Harian nonaktif ("✅ Harian Diambil").
 */
export function buildStateAwarePortfolioRows(user: UserRow): ActionRowBuilder<ButtonBuilder>[] {
  const now = Date.now();
  const inDebt = user.is_seized === 1 || user.pinjol_debt > 0;
  const dailyReady = !user.last_daily_at || now >= user.last_daily_at + DAILY_COOLDOWN_MS;
  const coopUnlocked = user.level >= 2;
  const hasLiquid = user.balance > 0;

  if (inDebt) {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_WORK)
        .setLabel("☕ Seduh Cari Uang")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_DAILY)
        .setLabel(dailyReady ? "☀️ Uang Harian" : "✅ Harian Diambil")
        .setStyle(dailyReady ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!dailyReady),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
        .setLabel(`💸 Bayar Segel (${formatRpShort(user.pinjol_debt)})`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(!hasLiquid),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_MODAL_OPEN)
        .setLabel("✍️ Cicil Nominal")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasLiquid),
    );
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS)
        .setLabel("🔒 Usaha Disegel")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI)
        .setLabel(coopUnlocked ? "🛟 Minta Tebus Warga" : "🔒 Koperasi (Lv.2)")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!coopUnlocked),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_HELP)
        .setLabel("📖 Panduan")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🔄 Segarkan")
        .setStyle(ButtonStyle.Secondary),
    );
    return [row1, row2];
  }

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_WORK)
      .setLabel("☕ Seduh Kopi")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_DAILY)
      .setLabel(dailyReady ? "☀️ Uang Harian" : "✅ Harian Diambil")
      .setStyle(dailyReady ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!dailyReady),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_BISNIS)
      .setLabel("🏪 Kelola Usaha")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_KOPERASI)
      .setLabel(coopUnlocked ? "🤝 Koperasi" : "🔒 Koperasi (Lv.2)")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!coopUnlocked),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_LEADERBOARD)
      .setLabel("🏆 Peringkat")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_SHOP)
      .setLabel("🎨 Tema Kartu")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_JALAN_PINTAS)
      .setLabel("⚡ Talangan")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_HELP)
      .setLabel("📖 Panduan")
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

/**
 * Panel Usaha (`/bisnis`) — tiap tombol otomatis nonaktif bila syarat/kas belum cukup,
 * dan labelnya sudah memuat harga persis supaya pemain tidak perlu menghitung.
 */
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
  const claimReady =
    !isSeized && gross > 0 && (!user.last_passive_at || now >= user.last_passive_at + PASSIVE_COOLDOWN_MS);
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

  const emasStatusLabel =
    upEmas.currentLevel > 0 ? `Lv.${upEmas.currentLevel}` : emasUnlocked ? "✨ Siap Dibuka!" : "🔒 Terkunci";
  const sahamStatusLabel =
    upSaham.currentLevel > 0
      ? `Lv.${upSaham.currentLevel}`
      : sahamUnlocked
        ? "✨ Siap Dibuka!"
        : "🔒 Terkunci";

  const embed = new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle(`🏪 Kelola Usaha • Kas ${formatRpShort(user.balance)}`)
    .setDescription(
      (headline ? `${headline}\n\n` : "") +
        `☕ **Kedai Kopi Lv.${kedaiLvl}** → Naik ke Lv.${upKedai.nextLevel}: **${formatRpShort(upKedai.cost)}**\n` +
        `🛡️ **Tabungan Emas (${emasStatusLabel})** → ${
          emasUnlocked
            ? `${upEmas.currentLevel === 0 ? "Buka" : "Naik ke"} Lv.${upEmas.nextLevel}: **${formatRpShort(upEmas.cost)}**`
            : "🔒 Butuh **Kedai Lv.2**"
        }\n` +
        `🤝 **Koperasi Warga (${sahamStatusLabel})** → ${
          sahamUnlocked
            ? `${upSaham.currentLevel === 0 ? "Buka" : "Naik ke"} Lv.${upSaham.nextLevel}: **${formatRpShort(upSaham.cost)}**`
            : "🔒 Butuh **Kedai Lv.3 + Nama Baik 65**"
        }`,
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
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
      .setLabel("🪪 Kartu Usaha")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Embed Kartu Usaha SANGAT ringkas: 1 baris status + 1 baris cuaca pasar.
 * Seluruh angka sudah tampil di gambar kartu, jadi tidak diulang di teks.
 */
export function buildPortfolioEmbed(
  user: UserRow,
  _businesses: UserBusinessRow[],
  _coop: ServerCoopRow,
  headline?: string,
): EmbedBuilder {
  const { event, nextChangeUnixSec } = getCurrentMarketEvent();
  const rankInfo = getRankForLevel(user.level);

  const isSeized = user.is_seized === 1 || user.pinjol_debt > 0;
  const workTimer = buildCooldownTag(user.last_work_at, WORK_COOLDOWN_MS, "✅ Siap");
  const omzetTimer = isSeized
    ? "🔒 Disegel"
    : buildCooldownTag(user.last_passive_at, PASSIVE_COOLDOWN_MS, "✅ Siap");
  const dailyTimer = buildCooldownTag(user.last_daily_at, DAILY_COOLDOWN_MS, "✅ Siap");

  const embedColor = isSeized ? 0xef4444 : user.karma >= 80 ? 0xf59e0b : 0x10b981;

  return new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🪪 ${user.username} • Lv.${user.level} ${rankInfo.title}`)
    .setDescription(
      (headline ? `${headline}\n\n` : "") +
        `**Seduh:** ${workTimer}  •  **Omzet:** ${omzetTimer}  •  **Harian:** ${dailyTimer}\n` +
        `${event.title} *(${event.goldBonusNote} • <t:${nextChangeUnixSec}:R>)*`,
    )
    .setImage("attachment://karsa-portfolio.png");
}

export function buildWorkDilemmaPayload(user: UserRow) {
  const { event } = getCurrentMarketEvent();
  const idx = Math.floor(Math.random() * WORK_DILEMMAS.length);
  const d = WORK_DILEMMAS[idx % WORK_DILEMMAS.length]!;
  const ethicalEst = Math.round(
    (d.ethicalChoice.rewardRp + (user.karma >= 80 ? d.ethicalChoice.rewardRp * 0.15 : 0)) *
      event.workMultiplier,
  );
  const corruptEst = Math.round(d.corruptChoice.rewardRp * event.workMultiplier);

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`☕ ${d.title}`)
    .setDescription(
      `${d.context}\n\n` +
        `✅ **${d.ethicalChoice.label}** → **+${formatRpShort(ethicalEst)}** (${d.ethicalChoice.karmaDelta >= 0 ? "+" : ""}${d.ethicalChoice.karmaDelta} Nama Baik)\n` +
        `⚠️ **${d.corruptChoice.label}** → **+${formatRpShort(corruptEst)}** (risiko denda **${formatRpShort(d.corruptChoice.fineRp)}**)`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.BTN_WORK_JUJUR}:${idx}`)
      .setLabel("✅ Seduh Murni")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.BTN_WORK_CULAS}:${idx}`)
      .setLabel("⚠️ Pangkas Bahan")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
      .setLabel("🔙 Batal")
      .setStyle(ButtonStyle.Secondary),
  );

  return { content: "", embeds: [embed], components: [row] };
}

export async function sendPortfolioView(
  interaction: ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction,
  targetId = interaction.user.id,
  targetName = interaction.user.username,
  headline?: string,
) {
  const guildId = interaction.guildId || "global_kota_mandiri";
  const user = getOrCreateUser(targetId, targetName);
  const businesses = getUserBusinesses(targetId);
  const coop = getOrCreateServerCoop(guildId);
  const pngBuffer = renderPortfolioCard({ user, businesses, coop });
  const attachment = new AttachmentBuilder(pngBuffer, { name: "karsa-portfolio.png" });
  const embed = buildPortfolioEmbed(user, businesses, coop, headline);

  const payload = {
    content: "",
    embeds: [embed],
    files: [attachment],
    components: buildStateAwarePortfolioRows(user),
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}
