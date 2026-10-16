import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { CUSTOM_IDS } from "./definitions.ts";
import {
  DAILY_COOLDOWN_MS,
  PASSIVE_COOLDOWN_MS,
  WORK_COOLDOWN_MS,
  buyOrUpgradeBusiness,
  claimDailyBonus,
  claimPassiveIncome,
  equipOrBuySkin,
  getOrCreateServerCoop,
  getOrCreateUser,
  getTopLeaderboard,
  getUserBusinesses,
  hasUserAccount,
  investOrRescueCoop,
  registerNewUser,
  repayPinjolDebt,
  takeShortcutGambleOrPinjol,
  workShift,
  type ServerCoopRow,
  type UserBusinessRow,
  type UserRow,
} from "../db/index.ts";
import {
  renderAzabCard,
  renderCoopCard,
  renderLeaderboardCard,
  renderPortfolioCard,
} from "../renderer/pixelCard.ts";
import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";
import {
  BUSINESS_CATALOG,
  WORK_DILEMMAS,
  formatRpShort,
  getCurrentMarketEvent,
  getRankForLevel,
} from "../game/mechanics.ts";
import { buildHelpEmbedsAndComponents, type GuideCategoryId } from "../game/guide.ts";

/**
 * Discord Dynamic Timestamp `<t:UNIX:R>` — label pendek & hidup.
 */
export function buildCooldownTag(lastAtMs: number, cooldownMs: number, readyLabel = "✅ Siap"): string {
  if (!lastAtMs || lastAtMs <= 0) return readyLabel;
  const readyAtMs = lastAtMs + cooldownMs;
  if (Date.now() >= readyAtMs) return readyLabel;
  return `⏳ <t:${Math.ceil(readyAtMs / 1000)}:R>`;
}

type BizType = "kedai_kopi" | "brankas_darurat" | "saham_koperasi";

function upgradePricing(user: UserRow, businesses: UserBusinessRow[], bizType: BizType) {
  const cat = BUSINESS_CATALOG[bizType]!;
  const existing = businesses.find((b) => b.biz_type === bizType);
  const currentLevel = existing?.level ?? 0;
  const nextLevel = currentLevel + 1;
  const rawCost = Math.round(cat.baseCost * Math.pow(1.35, Math.max(0, nextLevel - 1)));
  return {
    currentLevel,
    nextLevel,
    cost: user.karma >= 80 ? Math.round(rawCost * 0.85) : rawCost,
  };
}

function buildOnboardingPrompt() {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_START_LAPAK)
      .setLabel("🪪 Buka Lapak Pertama")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_HELP_DASAR)
      .setLabel("📖 Cara Main")
      .setStyle(ButtonStyle.Secondary)
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
  const hasLiquid = user.balance + user.emergency_fund > 0;

  if (inDebt) {
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_WORK).setLabel("☕ Seduh Cari Uang").setStyle(ButtonStyle.Primary),
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
        .setDisabled(!hasLiquid)
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
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_HELP).setLabel("📖 Panduan").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🔄 Segarkan")
        .setStyle(ButtonStyle.Secondary)
    );
    return [row1, row2];
  }

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_WORK).setLabel("☕ Seduh Kopi").setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_DAILY)
      .setLabel(dailyReady ? "☀️ Uang Harian" : "✅ Harian Diambil")
      .setStyle(dailyReady ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!dailyReady),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_BISNIS).setLabel("🏪 Kelola Usaha").setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_KOPERASI)
      .setLabel(coopUnlocked ? "🤝 Koperasi" : "🔒 Koperasi (Lv.2)")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!coopUnlocked)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_LEADERBOARD).setLabel("🏆 Peringkat").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_SHOP).setLabel("🎨 Tema Kartu").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_JALAN_PINTAS).setLabel("⚡ Talangan").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_HELP).setLabel("📖 Panduan").setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

/**
 * Panel Usaha (`/bisnis`) — tiap tombol otomatis nonaktif bila syarat/kas belum cukup,
 * dan labelnya sudah memuat harga persis supaya pemain tidak perlu menghitung.
 */
