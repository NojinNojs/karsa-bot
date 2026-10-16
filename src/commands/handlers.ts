import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { CUSTOM_IDS } from "./definitions.ts";
import {
  buyOrUpgradeBusiness,
  claimDailyBonus,
  claimPassiveIncome,
  equipOrBuySkin,
  getOrCreateServerCoop,
  getOrCreateUser,
  getTopLeaderboard,
  getUserBusinesses,
  investOrRescueCoop,
  takeShortcutGambleOrPinjol,
  workShift,
} from "../db/index.ts";
import {
  renderAzabCard,
  renderCoopCard,
  renderLeaderboardCard,
  renderPortfolioCard,
} from "../renderer/pixelCard.ts";
import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";
import { WORK_DILEMMAS } from "../game/mechanics.ts";
import { buildHelpEmbedsAndComponents, type GuideCategoryId } from "../game/guide.ts";

function buildMainNavRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_WORK).setLabel("💼 Kerja").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_BISNIS).setLabel("🏪 Aset & Bisnis").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_KOPERASI).setLabel("🤝 Koperasi").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_SHOP).setLabel("🎨 Toko Skin").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_JALAN_PINTAS).setLabel("⚠️ Jalan Pintas").setStyle(ButtonStyle.Danger)
  );
}

function buildSecondaryNavRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_HELP).setLabel("📖 Panduan").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DAILY).setLabel("☀️ Modal Harian").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_LEADERBOARD).setLabel("🏆 Peringkat").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH).setLabel("🔄 Segarkan Kartu").setStyle(ButtonStyle.Secondary)
  );
}

export async function sendPortfolioView(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  targetId = interaction.user.id,
  targetName = interaction.user.username,
  headline?: string
) {
  const guildId = interaction.guildId || "global_kota_mandiri";
  const user = getOrCreateUser(targetId, targetName);
  const businesses = getUserBusinesses(targetId);
  const coop = getOrCreateServerCoop(guildId);
  const pngBuffer = renderPortfolioCard({ user, businesses, coop });
  const attachment = new AttachmentBuilder(pngBuffer, { name: "kota-mandiri-portfolio.png" });

  const content =
    headline ||
    `🏙️ **KTP & Portofolio Warga Kota Mandiri — ${user.username}**\nSkin Aktif: \`${SKIN_PALETTES[user.skin_id]?.name || "Retro Arcade Gold"}\` • Skor Karma: **${user.karma}/100**`;

  const components = [buildMainNavRow(), buildSecondaryNavRow()];
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content, files: [attachment], components });
  } else {
    await interaction.reply({ content, files: [attachment], components });
  }
}

