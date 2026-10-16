import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { COOP_PATUNGAN_COST_RP, COOP_RESCUE_COST_RP, getOrCreateServerCoop, getOrCreateUser, investOrRescueCoop } from "../db/index.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { renderCoopCard } from "../renderer/pixelCard.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { sendPortfolioView } from "./uiBuilders.ts";

export async function handleCoopButtons(interaction: ButtonInteraction, id: string, rawId: string): Promise<boolean> {
  const { id: uid, username: uname } = interaction.user;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (id === CUSTOM_IDS.BTN_KOPERASI) {
    await interaction.deferUpdate();
    const user = getOrCreateUser(uid, uname);
    const coop = getOrCreateServerCoop(guildId);
    const canPatungan = user.level >= 2 && user.pinjol_debt === 0 && user.balance >= COOP_PATUNGAN_COST_RP;
    const canRescue = user.pinjol_debt === 0 && user.balance >= COOP_RESCUE_COST_RP;
    const bonusPct = Math.max(0, coop.eco_level - 1) * 5;

    const attachment = new AttachmentBuilder(renderCoopCard(coop), { name: "karsa-koperasi.png" });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🤝 Koperasi Pasar Lv.${coop.eco_level} • Kas ${formatRpShort(coop.pool_balance)}`)
      .setDescription(
        `Kasmu **${formatRpShort(user.balance)}**  •  Warung Ditebus **${coop.rescued_count}**  •  Bonus Pasar **+${bonusPct}% Omzet**`,
      )
      .setImage("attachment://karsa-koperasi.png");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_PATUNGAN)
        .setLabel(user.level < 2 ? "🔒 Patungan (Butuh Lv.2)" : `🤝 Patungan (${formatRpShort(COOP_PATUNGAN_COST_RP)})`)
        .setStyle(canPatungan ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canPatungan),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel(`🛟 Tebus Warga (${formatRpShort(COOP_RESCUE_COST_RP)})`)
        .setStyle(canRescue ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canRescue),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH).setLabel("🪪 Kartu Usaha").setStyle(ButtonStyle.Secondary),
    );
    await interaction.editReply({ content: "", embeds: [embed], files: [attachment], components: [row] });
    return true;
  }

  if (id === CUSTOM_IDS.BTN_KOPERASI_PATUNGAN || id === CUSTOM_IDS.BTN_KOPERASI_TALANGI) {
    const act = id === CUSTOM_IDS.BTN_KOPERASI_PATUNGAN ? "patungan" : "rescue";
    const targetUserId = rawId.split(":")[1];
    const caller = getOrCreateUser(uid, uname);

    if (act === "rescue" && !targetUserId && (caller.is_seized === 1 || caller.pinjol_debt > 0) && caller.balance < COOP_RESCUE_COST_RP) {
      const sosRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.BTN_KOPERASI_TALANGI}:${uid}`)
          .setLabel(`🛟 Tebus Lapak ${uname} (${formatRpShort(COOP_RESCUE_COST_RP)})`)
          .setStyle(ButtonStyle.Success),
      );
      await interaction.reply({
        content: `📢 **S.O.S. WARGA PASAR!** Lapak milik **${uname}** sedang disegel (Tunggakan **${formatRpShort(caller.pinjol_debt)}**).\nWarga yang membantu menebus mendapat **+25 Nama Baik, +2 💎 Permata, & Gelar Penebus Warga**!`,
        components: [sosRow],
      });
      return true;
    }

    const res = investOrRescueCoop(uid, uname, act, guildId, targetUserId);
    if (!res.ok) {
      await interaction.reply({ content: `${res.message}`, flags: MessageFlags.Ephemeral });
      return true;
    }
    if (act === "rescue" && targetUserId) {
      await interaction.deferUpdate();
      const doneRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("sos_done").setLabel(`✅ Ditebus oleh ${uname}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      );
      await interaction.editReply({
        content: `🎉 **SEGEL LAPAK BERHASIL DITEBUS!** Lapak milik **@${res.rescuedUsername || "Warga"}** telah dibebaskan oleh **@${uname}** (+25 Nama Baik & +2 💎)!`,
        components: [doneRow],
      });
      return true;
    }
    await interaction.deferUpdate();
    const headline =
      act === "patungan"
        ? `🤝 **Patungan +${formatRpShort(res.amount || 0)} Berhasil!** (Kas Koperasi: ${formatRpShort(res.coop.pool_balance)})`
        : `🛟 **Lapak ${res.rescuedUsername ? `@${res.rescuedUsername}` : "Warga"} Berhasil Ditebus!** (+25 Nama Baik, +2 💎)`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return true;
  }
  return false;
}
