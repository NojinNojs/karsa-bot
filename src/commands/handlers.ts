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
  hasUserAccount,
  investOrRescueCoop,
  registerNewUser,
  repayPinjolDebt,
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
import { WORK_DILEMMAS, formatRpShort } from "../game/mechanics.ts";
import { buildHelpEmbedsAndComponents, type GuideCategoryId } from "../game/guide.ts";

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
        .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
        .setLabel("💸 Bayar Tagihan Segel")
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
  const attachment = new AttachmentBuilder(pngBuffer, { name: "karsa-portfolio.png" });

  const content =
    headline ||
    `🪪 **Buku Kas & Kartu Usaha — ${user.username} (Lv.${user.level} ${user.job_title})**\n` +
      `Kas Laci: **${formatRpShort(user.balance)}** • Brankas Emas: **${formatRpShort(user.emergency_fund)}** • Nama Baik: **${user.karma}/100**` +
      (user.pinjol_debt > 0 ? ` • 🚨 **Tunggakan: ${formatRpShort(user.pinjol_debt)}**` : "");

  const components = [buildMainNavRow(user.pinjol_debt > 0), buildSecondaryNavRow()];
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content, files: [attachment], components });
  } else {
    await interaction.reply({ content, files: [attachment], components });
  }
}

export async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;
  const uid = interaction.user.id;
  const uname = interaction.user.username;

  if (commandName === "help") {
    await interaction.reply(buildHelpEmbedsAndComponents("dasar"));
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
    await interaction.editReply({
      content: `🏆 **PAPAN PERINGKAT PEDAGANG KARSA • PASAR SEHAT ${coop.eco_health}%**`,
      files: [attachment],
      components: [buildMainNavRow(false), buildSecondaryNavRow()],
    });
    return;
  }

  // Strict Registration Gate for all gameplay commands
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
    await interaction.deferReply();
    const res = claimDailyBonus(uid, uname);
    await sendPortfolioView(interaction, uid, uname, res.message);
    return;
  }

  if (commandName === "work") {
    const d = WORK_DILEMMAS[Math.floor(Math.random() * WORK_DILEMMAS.length)]!;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_WORK_JUJUR)
        .setLabel(`✅ ${d.ethicalChoice.label} (+Nama Baik)`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_WORK_CULAS)
        .setLabel(`⚠️ ${d.corruptChoice.label} (Risiko Sidak)`)
        .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
      content: `☕ **Giliran Seduh: ${d.title}**\n> ${d.context}\n\nPilih takaran bahan & pembukuan lapakmu:`,
      components: [row],
    });
    return;
  }

  if (commandName === "bisnis") {
    const user = getOrCreateUser(uid, uname);
    const bizzes = getUserBusinesses(uid);
    const kedai = bizzes.find((b) => b.biz_type === "kedai_kopi");
    const brankas = bizzes.find((b) => b.biz_type === "brankas_darurat");
    const saham = bizzes.find((b) => b.biz_type === "saham_koperasi");

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
            ? "🔒 Buka Tabungan Emas (Syarat: Kedai Lv.2)"
            : `🛡️ Tambah Tabungan Emas (Lv.${(brankas?.level ?? 0) + 1})`
        )
        .setStyle((kedai?.level ?? 1) >= 2 ? ButtonStyle.Secondary : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_BISNIS_SAHAM)
        .setLabel(
          (saham?.level ?? 0) === 0
            ? "🔒 Buka Saham Koperasi (Syarat: Kedai Lv.3)"
            : `🤝 Tambah Saham Koperasi (Lv.${(saham?.level ?? 0) + 1})`
        )
        .setStyle((kedai?.level ?? 1) >= 3 && user.karma >= 65 ? ButtonStyle.Secondary : ButtonStyle.Danger)
    );
    await interaction.reply({
      content:
        `🏪 **Manajemen Unit Usaha — ${user.username}**\n` +
        `• **Kedai Kopi Karsa:** Lv.${kedai?.level ?? 1} *(Terbuka)*\n` +
        `• **Tabungan Emas (Kebal Sita):** ${(brankas?.level ?? 0) > 0 ? `Lv.${brankas?.level}` : "🔒 Terkunci (Butuh Kedai Kopi Lv.2)"}\n` +
        `• **Koperasi Warga:** ${(saham?.level ?? 0) > 0 ? `Lv.${saham?.level}` : "🔒 Terkunci (Butuh Kedai Kopi Lv.3 & Nama Baik ≥ 65)"}`,
      components: [row],
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
          .setLabel(`💸 Bayar / Lunasi Tagihan (${formatRpShort(user.pinjol_debt)})`)
          .setStyle(ButtonStyle.Success)
      );
    }
    await interaction.reply({
      content:
        `⚡ **Meja Talangan Kilat & Belakang Pasar**\n` +
        (user.pinjol_debt > 0
          ? `🚨 **Status Lapak Disegel:** Kamu memiliki tunggakan aktif sebesar **${formatRpShort(user.pinjol_debt)}**. Klik **💸 Bayar / Lunasi Tagihan** untuk mencicil atau membuka segel lapak!`
          : `Pencairan talangan kilat mengenakan bunga majemuk 8%/hari dan menyegel unit usaha jika melewati batas tunggakan Rp 20 Juta.`),
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
        .setLabel("🤝 Patungan Kas Rp 5 Jt (Syarat: Lv.2+)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Tebus Gerobak Warga Rp 10 Jt (+20 Reputasi & +1 Gem)")
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
        "🎨 **KATALOG TEMA KARTU USAHA KARSA**\nPilih tema di bawah untuk melihat pratinjau langsung Kartu Usahamu sebelum membeli:",
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

  if (id === CUSTOM_IDS.BTN_START_LAPAK) {
    await interaction.deferReply();
    const reg = registerNewUser(uid, uname);
    await sendPortfolioView(interaction, uid, uname, reg.message);
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

  if (id === CUSTOM_IDS.BTN_LEADERBOARD) {
    await interaction.deferReply();
    const leaders = getTopLeaderboard(5);
    const coop = getOrCreateServerCoop(guildId);
    const lbPng = renderLeaderboardCard(leaders, coop);
    const attachment = new AttachmentBuilder(lbPng, { name: "karsa-leaderboard.png" });
    await interaction.editReply({
      content: `🏆 **PAPAN PERINGKAT PEDAGANG KARSA • PASAR SEHAT ${coop.eco_health}%**`,
      files: [attachment],
      components: [buildMainNavRow(false), buildSecondaryNavRow()],
    });
    return;
  }

  // Strict Registration Gate for all interactive buttons
  if (!hasUserAccount(uid)) {
    await interaction.reply(buildOnboardingPrompt());
    return;
  }

  if (id === CUSTOM_IDS.BTN_DAILY) {
    await interaction.deferReply();
    const res = claimDailyBonus(uid, uname);
    await sendPortfolioView(interaction, uid, uname, res.message);
    return;
  }

  if (id === CUSTOM_IDS.BTN_WORK_JUJUR || id === CUSTOM_IDS.BTN_WORK_CULAS || id === CUSTOM_IDS.BTN_WORK) {
    await interaction.deferReply();
    const choice = id === CUSTOM_IDS.BTN_WORK_CULAS ? "corrupt" : "ethical";
    const res = workShift(uid, uname, choice, undefined, { enforceCooldown: true });
    if (!res.ok) {
      await sendPortfolioView(interaction, uid, uname, res.message);
      return;
    }
    const sign = res.deltaRp >= 0 ? "+" : "-";
    const lvlMsg = res.leveledUp ? ` 🎉 **NAIK KE LEVEL ${res.user.level} (${res.user.job_title})!**` : "";
    const headline =
      `${res.busted ? "🚨 **KENA SIDAK PASAR!**" : "☕ **GILIRAN SEDUH SELESAI!**"} (${res.dilemma.title})${lvlMsg}\n` +
      `> ${res.message}\n` +
      `• Perubahan Kas: **${sign}${formatRpShort(Math.abs(res.deltaRp))}** | Nama Baik: **${res.user.karma}/100** | XP: **${res.user.xp}**`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (id === CUSTOM_IDS.BTN_BISNIS_CLAIM || id === CUSTOM_IDS.BTN_BISNIS) {
    await interaction.deferReply();
    const res = claimPassiveIncome(uid, uname, { enforceCooldown: true });
    const headline = res.ok
      ? `💰 **OMZET USAHA DICAIRKAN!**\n• Setoran Bersih: **+${formatRpShort(res.net)}** ${res.taxSaved ? "*(Potongan Sewa Ringan 5%)*" : "*(Potongan Sewa Pasar 20%)*"}`
      : res.reason!;
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
      ? `🏪 **EKSPANSI USAHA BERHASIL!** Level naik ke **Lv.${res.nextLevel}** (+Omzet ${formatRpShort(res.yieldBoost || 0)}/hari)`
      : `${res.reason}`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (id === CUSTOM_IDS.BTN_REPAY_DEBT || id === CUSTOM_IDS.BTN_PINJOL_LUNASI) {
    await interaction.deferReply();
    const res = repayPinjolDebt(uid, uname);
    await sendPortfolioView(interaction, uid, uname, res.message);
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
    const attachment = new AttachmentBuilder(azabPng, { name: "surat-segel-lapak.png" });
    const rescueRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
        .setLabel("💸 Cicil / Lunasi Tagihan Sendiri")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel("🛟 Tebus via Koperasi (Rp 10 Jt)")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Lihat Buku Kas")
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({
      content: `🚨 **SURAT SEGEL LAPAK DITERBITKAN!**\n> ${res.narrative}`,
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
      ? `🤝 **SETORAN KOPERASI BERHASIL!** Kamu menyetor **${formatRpShort(res.amount || 0)}** ke Kas Bersama Pasar!`
      : `${res.message}`;
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