function buildBusinessPanelPayload(user: UserRow, businesses: UserBusinessRow[], headline?: string) {
  const now = Date.now();
  const isSeized = user.is_seized === 1 || user.pinjol_debt > 0;
  const kedaiLvl = businesses.find((b) => b.biz_type === "kedai_kopi")?.level ?? 1;

  const gross = businesses.reduce((a, b) => a + (b.level > 0 ? b.daily_yield : 0), 0);
  const { event } = getCurrentMarketEvent();
  const taxRate = user.karma >= 80 ? 0.05 : 0.2;
  const netPreview = Math.round(gross * event.passiveMultiplier * (1 - taxRate));
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

  const embed = new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle(`🏪 Kelola Usaha • Kas ${formatRpShort(user.balance)}`)
    .setDescription(
      (headline ? `${headline}\n\n` : "") +
        `☕ **Kedai Kopi Lv.${kedaiLvl}** → Lv.${upKedai.nextLevel}: **${formatRpShort(upKedai.cost)}**\n` +
        `🛡️ **Tabungan Emas ${upEmas.currentLevel > 0 ? `Lv.${upEmas.currentLevel}` : "Terkunci"}** → ${
          emasUnlocked ? `Lv.${upEmas.nextLevel}: **${formatRpShort(upEmas.cost)}**` : "🔒 Butuh **Kedai Lv.2**"
        }\n` +
        `🤝 **Koperasi Warga ${upSaham.currentLevel > 0 ? `Lv.${upSaham.currentLevel}` : "Terkunci"}** → ${
          sahamUnlocked ? `Lv.${upSaham.nextLevel}: **${formatRpShort(upSaham.cost)}**` : "🔒 Butuh **Kedai Lv.3 + Nama Baik 65**"
        }`
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
          : `🛡️ Emas Lv.${upEmas.nextLevel} — ${formatRpShort(upEmas.cost)}`
      )
      .setStyle(canEmas ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!canEmas),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_BISNIS_SAHAM)
      .setLabel(
        !sahamUnlocked
          ? "🔒 Saham (Butuh Kedai Lv.3)"
          : `🤝 Saham Lv.${upSaham.nextLevel} — ${formatRpShort(upSaham.cost)}`
      )
      .setStyle(canSaham ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!canSaham)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Embed Kartu Usaha SANGAT ringkas: 1 baris status + 1 baris cuaca pasar.
 * Seluruh angka sudah tampil di gambar kartu, jadi tidak diulang di teks.
 */
