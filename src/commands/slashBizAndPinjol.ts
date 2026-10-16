import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getOrCreateUser, getUserBusinesses } from "../db/index.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildDevConsolePayload, isDeveloperUser } from "./devConsole.ts";
import { buildBusinessPanelPayload } from "./uiBuilders.ts";

export async function handleBizAndPinjolSlash(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const { commandName } = interaction;
  const uid = interaction.user.id;
  const uname = interaction.user.username;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (commandName === "dev") {
    if (!isDeveloperUser(interaction)) {
      await interaction.reply({ content: "⛔ Panel `/dev` khusus Developer KARSA.", flags: MessageFlags.Ephemeral });
      return true;
    }
    const wsPing = Math.max(1, Math.round(interaction.client.ws.ping || 42));
    await interaction.reply({ ...buildDevConsolePayload(guildId, wsPing), flags: MessageFlags.Ephemeral });
    return true;
  }

  const user = getOrCreateUser(uid, uname);
  if (commandName === "bisnis") {
    await interaction.reply({
      ...buildBusinessPanelPayload(user, getUserBusinesses(uid), undefined, guildId),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (commandName === "jalan-pintas") {
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
    const content = hasDebt
      ? `🚨 **Tunggakan Segel: ${formatRpShort(user.pinjol_debt)}** • Laci Kas: **${formatRpShort(user.balance)}** *(Tabungan Emas ${formatRpShort(user.emergency_fund)} aman)*`
      : "⚡ **Talangan Kilat & Meja Belakang** — tunggakan mencapai **Rp 2Jt** menyegel lapak.";
    await interaction.reply({ content, components: [row], flags: MessageFlags.Ephemeral });
    return true;
  }
  return false;
}