export async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;

  if (commandName === "start" || commandName === "portfolio" || commandName === "card") {
    await interaction.deferReply();
    const target = interaction.options.getUser("warga") || interaction.user;
    const msg =
      commandName === "start"
        ? `🎉 **Selamat datang di Kota Mandiri, ${target.username}!**\nModal usaha awal, **Kedai Kopi Lokal**, **Brankas Dana Darurat**, dan **Saham Koperasi** sudah aktif di kartumu:`
        : undefined;
    await sendPortfolioView(interaction, target.id, target.username, msg);
    return;
  }

  if (commandName === "help") {
    await interaction.reply(buildHelpEmbedsAndComponents("dasar"));
    return;
  }

  if (commandName === "daily") {
    await interaction.deferReply();
    const res = claimDailyBonus(interaction.user.id, interaction.user.username);
    await sendPortfolioView(interaction, interaction.user.id, interaction.user.username, res.message);
    return;
  }

  if (commandName === "leaderboard") {
    await interaction.deferReply();
    const guildId = interaction.guildId || "global_kota_mandiri";
    const leaders = getTopLeaderboard(5);
    const coop = getOrCreateServerCoop(guildId);
    const lbPng = renderLeaderboardCard(leaders, coop);
    const attachment = new AttachmentBuilder(lbPng, { name: "karsa-leaderboard.png" });
    await interaction.editReply({
      content: `🏆 **PAPAN PERINGKAT PEDAGANG KARSA • KOPERASI SEHAT ${coop.eco_health}%**`,
      files: [attachment],
      components: [buildMainNavRow(), buildSecondaryNavRow()],
    });
    return;
  }

  if (commandName === "work") {
    const d = WORK_DILEMMAS[Math.floor(Math.random() * WORK_DILEMMAS.length)]!;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_WORK_JUJUR)
        .setLabel(`✅ ${d.ethicalChoice.label} (+Karma)`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_WORK_CULAS)
        .setLabel(`😈 ${d.corruptChoice.label} (Risiko Audit)`)
        .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
      content: `💼 **Dilema Harian: ${d.title}**\n> ${d.context}\n\nPilih keputusan bisnismu hari ini:`,
      components: [row],
    });
    return;
  }

  if (commandName === "bisnis") {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_BISNIS_CLAIM).setLabel("💰 Klaim Hasil Bisnis Harian").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_BISNIS_KEDAI).setLabel("☕ Upgrade Kedai Kopi").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_BISNIS_BRANKAS).setLabel("🛡️ Tambah Brankas Darurat").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_BISNIS_SAHAM).setLabel("🤝 Tambah Saham Koperasi").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({
      content: "🏪 **Manajemen Aset & Bisnis Etis Kota Mandiri**\nPilih aksi untuk mengembangkan portofolio sehatmu:",
      components: [row],
    });
    return;
  }

  if (commandName === "jalan-pintas") {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PINJOL_AMBIL)
        .setLabel("💸 Ambil Pinjol Ilegal 'CairKilat99' (Bunga 8%/Hari)")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_JUDOL_SPIN)
        .setLabel("🎰 Depo Slot Gelap (RTP Bandar 98% Rungkad)")
        .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
      content:
        "⚠️ **ZONA JALAN PINTAS & GODAAN INSTAN**\nTidak ada ceramah di sini — kamu bebas mencoba. Tapi ingat hukum matematika: bunga pinjol ilegal dan algoritma slot gelap dirancang untuk menguras habis asetmu!",
      components: [row],
    });
    return;
  }

  if (commandName === "koperasi") {
    const guildId = interaction.guildId || "global_kota_mandiri";
    const coop = getOrCreateServerCoop(guildId);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_PATUNGAN)
        .setLabel("🤝 Patungan Koperasi Rp5 Jt (+Dividen & Karma)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Talangi Utang Pinjol Warga Rp10 Jt (+20 Karma & +1 Gem)")
        .setStyle(ButtonStyle.Primary)
    );
    const coopPng = renderCoopCard(coop);
    const attachment = new AttachmentBuilder(coopPng, { name: "karsa-koperasi.png" });
    await interaction.reply({
      content: `🤝 **KOPERASI PEDAGANG KARSA • PASAR SEHAT ${coop.eco_health}%**`,
      files: [attachment],
      components: [row],
    });
    return;
  }

  if (commandName === "shop") {
    const select = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT_SKIN_PREVIEW)
      .setPlaceholder("👀 Pilih Skin 16-Bit untuk Live Preview atas namamu...")
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
        "🎨 **TOKO SKIN KARTU 16-BIT (EPHEMERAL LIVE PREVIEW)**\nPilih skin di bawah untuk melihat kartu portofolio **atas namamu sendiri** sebelum membeli!",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const id = interaction.customId;
  const uid = interaction.user.id;
  const uname = interaction.user.username;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (id === CUSTOM_IDS.BTN_DAILY) {
    await interaction.deferReply();
    const res = claimDailyBonus(uid, uname);
    await sendPortfolioView(interaction, uid, uname, res.message);
    return;
  }

  if (id === CUSTOM_IDS.BTN_LEADERBOARD) {
    await interaction.deferReply();
    const leaders = getTopLeaderboard(5);
    const coop = getOrCreateServerCoop(guildId);
    const lbPng = renderLeaderboardCard(leaders, coop);
    const attachment = new AttachmentBuilder(lbPng, { name: "karsa-leaderboard.png" });
    await interaction.editReply({
      content: `🏆 **PAPAN PERINGKAT PEDAGANG KARSA • KOPERASI SEHAT ${coop.eco_health}%**`,
      files: [attachment],
      components: [buildMainNavRow(), buildSecondaryNavRow()],
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_HELP) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.editReply(buildHelpEmbedsAndComponents("dasar"));
    return;
  }

  if (
    id === CUSTOM_IDS.BTN_HELP_DASAR ||
    id === CUSTOM_IDS.BTN_HELP_USAHA ||
    id === CUSTOM_IDS.BTN_HELP_KOPERASI ||
    id === CUSTOM_IDS.BTN_HELP_BAHAYA
  ) {
    await interaction.deferUpdate();
    const cat: GuideCategoryId =
      id === CUSTOM_IDS.BTN_HELP_USAHA
        ? "usaha"
        : id === CUSTOM_IDS.BTN_HELP_KOPERASI
          ? "koperasi"
          : id === CUSTOM_IDS.BTN_HELP_BAHAYA
            ? "bahaya"
            : "dasar";
    await interaction.editReply(buildHelpEmbedsAndComponents(cat));
    return;
  }

  if (id === CUSTOM_IDS.BTN_WORK_JUJUR || id === CUSTOM_IDS.BTN_WORK_CULAS || id === CUSTOM_IDS.BTN_WORK) {
    await interaction.deferReply();
    const choice = id === CUSTOM_IDS.BTN_WORK_CULAS ? "corrupt" : "ethical";
    const res = workShift(uid, uname, choice);
    const sign = res.deltaRp >= 0 ? "+" : "-";
    const headline = `${res.busted ? "🚨 **TERCIDUK AUDIT!**" : "✅ **SHIFT KERJA SELESAI!**"} (${res.dilemma.title})\n> ${res.message}\n• Perubahan Saldo: **${sign}Rp${(Math.abs(res.deltaRp) / 1_000_000).toFixed(2)} Juta** | Karma: **${res.user.karma}/100**`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (id === CUSTOM_IDS.BTN_BISNIS_CLAIM || id === CUSTOM_IDS.BTN_BISNIS) {
    await interaction.deferReply();
    const res = claimPassiveIncome(uid, uname);
    const headline = `💰 **KLAIM DIVIDEN & HASIL BISNIS HARIAN!**\n• Pendapatan Bersih: **+Rp${(res.net / 1_000_000).toFixed(2)} Juta** ${res.taxSaved ? "*(Diskon Pajak Jujur -15% Aktif!)*" : ""}`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (
    id === CUSTOM_IDS.BTN_BISNIS_KEDAI ||
    id === CUSTOM_IDS.BTN_BISNIS_BRANKAS ||
    id === CUSTOM_IDS.BTN_BISNIS_SAHAM
  ) {
    await interaction.deferReply();
    const btype =
      id === CUSTOM_IDS.BTN_BISNIS_KEDAI
        ? "kedai_kopi"
        : id === CUSTOM_IDS.BTN_BISNIS_BRANKAS
          ? "brankas_darurat"
          : "saham_koperasi";
    const res = buyOrUpgradeBusiness(uid, uname, btype);
    const headline = res.ok
      ? `🏪 **UPGRADE ASET BERHASIL!** Level naik ke **Lv.${res.nextLevel}** (+Yield Rp${((res.yieldBoost || 0) / 1000).toLocaleString("id-ID")}K/hari)`
      : `⚠️ ${res.reason}`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (id === CUSTOM_IDS.BTN_PINJOL_AMBIL || id === CUSTOM_IDS.BTN_JUDOL_SPIN || id === CUSTOM_IDS.BTN_JALAN_PINTAS) {
    await interaction.deferReply();
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
    const attachment = new AttachmentBuilder(azabPng, { name: "surat-sita-azab.png" });
    const rescueRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Talangi & Tobat lewat Koperasi")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Lihat Kartu Portofolio")
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({
      content: `🚨 **PENGUMUMAN SITA ASET KOTA MANDIRI!**\n> ${res.narrative}`,
      files: [attachment],
      components: [rescueRow],
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_KOPERASI_PATUNGAN || id === CUSTOM_IDS.BTN_KOPERASI_TALANGI || id === CUSTOM_IDS.BTN_KOPERASI) {
    await interaction.deferReply();
    const act = id === CUSTOM_IDS.BTN_KOPERASI_PATUNGAN ? "patungan" : "rescue";
    const res = investOrRescueCoop(uid, uname, act, guildId);
    const headline = res.ok
      ? `🤝 **AKSI KOPERASI BERHASIL!** Kamu berkontribusi **Rp${((res.amount || 0) / 1_000_000).toFixed(0)} Juta** untuk ketahanan ekonomi warga server!`
      : `⚠️ ${res.message}`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (id.startsWith(CUSTOM_IDS.BTN_SKIN_BUY_PREFIX)) {
    await interaction.deferReply();
    const skinId = id.replace(CUSTOM_IDS.BTN_SKIN_BUY_PREFIX, "") as SkinId;
    const res = equipOrBuySkin(uid, uname, skinId);
    await sendPortfolioView(interaction, uid, uname, `🎨 ${res.message}`);
    return;
  }

  if (id === CUSTOM_IDS.BTN_PORTFOLIO_REFRESH || id === CUSTOM_IDS.BTN_SHOP) {
    await interaction.deferReply();
    await sendPortfolioView(interaction, uid, uname);
  }
}

export async function handleStringSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
  if (interaction.customId !== CUSTOM_IDS.SELECT_SKIN_PREVIEW) return;
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
    content: `👀 **LIVE PREVIEW SKIN: ${skin.name}**\nBegini tampilan kartu portofolio **${user.username}** jika memakai skin ini:`,
    files: [attachment],
    components: [buyRow],
  });
}
