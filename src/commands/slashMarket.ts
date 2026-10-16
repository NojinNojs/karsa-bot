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
import { COOP_PATUNGAN_COST_RP, COOP_RESCUE_COST_RP, getOrCreateServerCoop, getOrCreateUser } from "../db/index.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { renderCoopCard } from "../renderer/pixelCard.ts";
import { SKIN_PALETTES } from "../renderer/sprites.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { handleBizAndPinjolSlash } from "./slashBizAndPinjol.ts";

export async function handleMarketSlashCommands(interaction: ChatInputCommandInteraction): Promise<void> {
  if (await handleBizAndPinjolSlash(interaction)) return;
  const { commandName } = interaction;
  const uid = interaction.user.id;
  const uname = interaction.user.username;
  const guildId = interaction.guildId || "global_kota_mandiri";
  const user = getOrCreateUser(uid, uname);

  if (commandName === "koperasi") {
    const coop = getOrCreateServerCoop(guildId);
    const canPatungan = user.level >= 2 && user.pinjol_debt === 0 && user.balance >= COOP_PATUNGAN_COST_RP;
    const canRescue = user.pinjol_debt === 0 && user.balance >= COOP_RESCUE_COST_RP;
    const bonusPct = Math.max(0, coop.eco_level - 1) * 5;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_PATUNGAN)
        .setLabel(user.level < 2 ? "🔒 Patungan (Lv.2)" : `🤝 Patungan (${formatRpShort(COOP_PATUNGAN_COST_RP)})`)
        .setStyle(canPatungan ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canPatungan),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_KOPERASI_TALANGI)
        .setLabel(`🛟 Tebus Warga (${formatRpShort(COOP_RESCUE_COST_RP)})`)
        .setStyle(canRescue ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canRescue),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH).setLabel("🪪 Kartu Usaha").setStyle(ButtonStyle.Secondary),
    );
    const attachment = new AttachmentBuilder(renderCoopCard(coop), { name: "karsa-koperasi.png" });
    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`🤝 Koperasi Pasar Lv.${coop.eco_level} • Kas ${formatRpShort(coop.pool_balance)}`)
      .setDescription(
        `Kasmu **${formatRpShort(user.balance)}**  •  Warung Ditebus **${coop.rescued_count}**  •  Bonus **+${bonusPct}% Omzet**`,
      )
      .setImage("attachment://karsa-koperasi.png");
    await interaction.reply({ embeds: [embed], files: [attachment], components: [row] });
    return;
  }

  if (commandName === "shop") {
    if (user.is_seized === 1 || user.pinjol_debt > 0) {
      await interaction.reply({ content: "🔒 **Toko tema terkunci** selama lapak disegel.", flags: MessageFlags.Ephemeral });
      return;
    }
    const opts = Object.values(SKIN_PALETTES).map((s) => ({
      label: `${s.name} (${s.priceRp === 0 ? "GRATIS" : `${formatRpShort(s.priceRp)} / ${s.priceGems}💎`})`,
      description: s.desc,
      value: s.id,
    }));
    const select = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT_SKIN_PREVIEW)
      .setPlaceholder("👀 Pilih Tema Kartu Usaha...")
      .addOptions(opts);
    await interaction.reply({
      content: `🎨 **Pilih tema kartu usaha** (Kasmu: **${formatRpShort(user.balance)}** • Permata: **${user.gems} 💎**):`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }
}
