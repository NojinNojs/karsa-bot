import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  buyOrUpgradeBusiness,
  COOP_PATUNGAN_COST_RP,
  COOP_RESCUE_COST_RP,
  claimDailyBonus,
  claimPassiveIncome,
  DAILY_COOLDOWN_MS,
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
  WORK_COOLDOWN_MS,
  workShift,
} from "../db/index.ts";
import { buildHelpEmbedsAndComponents, type GuideCategoryId } from "../game/guide.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { renderAzabCard, renderCoopCard, renderLeaderboardCard } from "../renderer/pixelCard.ts";
import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";
import { CUSTOM_IDS } from "./definitions.ts";
import { handleDevButtonInteraction } from "./devConsole.ts";
import {
  type BizType,
  buildBusinessPanelPayload,
  buildOnboardingPrompt,
  buildStateAwarePortfolioRows,
  buildWorkDilemmaPayload,
  sendPortfolioView,
} from "./uiBuilders.ts";

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const rawId = interaction.customId;
  const id = rawId.split(":")[0]!;
  const uid = interaction.user.id;
  const uname = interaction.user.username;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (await handleDevButtonInteraction(interaction, id, guildId)) {
    return;
  }

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

  // Ownership guard: prevent Player B from overwriting Player A's public portfolio card!
  // Exception: SOS rescue buttons (`karsa:koperasi:talangi:<targetId>`) are meant for other players to click.
  const isSosRescueClick = id === CUSTOM_IDS.BTN_KOPERASI_TALANGI && rawId.includes(":");
  const msgTitle = interaction.message?.embeds?.[0]?.title || "";
  if (
    !isSosRescueClick &&
    !interaction.message.flags.has(MessageFlags.Ephemeral) &&
    msgTitle.startsWith("🏪 ") &&
    !msgTitle.toLowerCase().startsWith(`🏪 ${uname.toLowerCase()} `)
  ) {
    await interaction.reply({
      content: `🔒 Ini kartu usaha milik warga lain! Ketik \`/portfolio\` untuk membuka kartu usahamu sendiri.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (id === CUSTOM_IDS.BTN_REPAY_MODAL_OPEN) {
    const user = getOrCreateUser(uid, uname);
    if (user.pinjol_debt <= 0) {
      await interaction.reply({
        content: "✅ Lapakmu sudah bebas tunggakan!",
        flags: MessageFlags.Ephemeral,
      });
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
        })),
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
    const res = workShift(uid, uname, choice, Number.isFinite(idx) ? idx : undefined, {
      enforceCooldown: true,
    });
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
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
      await interaction.editReply(buildBusinessPanelPayload(user, businesses, undefined, guildId));
    } else {
      await interaction.deferUpdate();
      await interaction.editReply({
        content: "",
        files: [],
        ...buildBusinessPanelPayload(user, businesses, undefined, guildId),
      });
    }
    return;
  }

  if (id === CUSTOM_IDS.BTN_BISNIS_CLAIM) {
    const res = claimPassiveIncome(uid, uname, { enforceCooldown: true, guildId });
    if (!res.ok) {
      await interaction.reply({ content: res.reason!, flags: MessageFlags.Ephemeral });
      return;
    }
    const businesses = getUserBusinesses(uid);
    const headline = `💰 **Omzet Cair +${formatRpShort(res.net)}!** ${res.taxSaved ? "*(Sewa 5%)*" : "*(Sewa 20%)*"}`;
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
      await interaction.editReply(buildBusinessPanelPayload(res.user, businesses, headline, guildId));
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
      await interaction.editReply(buildBusinessPanelPayload(res.user, businesses, headline, guildId));
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
        .setStyle(ButtonStyle.Danger),
    );
    await interaction.reply({
      content: `⚡ **Fasilitas Belakang Pasar** — tunggakan mencapai **Rp 2Jt** menyegel lapakmu. Laci Kas: **${formatRpShort(user.balance)}** *(Tabungan Emas ${formatRpShort(user.emergency_fund)} kebal sita)*`,
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
          `Kasmu sekarang: **${formatRpShort(res.user.balance)}**`,
      )
      .setImage("attachment://surat-segel-lapak.png");
    const canPay = res.user.balance > 0;
    const rescueRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_WORK)
        .setLabel("☕ Seduh Cari Uang")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
        .setLabel("💸 Bayar Segel")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canPay),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Buku Kas")
        .setStyle(ButtonStyle.Secondary),
    );
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.reply({ embeds: [embed], files: [attachment], components: [rescueRow] });
    } else {
      await interaction.deferUpdate();
      await interaction.editReply({
        content: "",
        embeds: [embed],
        files: [attachment],
        components: [rescueRow],
      });
    }
    return;
  }

  if (id === CUSTOM_IDS.BTN_KOPERASI) {
    await interaction.deferUpdate();
    const user = getOrCreateUser(uid, uname);
    const coop = getOrCreateServerCoop(guildId);
    const canPatungan = user.level >= 2 && user.pinjol_debt === 0 && user.balance >= COOP_PATUNGAN_COST_RP;
    const canRescue = user.pinjol_debt === 0 && user.balance >= COOP_RESCUE_COST_RP;
    const marketBonusPct = Math.max(0, coop.eco_level - 1) * 5;

    const coopPng = renderCoopCard(coop);
    const attachment = new AttachmentBuilder(coopPng, { name: "karsa-koperasi.png" });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🤝 Koperasi Pasar Lv.${coop.eco_level} • Kas ${formatRpShort(coop.pool_balance)}`)
      .setDescription(
        `Kasmu **${formatRpShort(user.balance)}**  •  Warung Ditebus **${coop.rescued_count}**  •  Bonus Pasar **+${marketBonusPct}% Omzet**`,
      )
      .setImage("attachment://karsa-koperasi.png");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_PATUNGAN)
        .setLabel(
          user.level < 2
            ? "🔒 Patungan (Butuh Lv.2)"
            : `🤝 Patungan (${formatRpShort(COOP_PATUNGAN_COST_RP)})`,
        )
        .setStyle(canPatungan ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canPatungan),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel(`🛟 Tebus Warga (${formatRpShort(COOP_RESCUE_COST_RP)})`)
        .setStyle(canRescue ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canRescue),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH)
        .setLabel("🪪 Kartu Usaha")
        .setStyle(ButtonStyle.Secondary),
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
    const targetUserId = rawId.split(":")[1];
    const caller = getOrCreateUser(uid, uname);

    // If an indebted player clicks "🛟 Minta Tebus Warga" on their own sealed dashboard, post an SOS button for the server!
    if (
      act === "rescue" &&
      !targetUserId &&
      (caller.is_seized === 1 || caller.pinjol_debt > 0) &&
      caller.balance < COOP_RESCUE_COST_RP
    ) {
      const sosRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.BTN_KOPERASI_TALANGI}:${uid}`)
          .setLabel(`🛟 Tebus Lapak ${uname} (${formatRpShort(COOP_RESCUE_COST_RP)})`)
          .setStyle(ButtonStyle.Success),
      );
      await interaction.reply({
        content:
          `📢 **S.O.S. WARGA PASAR!** Lapak milik **${uname}** sedang disegel (Tunggakan **${formatRpShort(caller.pinjol_debt)}**).\n` +
          `Warga yang membantu menebus mendapat **+25 Nama Baik, +2 💎 Permata, & Gelar Penebus Warga**!`,
        components: [sosRow],
      });
      return;
    }

    const res = investOrRescueCoop(uid, uname, act, guildId, targetUserId);
    if (!res.ok) {
      await interaction.reply({ content: `${res.message}`, flags: MessageFlags.Ephemeral });
      return;
    }
    if (act === "rescue" && targetUserId) {
      await interaction.deferUpdate();
      const doneRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("sos_done")
          .setLabel(`✅ Ditebus oleh ${uname}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );
      await interaction.editReply({
        content: `🎉 **SEGEL LAPAK BERHASIL DITEBUS!** Lapak milik **@${res.rescuedUsername || "Warga"}** telah dibebaskan oleh **@${uname}** (+25 Nama Baik & +2 💎)!`,
        components: [doneRow],
      });
      return;
    }
    await interaction.deferUpdate();
    const headline =
      act === "patungan"
        ? `🤝 **Patungan +${formatRpShort(res.amount || 0)} Berhasil!** (Kas Koperasi: ${formatRpShort(res.coop.pool_balance)})`
        : `🛟 **Lapak ${res.rescuedUsername ? `@${res.rescuedUsername}` : "Warga"} Berhasil Ditebus!** (+25 Nama Baik, +2 💎)`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return;
  }

  if (rawId.startsWith(CUSTOM_IDS.BTN_SKIN_BUY_PREFIX)) {
    const rest = rawId.replace(CUSTOM_IDS.BTN_SKIN_BUY_PREFIX, "");
    const [skinPart, modePart] = rest.split(":");
    const skinId = (skinPart || "retro_gold") as SkinId;
    const payWith = modePart === "gems" ? "gems" : "rp";
    const res = equipOrBuySkin(uid, uname, skinId, payWith);
    if (!res.ok) {
      await interaction.reply({ content: `🎨 ${res.message}`, flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
      await interaction.editReply({ content: `🎨 ${res.message}`, components: [] });
    } else {
      await interaction.deferUpdate();
      await sendPortfolioView(interaction, uid, uname, `🎨 ${res.message}`);
    }
    return;
  }

  if (id === CUSTOM_IDS.BTN_PORTFOLIO_REFRESH) {
    await interaction.deferUpdate();
    await sendPortfolioView(interaction, uid, uname);
  }
}
