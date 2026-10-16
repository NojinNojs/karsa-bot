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
  WORK_DILEMMAS,
  formatRpShort,
  getCurrentMarketEvent,
  getRankForLevel,
} from "../game/mechanics.ts";
import { buildHelpEmbedsAndComponents, type GuideCategoryId } from "../game/guide.ts";

/**
 * Helper untuk merender Discord Dynamic Timestamp relatif `<t:UNIX:R>`
 * supaya pemain melihat hitungan mundur yang bergerak otomatis (live) di layar Discord.
 */
export function buildCooldownTag(lastAtMs: number, cooldownMs: number, readyLabel = "✅ Siap"): string {
  if (!lastAtMs || lastAtMs <= 0) return readyLabel;
  const readyAtMs = lastAtMs + cooldownMs;
  if (Date.now() >= readyAtMs) return readyLabel;
  const unixSec = Math.ceil(readyAtMs / 1000);
  return `⏳ <t:${unixSec}:R>`;
}

function buildOnboardingPrompt() {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_START_LAPAK)
      .setLabel("🪪 Buka Lapak Pertama (/start)")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_HELP_DASAR)
      .setLabel("📖 Baca Buku Pedoman")
      .setStyle(ButtonStyle.Secondary)
  );
  return {
    content:
      "🛑 **Lapak Belum Terdaftar di Pasar Malam KARSA!**\n" +
      "Kamu belum membuka buku kas pedagang. Klik tombol **🪪 Buka Lapak Pertama** di bawah atau ketik `/start` untuk menerima **Modal Kas Rp 500.000** & **Kedai Kopi Lv.1**!",
    components: [row],
    flags: MessageFlags.Ephemeral,
  } as const;
}

function buildMainNavRow(hasDebt = false) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_WORK).setLabel("☕ Seduh (/work)").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_BISNIS).setLabel("🏪 Aset & Usaha").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_KOPERASI).setLabel("🤝 Koperasi").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_SHOP).setLabel("🎨 Tema Kartu").setStyle(ButtonStyle.Secondary)
  );
  if (hasDebt) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_MODAL_OPEN)
        .setLabel("💸 Cicil / Lunasi Segel")
        .setStyle(ButtonStyle.Success)
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_JALAN_PINTAS)
        .setLabel("⚡ Talangan")
        .setStyle(ButtonStyle.Danger)
    );
  }
  return row;
}

function buildSecondaryNavRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_HELP).setLabel("📖 Pedoman").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DAILY).setLabel("☀️ Uang Belanja").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_LEADERBOARD).setLabel("🏆 Peringkat").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH).setLabel("🔄 Segarkan").setStyle(ButtonStyle.Secondary)
  );
}

function buildWorkOfferRow(dilemmaIndex: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.BTN_WORK_JUJUR}:${dilemmaIndex}`)
      .setLabel("✅ Seduh Takaran Murni")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.BTN_WORK_CULAS}:${dilemmaIndex}`)
      .setLabel("⚠️ Pangkas Bahan (Hemat)")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildMarketFooterText(): string {
  const { event, nextChangeUnixSec } = getCurrentMarketEvent();
  return `Cuaca Pasar: ${event.title} • Berganti <t:${nextChangeUnixSec}:R>`;
}

