import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getOrCreateUser, repayPinjolDebt, takeShortcutGambleOrPinjol } from "../db/index.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { renderAzabCard } from "../renderer/pixelCard.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { sendPortfolioView } from "./uiBuilders.ts";

export async function handleDebtButtons(interaction: ButtonInteraction, id: string): Promise<boolean> {
  const { id: uid, username: uname } = interaction.user;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (id === CUSTOM_IDS.BTN_REPAY_MODAL_OPEN) {
    const user = getOrCreateUser(uid, uname);
    if (user.pinjol_debt <= 0) {
      await interaction.reply({ content: "✅ Lapakmu sudah bebas tunggakan!", flags: MessageFlags.Ephemeral });
      return true;
    }
    const modal = new ModalBuilder().setCustomId(CUSTOM_IDS.MODAL_REPAY_DEBT).setTitle("💸 Cicil / Lunasi Tagihan Segel");
    const input = new TextInputBuilder()
      .setCustomId(CUSTOM_IDS.INPUT_REPAY_AMOUNT)
      .setLabel(`Nominal (Tunggakan: ${formatRpShort(user.pinjol_debt)})`)
      .setPlaceholder("Contoh: 500000 atau ketik 'semua'")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
    await interaction.showModal(modal);
    return true;
  }
  if (id === CUSTOM_IDS.BTN_REPAY_DEBT || id === CUSTOM_IDS.BTN_PINJOL_LUNASI) {
    const res = repayPinjolDebt(uid, uname);
    if (!res.ok) {
      await interaction.reply({ content: res.message, flags: MessageFlags.Ephemeral });
      return true;
    }
    await interaction.deferUpdate();
    await sendPortfolioView(interaction, uid, uname, res.message);
    return true;
  }
  if (id === CUSTOM_IDS.BTN_JALAN_PINTAS) {
    const user = getOrCreateUser(uid, uname);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PINJOL_AMBIL).setLabel("💸 Ambil Talangan (8%/Hari)").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_JUDOL_SPIN).setLabel("🎡 Meja Putar Belakang").setStyle(ButtonStyle.Danger),
    );
    await interaction.reply({
      content: `⚡ **Fasilitas Belakang Pasar** — tunggakan mencapai **Rp 2Jt** menyegel lapakmu. Laci Kas: **${formatRpShort(user.balance)}** *(Tabungan Emas ${formatRpShort(user.emergency_fund)} kebal sita)*`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  if (id === CUSTOM_IDS.BTN_PINJOL_AMBIL || id === CUSTOM_IDS.BTN_JUDOL_SPIN) {
    const mode = id === CUSTOM_IDS.BTN_PINJOL_AMBIL ? "pinjol" : "slot";
    const res = takeShortcutGambleOrPinjol(uid, uname, mode, guildId);
    const png = renderAzabCard({
      username: uname,
      mode,
      cashLost: res.cashLost,
      totalDebt: res.totalDebt,
      assetSeizedName: res.assetSeizedName,
      karmaAfter: res.user.karma,
    });
    const attachment = new AttachmentBuilder(png, { name: "surat-segel-lapak.png" });
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(`🚨 LAPAK DISEGEL • Tunggakan ${formatRpShort(res.totalDebt)}`)
      .setDescription(
        `${res.narrative}\n\n🛡️ **Tabungan Emas (Aman):** ${formatRpShort(res.user.emergency_fund)} • Kas: **${formatRpShort(res.user.balance)}**`,
      )
      .setImage("attachment://surat-segel-lapak.png");
    const rescueRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_WORK).setLabel("☕ Seduh Cari Uang").setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_REPAY_DEBT)
        .setLabel("💸 Bayar Segel")
        .setStyle(ButtonStyle.Success)
        .setDisabled(res.user.balance <= 0),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH).setLabel("🪪 Buku Kas").setStyle(ButtonStyle.Secondary),
    );
    if (interaction.message.flags.has(MessageFlags.Ephemeral))
      await interaction.reply({ embeds: [embed], files: [attachment], components: [rescueRow] });
    else {
      await interaction.deferUpdate();
      await interaction.editReply({ content: "", embeds: [embed], files: [attachment], components: [rescueRow] });
    }
    return true;
  }
  return false;
}