function buildPortfolioEmbed(
  user: UserRow,
  _businesses: UserBusinessRow[],
  _coop: ServerCoopRow,
  headline?: string
): EmbedBuilder {
  const { event, nextChangeUnixSec } = getCurrentMarketEvent();
  const rankInfo = getRankForLevel(user.level);

  const workTimer = buildCooldownTag(user.last_work_at, WORK_COOLDOWN_MS, "✅ Siap");
  const omzetTimer = buildCooldownTag(user.last_passive_at, PASSIVE_COOLDOWN_MS, "✅ Siap");
  const dailyTimer = buildCooldownTag(user.last_daily_at, DAILY_COOLDOWN_MS, "✅ Siap");

  const embedColor = user.is_seized === 1 ? 0xef4444 : user.karma >= 80 ? 0xf59e0b : 0x10b981;

  return new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🪪 ${user.username} • Lv.${user.level} ${rankInfo.title}`)
    .setDescription(
      (headline ? `${headline}\n\n` : "") +
        `**Seduh:** ${workTimer}  •  **Omzet:** ${omzetTimer}  •  **Harian:** ${dailyTimer}\n` +
        `${event.title} *(${event.goldBonusNote} • <t:${nextChangeUnixSec}:R>)*`
    )
    .setImage("attachment://karsa-portfolio.png");
}

function buildWorkDilemmaPayload(user: UserRow) {
  const { event } = getCurrentMarketEvent();
  const idx = Math.floor(Math.random() * WORK_DILEMMAS.length);
  const d = WORK_DILEMMAS[idx % WORK_DILEMMAS.length]!;
  const ethicalEst = Math.round(
    (d.ethicalChoice.rewardRp + (user.karma >= 80 ? d.ethicalChoice.rewardRp * 0.15 : 0)) * event.workMultiplier
  );
  const corruptEst = Math.round(d.corruptChoice.rewardRp * event.workMultiplier);

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`☕ ${d.title}`)
    .setDescription(
      `${d.context}\n\n` +
        `✅ **${d.ethicalChoice.label}** → **+${formatRpShort(ethicalEst)}** (${d.ethicalChoice.karmaDelta >= 0 ? "+" : ""}${d.ethicalChoice.karmaDelta} Nama Baik)\n` +
        `⚠️ **${d.corruptChoice.label}** → **+${formatRpShort(corruptEst)}** (risiko denda **${formatRpShort(d.corruptChoice.fineRp)}**)`
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
      .setStyle(ButtonStyle.Secondary)
  );

  return { content: "", embeds: [embed], components: [row] };
}

export async function sendPortfolioView(
  interaction: ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction,
  targetId = interaction.user.id,
  targetName = interaction.user.username,
  headline?: string
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

export async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;
  const uid = interaction.user.id;
  const uname = interaction.user.username;

  if (commandName === "help") {
    await interaction.reply({
      ...buildHelpEmbedsAndComponents("dasar"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "start") {
    await interaction.deferReply();
    const reg = registerNewUser(uid, uname);
    const shortMsg = reg.created
      ? `🎉 **Lapak Dibuka!** Modal **Rp 500Rb** & **Kedai Kopi Lv.1** siap. Klik **☕ Seduh Kopi** di bawah!`
      : `ℹ️ **Lapakmu sudah aktif!** Ini buku kas terbarumu:`;
    await sendPortfolioView(interaction, uid, uname, shortMsg);
    return;
  }

  if (commandName === "leaderboard") {
    await interaction.deferReply();
    const guildId = interaction.guildId || "global_kota_mandiri";
    const leaders = getTopLeaderboard(5);
    const coop = getOrCreateServerCoop(guildId);
    const lbPng = renderLeaderboardCard(leaders, coop);
    const attachment = new AttachmentBuilder(lbPng, { name: "karsa-leaderboard.png" });
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`🏆 Peringkat Pasar • Kas Koperasi ${formatRpShort(coop.pool_balance)}`)
      .setImage("attachment://karsa-leaderboard.png");

    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Buka Kartu Usahaku")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
      content: "",
      embeds: [embed],
      files: [attachment],
      components: [backRow],
    });
    return;
  }

  if (!hasUserAccount(uid)) {
    const targetOpt = interaction.options.getUser("warga");
    if ((commandName === "portfolio" || commandName === "card") && targetOpt && hasUserAccount(targetOpt.id)) {
      await interaction.deferReply();
      await sendPortfolioView(interaction, targetOpt.id, targetOpt.username);
      return;
    }
    await interaction.reply(buildOnboardingPrompt());
    return;
  }

  if (commandName === "portfolio" || commandName === "card") {
    const target = interaction.options.getUser("warga") || interaction.user;
    if (!hasUserAccount(target.id)) {
      await interaction.reply({
        content: `ℹ️ **${target.username}** belum membuka lapak (\`/start\`).`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferReply();
    await sendPortfolioView(interaction, target.id, target.username);
    return;
  }

  if (commandName === "daily") {
    const user = getOrCreateUser(uid, uname);
    const now = Date.now();
    if (user.last_daily_at > 0 && now - user.last_daily_at < DAILY_COOLDOWN_MS) {
      const readyUnix = Math.ceil((user.last_daily_at + DAILY_COOLDOWN_MS) / 1000);
      await interaction.reply({
        content: `⏳ Uang harian baru bisa diambil **<t:${readyUnix}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferReply();
    const res = claimDailyBonus(uid, uname);
    await sendPortfolioView(interaction, uid, uname, res.message);
    return;
  }

  if (commandName === "work") {
    const user = getOrCreateUser(uid, uname);
    const now = Date.now();
    if (user.last_work_at > 0 && now - user.last_work_at < WORK_COOLDOWN_MS) {
      const readyUnix = Math.ceil((user.last_work_at + WORK_COOLDOWN_MS) / 1000);
      await interaction.reply({
        content: `⏳ Dapur masih ngebul! Siap seduh lagi **<t:${readyUnix}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.reply(buildWorkDilemmaPayload(user));
    return;
  }

  if (commandName === "bisnis") {
    const user = getOrCreateUser(uid, uname);
    const businesses = getUserBusinesses(uid);
    await interaction.reply({
      ...buildBusinessPanelPayload(user, businesses),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "jalan-pintas") {
    const user = getOrCreateUser(uid, uname);
    const hasDebt = user.pinjol_debt > 0;
    const hasLiquid = user.balance + user.emergency_fund > 0;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PINJOL_AMBIL)
        .setLabel("💸 Talangan Kilat (8%/Hari)")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(user.is_seized === 1),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_JUDOL_SPIN)
        .setLabel("🎡 Meja Putar Belakang")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(user.is_seized === 1)
    );
    if (hasDebt) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
          .setLabel(`💸 Bayar (${formatRpShort(user.pinjol_debt)})`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(!hasLiquid),
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.BTN_REPAY_MODAL_OPEN)
          .setLabel("✍️ Cicil Nominal")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!hasLiquid)
      );
    }
    await interaction.reply({
      content: hasDebt
        ? `🚨 **Tunggakan Segel: ${formatRpShort(user.pinjol_debt)}** • Kas + Emas: **${formatRpShort(user.balance + user.emergency_fund)}**`
        : `⚡ **Talangan Kilat & Meja Belakang** — tunggakan di atas **Rp 20Jt** otomatis menyegel lapak.`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "koperasi") {
    const guildId = interaction.guildId || "global_kota_mandiri";
    const user = getOrCreateUser(uid, uname);
    const coop = getOrCreateServerCoop(guildId);
    const canPatungan = user.level >= 2 && user.pinjol_debt === 0 && user.balance >= 5_000_000;
    const canRescue = user.pinjol_debt === 0 && user.balance >= 10_000_000;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_PATUNGAN)
        .setLabel(user.level < 2 ? "🔒 Patungan (Butuh Lv.2)" : "🤝 Patungan Rp 5Jt")
        .setStyle(canPatungan ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canPatungan),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Tebus Lapak Warga (Rp 10Jt)")
        .setStyle(canRescue ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canRescue),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Kartu Usaha")
        .setStyle(ButtonStyle.Secondary)
    );
    const coopPng = renderCoopCard(coop);
    const attachment = new AttachmentBuilder(coopPng, { name: "karsa-koperasi.png" });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🤝 Koperasi Pasar • Kas ${formatRpShort(coop.pool_balance)}`)
      .setDescription(`Kasmu **${formatRpShort(user.balance)}** • Warung Ditebus **${coop.rescued_count}**`)
      .setImage("attachment://karsa-koperasi.png");
    await interaction.reply({
      embeds: [embed],
      files: [attachment],
      components: [row],
    });
    return;
  }

  if (commandName === "shop") {
    if (interaction.user.id && (getOrCreateUser(uid, uname).is_seized === 1 || getOrCreateUser(uid, uname).pinjol_debt > 0)) {
      await interaction.reply({
        content: "🔒 **Toko tema terkunci** selama lapak masih disegel / punya tunggakan. Lunasi dulu di `/jalan-pintas`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const user = getOrCreateUser(uid, uname);
    const select = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT_SKIN_PREVIEW)
      .setPlaceholder("👀 Pilih Tema Kartu Usaha...")
      .addOptions(
        Object.values(SKIN_PALETTES).map((s) => ({
          label: `${s.name} (${s.priceRp === 0 ? "GRATIS" : `Rp${s.priceRp / 1_000_000}Jt`})`,
          description: s.desc,
          value: s.id,
        }))
      );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.reply({
      content: `🎨 **Pilih tema untuk melihat pratinjau** (Kasmu: **${formatRpShort(user.balance)}**):`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const rawId = interaction.customId;
  const id = rawId.split(":")[0]!;
  const uid = interaction.user.id;
  const uname = interaction.user.username;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (id === CUSTOM_IDS.BTN_START_LAPAK) {
    await interaction.deferReply();
    const reg = registerNewUser(uid, uname);
    const shortMsg = reg.created
      ? `🎉 **Lapak Dibuka!** Modal **Rp 500Rb** & **Kedai Kopi Lv.1** siap. Klik **☕ Seduh Kopi** di bawah!`
      : `ℹ️ **Lapakmu sudah aktif!**`;
    await sendPortfolioView(interaction, uid, uname, shortMsg);
    return;
  }

  if (id === CUSTOM_IDS.BTN_HELP) {
    await interaction.reply({
      ...buildHelpEmbedsAndComponents("dasar"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (
    id === CUSTOM_IDS.BTN_HELP_DASAR ||
    id === CUSTOM_IDS.BTN_HELP_USAHA ||
    id === CUSTOM_IDS.BTN_HELP_KOPERASI ||
    id === CUSTOM_IDS.BTN_HELP_BAHAYA
  ) {
    const cat: GuideCategoryId =
      id === CUSTOM_IDS.BTN_HELP_USAHA
        ? "usaha"
        : id === CUSTOM_IDS.BTN_HELP_KOPERASI
          ? "koperasi"
          : id === CUSTOM_IDS.BTN_HELP_BAHAYA
            ? "bahaya"
            : "dasar";
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
      await interaction.editReply(buildHelpEmbedsAndComponents(cat));
    } else {
      await interaction.reply({
        ...buildHelpEmbedsAndComponents(cat),
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  if (!hasUserAccount(uid)) {
    await interaction.reply(buildOnboardingPrompt());
    return;
  }

  if (id === CUSTOM_IDS.BTN_REPAY_MODAL_OPEN) {
    const user = getOrCreateUser(uid, uname);
    if (user.pinjol_debt <= 0) {
      await interaction.reply({ content: "✅ Lapakmu sudah bebas tunggakan!", flags: MessageFlags.Ephemeral });
      return;
    }
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_IDS.MODAL_REPAY_DEBT)
      .setTitle("💸 Cicil / Lunasi Tagihan Segel");
    const amountInput = new TextInputBuilder()
      .setCustomId(CUSTOM_IDS.INPUT_REPAY_AMOUNT)
      .setLabel(`Nominal (Tunggakan: ${formatRpShort(user.pinjol_debt)})`)
      .setPlaceholder("Contoh: 500000 atau ketik 'semua'")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput));
    await interaction.showModal(modal);
    return;
  }

  if (id === CUSTOM_IDS.BTN_SHOP) {
    const user = getOrCreateUser(uid, uname);
    if (user.is_seized === 1 || user.pinjol_debt > 0) {
      await interaction.reply({
        content: "🔒 **Toko tema terkunci** selama lapak masih disegel / punya tunggakan.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const select = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT_SKIN_PREVIEW)
      .setPlaceholder("👀 Pilih Tema Kartu Usaha...")
      .addOptions(
        Object.values(SKIN_PALETTES).map((s) => ({
          label: `${s.name} (${s.priceRp === 0 ? "GRATIS" : `Rp${s.priceRp / 1_000_000}Jt`})`,
          description: s.desc,
          value: s.id,
        }))
      );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.reply({
      content: `🎨 **Pilih tema untuk melihat pratinjau** (Kasmu: **${formatRpShort(user.balance)}**):`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_LEADERBOARD) {
    await interaction.deferUpdate();
    const user = getOrCreateUser(uid, uname);
    const leaders = getTopLeaderboard(5);
    const coop = getOrCreateServerCoop(guildId);
    const lbPng = renderLeaderboardCard(leaders, coop);
    const attachment = new AttachmentBuilder(lbPng, { name: "karsa-leaderboard.png" });
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`🏆 Peringkat Pasar • Kas Koperasi ${formatRpShort(coop.pool_balance)}`)
      .setImage("attachment://karsa-leaderboard.png");
    await interaction.editReply({
      content: "",
      embeds: [embed],
      files: [attachment],
      components: buildStateAwarePortfolioRows(user),
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_DAILY) {
    const user = getOrCreateUser(uid, uname);
    const now = Date.now();
    if (user.last_daily_at > 0 && now - user.last_daily_at < DAILY_COOLDOWN_MS) {
      const readyUnix = Math.ceil((user.last_daily_at + DAILY_COOLDOWN_MS) / 1000);
      await interaction.reply({
        content: `⏳ Uang harian baru siap **<t:${readyUnix}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    const res = claimDailyBonus(uid, uname);
    await sendPortfolioView(interaction, uid, uname, res.message);
    return;
  }

  // "☕ Seduh Kopi" membuka pilihan dilema (tidak auto-pick).
  if (id === CUSTOM_IDS.BTN_WORK) {
    const user = getOrCreateUser(uid, uname);
    const now = Date.now();
    if (user.last_work_at > 0 && now - user.last_work_at < WORK_COOLDOWN_MS) {
      const readyUnix = Math.ceil((user.last_work_at + WORK_COOLDOWN_MS) / 1000);
      await interaction.reply({
        content: `⏳ Dapur masih ngebul! Siap seduh lagi **<t:${readyUnix}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    await interaction.editReply(buildWorkDilemmaPayload(user));
    return;
  }

  // Memilih salah satu dari dua racikan → eksekusi shift, kembali ke Kartu Usaha.
  if (id === CUSTOM_IDS.BTN_WORK_JUJUR || id === CUSTOM_IDS.BTN_WORK_CULAS) {
    const userBefore = getOrCreateUser(uid, uname);
    const now = Date.now();
    if (userBefore.last_work_at > 0 && now - userBefore.last_work_at < WORK_COOLDOWN_MS) {
      const readyUnix = Math.ceil((userBefore.last_work_at + WORK_COOLDOWN_MS) / 1000);
      await interaction.reply({
        content: `⏳ Dapur masih ngebul! Siap seduh lagi **<t:${readyUnix}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    const choice = id === CUSTOM_IDS.BTN_WORK_CULAS ? "corrupt" : "ethical";
    const idxRaw = rawId.split(":")[1];
    const idx = idxRaw !== undefined ? Number(idxRaw) : undefined;
    const res = workShift(uid, uname, choice, Number.isFinite(idx) ? idx : undefined, { enforceCooldown: true });
    const sign = res.deltaRp >= 0 ? "+" : "-";
    const lvlMsg = res.leveledUp ? ` 🎉 **NAIK KE LV.${res.user.level}!**` : "";
    const headline =
      `${res.busted ? "🚨 **Kena Sidak!**" : "☕ **Seduh Selesai!**"} **${sign}${formatRpShort(Math.abs(res.deltaRp))}**` +
      ` • Nama Baik ${res.karmaDelta >= 0 ? "+" : ""}${res.karmaDelta}${lvlMsg}`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (id === CUSTOM_IDS.BTN_BISNIS) {
    const user = getOrCreateUser(uid, uname);
    const businesses = getUserBusinesses(uid);
    await interaction.reply({
      ...buildBusinessPanelPayload(user, businesses),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_BISNIS_CLAIM) {
    const res = claimPassiveIncome(uid, uname, { enforceCooldown: true });
    if (!res.ok) {
      await interaction.reply({ content: res.reason!, flags: MessageFlags.Ephemeral });
      return;
    }
    const businesses = getUserBusinesses(uid);
    const headline = `💰 **Omzet Cair +${formatRpShort(res.net)}!** ${res.taxSaved ? "*(Sewa 5%)*" : "*(Sewa 20%)*"}`;
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
      await interaction.editReply(buildBusinessPanelPayload(res.user, businesses, headline));
    } else {
      await interaction.deferUpdate();
      await sendPortfolioView(interaction, uid, uname, headline);
    }
    return;
  }

  if (
    id === CUSTOM_IDS.BTN_BISNIS_KEDAI ||
    id === CUSTOM_IDS.BTN_BISNIS_BRANKAS ||
    id === CUSTOM_IDS.BTN_BISNIS_SAHAM
  ) {
    const btype: BizType =
      id === CUSTOM_IDS.BTN_BISNIS_KEDAI
        ? "kedai_kopi"
        : id === CUSTOM_IDS.BTN_BISNIS_BRANKAS
          ? "brankas_darurat"
          : "saham_koperasi";
    const res = buyOrUpgradeBusiness(uid, uname, btype);
    if (!res.ok) {
      await interaction.reply({ content: `${res.reason}`, flags: MessageFlags.Ephemeral });
      return;
    }
    const businesses = getUserBusinesses(uid);
    const headline = `🏪 **Naik ke Lv.${res.nextLevel}!** (+${formatRpShort(res.yieldBoost || 0)}/hr)`;
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
      await interaction.editReply(buildBusinessPanelPayload(res.user, businesses, headline));
    } else {
      await interaction.deferUpdate();
      await sendPortfolioView(interaction, uid, uname, headline);
    }
    return;
  }

  if (id === CUSTOM_IDS.BTN_REPAY_DEBT || id === CUSTOM_IDS.BTN_PINJOL_LUNASI) {
    const res = repayPinjolDebt(uid, uname);
    if (!res.ok) {
      await interaction.reply({ content: res.message, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    await sendPortfolioView(interaction, uid, uname, res.message);
    return;
  }

  // "⚡ Talangan" dari kartu membuka menu konfirmasi dulu (tidak langsung menyita aset!).
  if (id === CUSTOM_IDS.BTN_JALAN_PINTAS) {
    const user = getOrCreateUser(uid, uname);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PINJOL_AMBIL)
        .setLabel("💸 Ambil Talangan (8%/Hari)")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_JUDOL_SPIN)
        .setLabel("🎡 Meja Putar Belakang")
        .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
      content: `⚡ **Fasilitas Belakang Pasar** — tunggakan di atas **Rp 20Jt** menyegel lapakmu. Kas + Emas: **${formatRpShort(user.balance + user.emergency_fund)}**`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_PINJOL_AMBIL || id === CUSTOM_IDS.BTN_JUDOL_SPIN) {
    const mode = id === CUSTOM_IDS.BTN_PINJOL_AMBIL ? "pinjol" : "slot";
    const res = takeShortcutGambleOrPinjol(uid, uname, mode, guildId);
    const azabPng = renderAzabCard({
      username: uname,
      mode,
      cashLost: res.cashLost,
      totalDebt: res.totalDebt,
      assetSeizedName: res.assetSeizedName,
      karmaAfter: res.user.karma,
    });
    const attachment = new AttachmentBuilder(azabPng, { name: "surat-segel-lapak.png" });
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(`🚨 LAPAK DISEGEL • Tunggakan ${formatRpShort(res.totalDebt)}`)
      .setDescription(
        `${res.narrative}\n\n🛡️ **Tabungan Emas (Aman):** ${formatRpShort(res.user.emergency_fund)}\n` +
          `Kasmu sekarang: **${formatRpShort(res.user.balance)}**`
      )
      .setImage("attachment://surat-segel-lapak.png");
    const canPay = res.user.balance + res.user.emergency_fund > 0;
    const rescueRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_WORK).setLabel("☕ Seduh Cari Uang").setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
        .setLabel("💸 Bayar Segel")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canPay),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Buku Kas")
        .setStyle(ButtonStyle.Secondary)
    );
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.reply({ embeds: [embed], files: [attachment], components: [rescueRow] });
    } else {
      await interaction.deferUpdate();
      await interaction.editReply({ content: "", embeds: [embed], files: [attachment], components: [rescueRow] });
    }
    return;
  }

  if (id === CUSTOM_IDS.BTN_KOPERASI) {
    await interaction.deferUpdate();
    const user = getOrCreateUser(uid, uname);
    const coop = getOrCreateServerCoop(guildId);
    const canPatungan = user.level >= 2 && user.pinjol_debt === 0 && user.balance >= 5_000_000;
    const canRescue = user.pinjol_debt === 0 && user.balance >= 10_000_000;

    const coopPng = renderCoopCard(coop);
    const attachment = new AttachmentBuilder(coopPng, { name: "karsa-koperasi.png" });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🤝 Koperasi Pasar • Kas ${formatRpShort(coop.pool_balance)}`)
      .setDescription(`Kasmu **${formatRpShort(user.balance)}** • Warung Ditebus **${coop.rescued_count}**`)
      .setImage("attachment://karsa-koperasi.png");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_PATUNGAN)
        .setLabel(user.level < 2 ? "🔒 Patungan (Butuh Lv.2)" : "🤝 Patungan Rp 5Jt")
        .setStyle(canPatungan ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canPatungan),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Tebus Warga (Rp 10Jt)")
        .setStyle(canRescue ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canRescue),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Kartu Usaha")
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({
      content: "",
      embeds: [embed],
      files: [attachment],
      components: [row],
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_KOPERASI_PATUNGAN || id === CUSTOM_IDS.BTN_KOPERASI_TALANGI) {
    const act = id === CUSTOM_IDS.BTN_KOPERASI_PATUNGAN ? "patungan" : "rescue";
    const res = investOrRescueCoop(uid, uname, act, guildId);
    if (!res.ok) {
      await interaction.reply({ content: `${res.message}`, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    const headline =
      act === "patungan"
        ? `🤝 **Patungan +${formatRpShort(res.amount || 0)} Berhasil!**`
        : `🛟 **Lapak Warga Berhasil Ditebus!** (+20 Nama Baik, +1 💎)`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (id.startsWith(CUSTOM_IDS.BTN_SKIN_BUY_PREFIX)) {
    const skinId = id.replace(CUSTOM_IDS.BTN_SKIN_BUY_PREFIX, "") as SkinId;
    const res = equipOrBuySkin(uid, uname, skinId);
    if (!res.ok) {
      await interaction.reply({ content: `🎨 ${res.message}`, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    await sendPortfolioView(interaction, uid, uname, `🎨 ${res.message}`);
    return;
  }

  if (id === CUSTOM_IDS.BTN_PORTFOLIO_REFRESH) {
    await interaction.deferUpdate();
    await sendPortfolioView(interaction, uid, uname);
  }
}

export async function handleModalSubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> {
  const uid = interaction.user.id;
  const uname = interaction.user.username;

  if (!hasUserAccount(uid)) {
    await interaction.reply(buildOnboardingPrompt());
    return;
  }

  if (interaction.customId === CUSTOM_IDS.MODAL_REPAY_DEBT) {
    const rawVal = interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_REPAY_AMOUNT).trim().toLowerCase();
    const numeric =
      rawVal === "semua" || rawVal === "all" ? undefined : Number(rawVal.replace(/[^0-9]/g, ""));
    if (numeric !== undefined && (!Number.isFinite(numeric) || numeric <= 0)) {
      await interaction.reply({
        content: "⚠️ Masukkan angka rupiah (contoh: `500000`) atau ketik `semua`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const res = repayPinjolDebt(uid, uname, numeric);
    if (!res.ok) {
      await interaction.reply({ content: res.message, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply();
    await sendPortfolioView(interaction, uid, uname, res.message);
  }
}

export async function handleStringSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
  if (interaction.customId !== CUSTOM_IDS.SELECT_SKIN_PREVIEW) return;
  if (!hasUserAccount(interaction.user.id)) {
    await interaction.reply(buildOnboardingPrompt());
    return;
  }
  await interaction.deferUpdate();
  const skinId = (interaction.values[0] || "retro_gold") as SkinId;
  const skin = SKIN_PALETTES[skinId] || SKIN_PALETTES.retro_gold;
  const user = getOrCreateUser(interaction.user.id, interaction.user.username);
  const businesses = getUserBusinesses(interaction.user.id);
  const coop = getOrCreateServerCoop(interaction.guildId || "global_kota_mandiri");

  const previewBuffer = renderPortfolioCard({ user, businesses, coop, overrideSkin: skinId });
  const attachment = new AttachmentBuilder(previewBuffer, { name: `preview-${skinId}.png` });

  const owned: string[] = JSON.parse(user.owned_skins || '["retro_gold"]');
  const isOwned = owned.includes(skinId);
  const canBuy = isOwned || (user.balance >= skin.priceRp && user.pinjol_debt === 0 && user.is_seized === 0);

  const buyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.BTN_SKIN_BUY_PREFIX}${skinId}`)
      .setLabel(isOwned ? `✅ Pasang ${skin.name}` : `💎 Beli — Rp${skin.priceRp / 1_000_000}Jt`)
      .setStyle(canBuy ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canBuy)
  );

  await interaction.editReply({
    content: `👀 **Pratinjau: ${skin.name}** • Kasmu **${formatRpShort(user.balance)}**`,
    files: [attachment],
    components: [buyRow],
  });
}