function buildPortfolioEmbed(
  user: UserRow,
  businesses: UserBusinessRow[],
  coop: ServerCoopRow,
  headline?: string
): EmbedBuilder {
  const { event, nextChangeUnixSec } = getCurrentMarketEvent();
  const rankInfo = getRankForLevel(user.level);
  const totalNw = businesses.reduce((a, b) => a + b.value, 0) + user.balance + user.emergency_fund;

  const workTimer = buildCooldownTag(user.last_work_at, WORK_COOLDOWN_MS, "✅ Siap Seduh");
  const passiveTimer = buildCooldownTag(user.last_passive_at, PASSIVE_COOLDOWN_MS, "✅ Siap Cair");
  const dailyTimer = buildCooldownTag(user.last_daily_at, DAILY_COOLDOWN_MS, "✅ Siap Ambil");

  const embedColor = user.is_seized === 1 ? 0xef4444 : user.karma >= 80 ? 0xf59e0b : 0x10b981;

  return new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🪪 Buku Kas & Kartu Usaha — ${user.username} (Lv.${user.level} ${rankInfo.title})`)
    .setDescription(
      (headline ? `${headline}\n\n` : "") +
        `> **Cuaca Pasar:** ${event.title} *(berganti <t:${nextChangeUnixSec}:R>)*\n` +
        `> ${event.description} → **${event.goldBonusNote}**`
    )
    .addFields(
      {
        name: "💰 Arus Kas & Kekayaan",
        value:
          `• **Laci Kas:** ${formatRpShort(user.balance)}\n` +
          `• **Brankas Emas:** ${formatRpShort(user.emergency_fund)}\n` +
          `• **Total Harta:** ${formatRpShort(totalNw)}` +
          (user.pinjol_debt > 0 ? `\n• 🚨 **Tunggakan:** ${formatRpShort(user.pinjol_debt)}` : ""),
        inline: true,
      },
      {
        name: "⏱️ Jadwal & Cooldown Live",
        value:
          `• **Seduh (\`/work\`):** ${workTimer}\n` +
          `• **Omzet (\`/bisnis\`):** ${passiveTimer}\n` +
          `• **Belanja (\`/daily\`):** ${dailyTimer}`,
        inline: true,
      },
      {
        name: "🎯 Target Lapak Berikutnya",
        value:
          `• **Misi:** ${user.active_quest}\n` +
          `• **Nama Baik:** ${user.karma}/100 (${user.badge}) • **Gem:** 💎 ${user.gems} • **Koperasi Server:** Lv.${coop.eco_level} (${coop.eco_health}%)`,
        inline: false,
      }
    )
    .setImage("attachment://karsa-portfolio.png")
    .setFooter({
      text: `KARSA • Tema: ${SKIN_PALETTES[user.skin_id]?.name || "Retro Arcade Gold"} • Tombol di bawah mengedit pesan ini langsung (Edit in-place)`,
    })
    .setTimestamp();
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
    components: [buildMainNavRow(user.pinjol_debt > 0), buildSecondaryNavRow()],
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
    // Ephemeral (hidden) manual so it never clutters the public channel.
    await interaction.reply({
      ...buildHelpEmbedsAndComponents("dasar"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "start") {
    await interaction.deferReply();
    const reg = registerNewUser(uid, uname);
    await sendPortfolioView(interaction, uid, uname, reg.message);
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
      .setTitle(`🏆 Papan Peringkat Pedagang KARSA — Pasar Sehat ${coop.eco_health}%`)
      .setDescription(
        `> **Cuaca Pasar:** ${getCurrentMarketEvent().event.title} *(berganti <t:${getCurrentMarketEvent().nextChangeUnixSec}:R>)*\n` +
          `> Kas Bersama Koperasi: **${formatRpShort(coop.pool_balance)}** • Gerobak Ditebus: **${coop.rescued_count} Warung**`
      )
      .setImage("attachment://karsa-leaderboard.png")
      .setFooter({ text: "KARSA • Papan Peringkat diperbarui otomatis saat tombol diklik" })
      .setTimestamp();

    await interaction.editReply({
      content: "",
      embeds: [embed],
      files: [attachment],
      components: [buildMainNavRow(false), buildSecondaryNavRow()],
    });
    return;
  }

  // Strict Ephemeral Registration Gate for all gameplay commands
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
        content: `ℹ️ **${target.username}** belum membuka lapak di Pasar Malam KARSA (minta dia ketik \`/start\`).`,
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
        content: `⏳ **Uang Belanja Harian Belum Siap!**\nKamu baru bisa mengambil uang belanja pasar lagi **<t:${readyUnix}:R>** (tepat pada <t:${readyUnix}:t>).`,
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
        content: `⏳ **Dapur Masih Ngebul!**\nKloter seduhan berikutnya siap **<t:${readyUnix}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const { event, nextChangeUnixSec } = getCurrentMarketEvent();
    const idx = Math.floor(Math.random() * WORK_DILEMMAS.length);
    const d = WORK_DILEMMAS[idx % WORK_DILEMMAS.length]!;
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`☕ Giliran Seduh: ${d.title}`)
      .setDescription(
        `> ${d.context}\n\n` +
          `🌤️ **Cuaca Pasar (${event.title} • ganti <t:${nextChangeUnixSec}:R>):** ${event.goldBonusNote}`
      )
      .addFields(
        {
          name: "✅ Takaran Murni (Jujur)",
          value: `Setoran ±**${formatRpShort(d.ethicalChoice.rewardRp)}**\n**+${d.ethicalChoice.karmaDelta} Nama Baik** • **+${d.ethicalChoice.xpDelta} XP**`,
          inline: true,
        },
        {
          name: "⚠️ Pangkas Bahan (Hemat)",
          value: `Potensi **${formatRpShort(d.corruptChoice.rewardRp)}**\nRisiko sidak **${Math.round(d.corruptChoice.auditChance * 100)}%** (Denda **${formatRpShort(d.corruptChoice.fineRp)}**)`,
          inline: true,
        }
      )
      .setFooter({ text: "KARSA • Pilihanmu tercatat permanen di Buku Besar Pasar" })
      .setTimestamp();
    await interaction.reply({
      embeds: [embed],
      components: [buildWorkOfferRow(idx)],
    });
    return;
  }

  if (commandName === "bisnis") {
    const user = getOrCreateUser(uid, uname);
    const bizzes = getUserBusinesses(uid);
    const kedai = bizzes.find((b) => b.biz_type === "kedai_kopi");
    const brankas = bizzes.find((b) => b.biz_type === "brankas_darurat");
    const saham = bizzes.find((b) => b.biz_type === "saham_koperasi");
    const passiveTimer = buildCooldownTag(user.last_passive_at, PASSIVE_COOLDOWN_MS, "✅ Siap Dicairkan");

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🏪 Manajemen Unit Usaha — ${user.username}`)
      .setDescription(
        `• **Status Pencairan Omzet:** ${passiveTimer}\n` +
          `• **Potongan Sewa Pasar:** ${user.karma >= 80 ? "**5% (Diskon Nama Baik -15% Aktif!)**" : "**20% (Raih Nama Baik ≥ 80 untuk diskon)**"}`
      )
      .addFields(
        {
          name: `☕ Kedai Kopi Karsa (Lv.${kedai?.level ?? 1})`,
          value: `Valuasi **${formatRpShort(kedai?.value ?? 0)}**\nOmzet **+${formatRpShort(kedai?.daily_yield ?? 0)}/hr**`,
          inline: true,
        },
        {
          name: `🛡️ Tabungan Emas (${(brankas?.level ?? 0) > 0 ? `Lv.${brankas?.level}` : "🔒 Terkunci"})`,
          value:
            (brankas?.level ?? 0) > 0
              ? `Saldo Kebal Sita **${formatRpShort(user.emergency_fund)}**\nImbal **+${formatRpShort(brankas?.daily_yield ?? 0)}/hr**`
              : `**Syarat:** Naikin **Kedai Kopi ke Lv.2**`,
          inline: true,
        },
        {
          name: `🤝 Koperasi Warga (${(saham?.level ?? 0) > 0 ? `Lv.${saham?.level}` : "🔒 Terkunci"})`,
          value:
            (saham?.level ?? 0) > 0
              ? `Penyertaan **${formatRpShort(saham?.value ?? 0)}**\nBagi Hasil **+${formatRpShort(saham?.daily_yield ?? 0)}/hr**`
              : `**Syarat:** **Kedai Lv.3** & **Nama Baik ≥ 65**`,
          inline: true,
        }
      )
      .setFooter({ text: "KARSA • Panel ini hanya terlihat olehmu (Ephemeral)" });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_CLAIM)
        .setLabel("💰 Cairkan Omzet Harian")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_KEDAI)
        .setLabel(`☕ Upgrade Kedai (Lv.${(kedai?.level ?? 1) + 1})`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_BRANKAS)
        .setLabel(
          (brankas?.level ?? 0) === 0
            ? "🔒 Buka Tabungan Emas (Kedai Lv.2)"
            : `🛡️ Tambah Emas (Lv.${(brankas?.level ?? 0) + 1})`
        )
        .setStyle((kedai?.level ?? 1) >= 2 ? ButtonStyle.Secondary : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_SAHAM)
        .setLabel(
          (saham?.level ?? 0) === 0
            ? "🔒 Buka Saham Koperasi (Kedai Lv.3)"
            : `🤝 Tambah Saham (Lv.${(saham?.level ?? 0) + 1})`
        )
        .setStyle((kedai?.level ?? 1) >= 3 && user.karma >= 65 ? ButtonStyle.Secondary : ButtonStyle.Danger)
    );
    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "jalan-pintas") {
    const user = getOrCreateUser(uid, uname);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PINJOL_AMBIL)
        .setLabel("💸 Pencairan Talangan Kilat (Bunga 8%/Hari)")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_JUDOL_SPIN)
        .setLabel("🎡 Putar Meja Belakang Pasar")
        .setStyle(ButtonStyle.Danger)
    );
    if (user.pinjol_debt > 0) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
          .setLabel(`💸 Bayar Semua (${formatRpShort(user.pinjol_debt)})`)
          .setStyle(ButtonStyle.Success)
      );
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.BTN_REPAY_MODAL_OPEN)
          .setLabel("✍️ Ketik Nominal Cicilan")
          .setStyle(ButtonStyle.Primary)
      );
    }
    await interaction.reply({
      content:
        `⚡ **Meja Talangan Kilat & Belakang Pasar**\n` +
        (user.pinjol_debt > 0
          ? `🚨 **Status Lapak Disegel:** Tunggakan aktif **${formatRpShort(user.pinjol_debt)}**. Klik **💸 Bayar Semua** atau **✍️ Ketik Nominal Cicilan** untuk membuka segel lapak!`
          : `Pencairan talangan kilat mengenakan bunga majemuk 8%/hari dan menyegel unit usaha bila tunggakan melewati Rp 20 Juta.`),
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "koperasi") {
    const guildId = interaction.guildId || "global_kota_mandiri";
    const coop = getOrCreateServerCoop(guildId);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_PATUNGAN)
        .setLabel("🤝 Patungan Kas Rp 5 Jt (Lv.2+)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Tebus Gerobak Warga Rp 10 Jt")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Kembali ke Buku Kas")
        .setStyle(ButtonStyle.Secondary)
    );
    const coopPng = renderCoopCard(coop);
    const attachment = new AttachmentBuilder(coopPng, { name: "karsa-koperasi.png" });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🤝 Koperasi Pedagang KARSA — Pasar Sehat ${coop.eco_health}%`)
      .setDescription(
        `Kas Bersama Server **${formatRpShort(coop.pool_balance)}** • Level Pasar **Lv.${coop.eco_level}** • Warung Ditebus **${coop.rescued_count}**`
      )
      .setImage("attachment://karsa-koperasi.png")
      .setTimestamp();
    await interaction.reply({
      embeds: [embed],
      files: [attachment],
      components: [row],
    });
    return;
  }

  if (commandName === "shop") {
    const select = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT_SKIN_PREVIEW)
      .setPlaceholder("👀 Pilih Tema Kartu Usaha untuk Pratinjau...")
      .addOptions(
        Object.values(SKIN_PALETTES).map((s) => ({
          label: `${s.name} — ${s.priceRp === 0 ? "GRATIS" : `Rp${s.priceRp / 1_000_000} Jt`}`,
          description: s.desc,
          value: s.id,
        }))
      );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.reply({
      content:
        "🎨 **KATALOG TEMA KARTU USAHA KARSA (HIDDEN PREVIEW)**\nPilih tema di bawah untuk melihat pratinjau langsung Kartu Usahamu secara privat sebelum membeli:",
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
    await sendPortfolioView(interaction, uid, uname, reg.message);
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
    // Ephemeral guard: if the message is public, respond hidden; otherwise edit in-place.
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

  // Strict Ephemeral Registration Gate for all interactive buttons
  if (!hasUserAccount(uid)) {
    await interaction.reply(buildOnboardingPrompt());
    return;
  }

  // Discord Modal Popup: custom debt repayment amount
  if (id === CUSTOM_IDS.BTN_REPAY_MODAL_OPEN) {
    const user = getOrCreateUser(uid, uname);
    if (user.pinjol_debt <= 0) {
      await interaction.reply({
        content: "✅ **Lapakmu sudah bebas tunggakan!** Tidak ada tagihan segel yang perlu dibayar.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_IDS.MODAL_REPAY_DEBT)
      .setTitle("💸 Cicil / Lunasi Tagihan Segel");
    const amountInput = new TextInputBuilder()
      .setCustomId(CUSTOM_IDS.INPUT_REPAY_AMOUNT)
      .setLabel(`Nominal Bayar (Tunggakan: ${formatRpShort(user.pinjol_debt)})`)
      .setPlaceholder("Contoh: 2500000 — atau ketik 'semua'")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput));
    await interaction.showModal(modal);
    return;
  }

  if (id === CUSTOM_IDS.BTN_SHOP) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT_SKIN_PREVIEW)
      .setPlaceholder("👀 Pilih Tema Kartu Usaha untuk Pratinjau...")
      .addOptions(
        Object.values(SKIN_PALETTES).map((s) => ({
          label: `${s.name} — ${s.priceRp === 0 ? "GRATIS" : `Rp${s.priceRp / 1_000_000} Jt`}`,
          description: s.desc,
          value: s.id,
        }))
      );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.reply({
      content:
        "🎨 **KATALOG TEMA KARTU USAHA KARSA (HIDDEN PREVIEW)**\nPilih tema di bawah untuk melihat pratinjau langsung Kartu Usahamu secara privat sebelum membeli:",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_LEADERBOARD) {
    // In-place edit: transforms the dashboard in the same message.
    await interaction.deferUpdate();
    const leaders = getTopLeaderboard(5);
    const coop = getOrCreateServerCoop(guildId);
    const { event, nextChangeUnixSec } = getCurrentMarketEvent();
    const lbPng = renderLeaderboardCard(leaders, coop);
    const attachment = new AttachmentBuilder(lbPng, { name: "karsa-leaderboard.png" });
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`🏆 Papan Peringkat Pedagang KARSA — Pasar Sehat ${coop.eco_health}%`)
      .setDescription(
        `> **Cuaca Pasar:** ${event.title} *(berganti <t:${nextChangeUnixSec}:R>)*\n` +
          `> Kas Bersama Koperasi: **${formatRpShort(coop.pool_balance)}** • Gerobak Ditebus: **${coop.rescued_count} Warung**`
      )
      .setImage("attachment://karsa-leaderboard.png")
      .setFooter({ text: "KARSA • Klik 🔄 Segarkan untuk kembali ke Buku Kas" })
      .setTimestamp();
    await interaction.editReply({
      content: "",
      embeds: [embed],
      files: [attachment],
      components: [buildMainNavRow(false), buildSecondaryNavRow()],
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_DAILY) {
    const user = getOrCreateUser(uid, uname);
    const now = Date.now();
    if (user.last_daily_at > 0 && now - user.last_daily_at < DAILY_COOLDOWN_MS) {
      const readyUnix = Math.ceil((user.last_daily_at + DAILY_COOLDOWN_MS) / 1000);
      await interaction.reply({
        content: `⏳ **Uang Belanja Harian Belum Siap!**\nAmbil kembali **<t:${readyUnix}:R>** (<t:${readyUnix}:t>).`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    const res = claimDailyBonus(uid, uname);
    await sendPortfolioView(interaction, uid, uname, res.message);
    return;
  }

  if (id === CUSTOM_IDS.BTN_WORK_JUJUR || id === CUSTOM_IDS.BTN_WORK_CULAS || id === CUSTOM_IDS.BTN_WORK) {
    const userBefore = getOrCreateUser(uid, uname);
    const now = Date.now();
    if (userBefore.last_work_at > 0 && now - userBefore.last_work_at < WORK_COOLDOWN_MS) {
      const readyUnix = Math.ceil((userBefore.last_work_at + WORK_COOLDOWN_MS) / 1000);
      await interaction.reply({
        content: `⏳ **Dapur Masih Ngebul!**\nKloter berikutnya siap **<t:${readyUnix}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.deferUpdate();
    const choice = id === CUSTOM_IDS.BTN_WORK_CULAS ? "corrupt" : "ethical";
    const idxRaw = rawId.split(":")[1];
    const idx = idxRaw !== undefined ? Number(idxRaw) : undefined;
    const res = workShift(uid, uname, choice, Number.isFinite(idx) ? idx : undefined, { enforceCooldown: true });
    if (!res.ok) {
      await sendPortfolioView(interaction, uid, uname, res.message);
      return;
    }
    const sign = res.deltaRp >= 0 ? "+" : "-";
    const lvlMsg = res.leveledUp ? ` 🎉 **NAIK KE LEVEL ${res.user.level} (${res.user.job_title})!**` : "";
    const readyNextUnix = Math.ceil((Date.now() + WORK_COOLDOWN_MS) / 1000);
    const headline =
      `${res.busted ? "🚨 **KENA SIDAK PASAR!**" : "☕ **GILIRAN SEDUH SELESAI!**"} (${res.dilemma.title})${lvlMsg}\n` +
      `> ${res.message}\n` +
      `• Kas: **${sign}${formatRpShort(Math.abs(res.deltaRp))}** • Nama Baik: **${res.user.karma}/100** • Seduh lagi: <t:${readyNextUnix}:R>`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (id === CUSTOM_IDS.BTN_BISNIS) {
    const user = getOrCreateUser(uid, uname);
    const bizzes = getUserBusinesses(uid);
    const kedai = bizzes.find((b) => b.biz_type === "kedai_kopi");
    const brankas = bizzes.find((b) => b.biz_type === "brankas_darurat");
    const saham = bizzes.find((b) => b.biz_type === "saham_koperasi");
    const passiveTimer = buildCooldownTag(user.last_passive_at, PASSIVE_COOLDOWN_MS, "✅ Siap Dicairkan");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_CLAIM)
        .setLabel("💰 Cairkan Omzet")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_KEDAI)
        .setLabel(`☕ Upgrade Kedai (Lv.${(kedai?.level ?? 1) + 1})`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_BRANKAS)
        .setLabel(
          (brankas?.level ?? 0) === 0
            ? "🔒 Buka Tabungan Emas (Kedai Lv.2)"
            : `🛡️ Tambah Emas (Lv.${(brankas?.level ?? 0) + 1})`
        )
        .setStyle((kedai?.level ?? 1) >= 2 ? ButtonStyle.Secondary : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_SAHAM)
        .setLabel(
          (saham?.level ?? 0) === 0
            ? "🔒 Buka Saham Koperasi (Kedai Lv.3)"
            : `🤝 Tambah Saham (Lv.${(saham?.level ?? 0) + 1})`
        )
        .setStyle((kedai?.level ?? 1) >= 3 && user.karma >= 65 ? ButtonStyle.Secondary : ButtonStyle.Danger)
    );
    await interaction.reply({
      content:
        `🏪 **Panel Ekspansi & Setoran Usaha — ${user.username}**\n` +
        `• **Setoran Omzet:** ${passiveTimer} • **Kas Laci:** ${formatRpShort(user.balance)}`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_BISNIS_CLAIM) {
    const userBefore = getOrCreateUser(uid, uname);
    const now = Date.now();
    if (userBefore.last_passive_at > 0 && now - userBefore.last_passive_at < PASSIVE_COOLDOWN_MS) {
      const readyUnix = Math.ceil((userBefore.last_passive_at + PASSIVE_COOLDOWN_MS) / 1000);
      await interaction.reply({
        content: `⏳ **Setoran Omzet Belum Siap!**\nCairkan kembali **<t:${readyUnix}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const res = claimPassiveIncome(uid, uname, { enforceCooldown: true });
    if (!res.ok) {
      await interaction.reply({ content: res.reason!, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    const headline = `💰 **OMZET USAHA DICAIRKAN!**\n• Setoran Bersih: **+${formatRpShort(res.net)}** ${res.taxSaved ? "*(Potongan Sewa Ringan 5%)*" : "*(Potongan Sewa Pasar 20%)*"}`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (
    id === CUSTOM_IDS.BTN_BISNIS_KEDAI ||
    id === CUSTOM_IDS.BTN_BISNIS_BRANKAS ||
    id === CUSTOM_IDS.BTN_BISNIS_SAHAM
  ) {
    const btype =
      id === CUSTOM_IDS.BTN_BISNIS_KEDAI
        ? "kedai_kopi"
        : id === CUSTOM_IDS.BTN_BISNIS_BRANKAS
          ? "brankas_darurat"
          : "saham_koperasi";
    const res = buyOrUpgradeBusiness(uid, uname, btype);
    if (!res.ok) {
      // Hidden error so the public channel never gets cluttered.
      await interaction.reply({ content: `${res.reason}`, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    const headline = `🏪 **EKSPANSI USAHA BERHASIL!** Level naik ke **Lv.${res.nextLevel}** (+Omzet ${formatRpShort(res.yieldBoost || 0)}/hari)`;
    await sendPortfolioView(interaction, uid, uname, headline);
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

  if (id === CUSTOM_IDS.BTN_PINJOL_AMBIL || id === CUSTOM_IDS.BTN_JUDOL_SPIN || id === CUSTOM_IDS.BTN_JALAN_PINTAS) {
    await interaction.deferUpdate();
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
      .setTitle(`🚨 SURAT SEGEL LAPAK — ${uname}`)
      .setDescription(
        `> ${res.narrative}\n\n` +
          `• **Tunggakan Berjalan:** ${formatRpShort(res.totalDebt)}\n` +
          `• **Brankas Emas (Aman Kebal Sita):** ${formatRpShort(res.user.emergency_fund)}`
      )
      .setImage("attachment://surat-segel-lapak.png")
      .setFooter({ text: "KARSA • Segel dapat dibuka dengan mencicil atau ditebus koperasi" })
      .setTimestamp();
    const rescueRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_MODAL_OPEN)
        .setLabel("✍️ Ketik Cicilan")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
        .setLabel("💸 Bayar Semua")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Tebus via Koperasi")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Buku Kas")
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({
      content: "",
      embeds: [embed],
      files: [attachment],
      components: [rescueRow],
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_KOPERASI) {
    await interaction.deferUpdate();
    const coop = getOrCreateServerCoop(guildId);
    const coopPng = renderCoopCard(coop);
    const attachment = new AttachmentBuilder(coopPng, { name: "karsa-koperasi.png" });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🤝 Koperasi Pedagang KARSA — Pasar Sehat ${coop.eco_health}%`)
      .setDescription(
        `Kas Bersama Server **${formatRpShort(coop.pool_balance)}** • Level Pasar **Lv.${coop.eco_level}** • Warung Ditebus **${coop.rescued_count}**`
      )
      .setImage("attachment://karsa-koperasi.png")
      .setTimestamp();
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_PATUNGAN)
        .setLabel("🤝 Patungan Kas Rp 5 Jt (Lv.2+)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Tebus Gerobak Warga Rp 10 Jt")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Buku Kas")
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
    const headline = `🤝 **SETORAN KOPERASI BERHASIL!** Kamu menyetor **${formatRpShort(res.amount || 0)}** ke Kas Bersama Pasar!`;
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
        content: "⚠️ **Nominal tidak valid!** Masukkan angka rupiah (contoh: `2500000`) atau ketik `semua`.",
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

  const buyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.BTN_SKIN_BUY_PREFIX}${skinId}`)
      .setLabel(`💎 Pasang / Beli ${skin.name} (${skin.priceRp === 0 ? "GRATIS" : `Rp${skin.priceRp / 1_000_000} Jt`})`)
      .setStyle(ButtonStyle.Success)
  );

  await interaction.editReply({
    content: `👀 **PRATINJAU TEMA: ${skin.name}**\nBegini tampilan Kartu Usaha **${user.username}** jika memakai tema ini:`,
    files: [attachment],
    components: [buyRow],
  });
}
