import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import {
  COOP_PATUNGAN_COST_RP,
  COOP_RESCUE_COST_RP,
  claimDailyBonus,
  DAILY_COOLDOWN_MS,
  getOrCreateServerCoop,
  getOrCreateUser,
  getTopLeaderboard,
  getUserBusinesses,
  hasUserAccount,
  registerNewUser,
  WORK_COOLDOWN_MS,
} from "../db/index.ts";
import { buildHelpEmbedsAndComponents } from "../game/guide.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { renderCoopCard, renderLeaderboardCard } from "../renderer/pixelCard.ts";
import { SKIN_PALETTES } from "../renderer/sprites.ts";
import { CUSTOM_IDS } from "./definitions.ts";
import { buildDevConsolePayload, isDeveloperUser } from "./devConsole.ts";
import {
  buildBusinessPanelPayload,
  buildOnboardingPrompt,
  buildWorkDilemmaPayload,
  sendPortfolioView,
} from "./uiBuilders.ts";

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
        .setStyle(ButtonStyle.Primary),
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
    if (
      (commandName === "portfolio" || commandName === "card") &&
      targetOpt &&
      hasUserAccount(targetOpt.id)
    ) {
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
    const guildId = interaction.guildId || "global_kota_mandiri";
    const user = getOrCreateUser(uid, uname);
    const businesses = getUserBusinesses(uid);
    await interaction.reply({
      ...buildBusinessPanelPayload(user, businesses, undefined, guildId),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "jalan-pintas") {
    const user = getOrCreateUser(uid, uname);
    const hasDebt = user.pinjol_debt > 0;
    const hasLiquid = user.balance > 0;
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
        .setDisabled(user.is_seized === 1),
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
          .setDisabled(!hasLiquid),
      );
    }
    await interaction.reply({
      content: hasDebt
        ? `🚨 **Tunggakan Segel: ${formatRpShort(user.pinjol_debt)}** • Laci Kas: **${formatRpShort(user.balance)}** *(Tabungan Emas ${formatRpShort(user.emergency_fund)} aman)*`
        : `⚡ **Talangan Kilat & Meja Belakang** — tunggakan mencapai **Rp 2Jt** otomatis menyegel lapak.`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "koperasi") {
    const guildId = interaction.guildId || "global_kota_mandiri";
    const user = getOrCreateUser(uid, uname);
    const coop = getOrCreateServerCoop(guildId);
    const canPatungan = user.level >= 2 && user.pinjol_debt === 0 && user.balance >= COOP_PATUNGAN_COST_RP;
    const canRescue = user.pinjol_debt === 0 && user.balance >= COOP_RESCUE_COST_RP;
    const marketBonusPct = Math.max(0, coop.eco_level - 1) * 5;

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
    const coopPng = renderCoopCard(coop);
    const attachment = new AttachmentBuilder(coopPng, { name: "karsa-koperasi.png" });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🤝 Koperasi Pasar Lv.${coop.eco_level} • Kas ${formatRpShort(coop.pool_balance)}`)
      .setDescription(
        `Kasmu **${formatRpShort(user.balance)}**  •  Warung Ditebus **${coop.rescued_count}**  •  Bonus Pasar **+${marketBonusPct}% Omzet**`,
      )
      .setImage("attachment://karsa-koperasi.png");
    await interaction.reply({
      embeds: [embed],
      files: [attachment],
      components: [row],
    });
    return;
  }

  if (commandName === "shop") {
    if (
      interaction.user.id &&
      (getOrCreateUser(uid, uname).is_seized === 1 || getOrCreateUser(uid, uname).pinjol_debt > 0)
    ) {
      await interaction.reply({
        content:
          "🔒 **Toko tema terkunci** selama lapak masih disegel / punya tunggakan. Lunasi dulu di `/jalan-pintas`.",
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
          label: `${s.name} (${s.priceRp === 0 ? "GRATIS" : `${formatRpShort(s.priceRp)} / ${s.priceGems}💎`})`,
          description: s.desc,
          value: s.id,
        })),
      );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.reply({
      content: `🎨 **Pilih tema kartu usaha** (Kasmu: **${formatRpShort(user.balance)}** • Permata: **${user.gems} 💎**):`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (commandName === "dev") {
    if (!isDeveloperUser(interaction)) {
      await interaction.reply({
        content: "⛔ **Akses Ditolak:** Panel `/dev` khusus untuk Developer & Pemilik Server KARSA.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const guildId = interaction.guildId || "global_kota_mandiri";
    const wsPing = Math.max(1, Math.round(interaction.client.ws.ping || 42));
    await interaction.reply({
      ...buildDevConsolePayload(guildId, wsPing),
      flags: MessageFlags.Ephemeral,
    });
  }
}
