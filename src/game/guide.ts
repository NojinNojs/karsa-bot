import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { GUIDE_SECTIONS, type GuideCategoryId, type GuideSection } from "./guideData.ts";
import { getCurrentMarketEvent } from "./mechanics.ts";
import { BOT_VERSION } from "./versionInfo.ts";

export { GUIDE_SECTIONS, type GuideCategoryId, type GuideSection };

export function buildHelpEmbedsAndComponents(category: GuideCategoryId | string = "dasar") {
  const normalized = category.replace(/^btn_help_/, "").toLowerCase();
  const activeId: GuideCategoryId =
    normalized === "dasar" || normalized === "usaha" || normalized === "koperasi" || normalized === "bahaya" ? normalized : "dasar";
  const section = GUIDE_SECTIONS[activeId];
  const { event, nextChangeUnixSec } = getCurrentMarketEvent();

  const embed = new EmbedBuilder()
    .setColor(section.color)
    .setTitle(`${section.title} • v${BOT_VERSION}`)
    .setDescription(
      section.lines.join("\n\n") + `\n\n🌤️ **Cuaca Pasar:** ${event.title} (${event.goldBonusNote} • ganti <t:${nextChangeUnixSec}:R>)`,
    );

  const categoryOrder: GuideCategoryId[] = ["dasar", "usaha", "koperasi", "bahaya"];
  const row1 = new ActionRowBuilder<ButtonBuilder>();
  for (const catId of categoryOrder) {
    const item = GUIDE_SECTIONS[catId];
    const isActive = catId === activeId;
    const style = isActive ? (catId === "bahaya" ? ButtonStyle.Danger : ButtonStyle.Primary) : ButtonStyle.Secondary;
    row1.addComponents(new ButtonBuilder().setCustomId(item.buttonId).setLabel(item.buttonLabel).setStyle(style));
  }

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("btn_check_update").setLabel(`📋 Info Update v${BOT_VERSION}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("btn_feedback_open").setLabel("💬 Kirim Feedback / Lapor Bug").setStyle(ButtonStyle.Primary),
  );

  return { content: "", embeds: [embed], components: [row1, row2] };
}
