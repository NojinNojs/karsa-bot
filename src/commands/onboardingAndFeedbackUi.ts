import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { CUSTOM_IDS } from "./customIds.ts";

export function buildCooldownTag(lastAtMs: number, cooldownMs: number, readyLabel = "✅ Siap"): string {
  if (!lastAtMs || lastAtMs <= 0) return readyLabel;
  const readyAtMs = lastAtMs + cooldownMs;
  if (Date.now() >= readyAtMs) return readyLabel;
  return `Siap <t:${Math.ceil(readyAtMs / 1000)}:R>`;
}

export function buildOnboardingPrompt() {
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("☕ Belum Punya Lapak di Pasar Malam!")
    .setDescription("Klik tombol di bawah untuk membuka **Kedai Kopi Lv.1** + modal awal **Rp 500Rb**.");
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_START_LAPAK).setLabel("🪪 Buka Lapak Pertama (Gratis)").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_HELP).setLabel("📖 Cara Main").setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [embed], components: [row], flags: MessageFlags.Ephemeral as const };
}

export function buildFeedbackModal(): ModalBuilder {
  const modal = new ModalBuilder().setCustomId(CUSTOM_IDS.MODAL_FEEDBACK).setTitle("💬 Kirim Feedback / Lapor Bug KARSA");
  const catInput = new TextInputBuilder()
    .setCustomId(CUSTOM_IDS.INPUT_FB_CATEGORY)
    .setLabel("Kategori (Saran Fitur / Bug / Ekonomi)")
    .setPlaceholder("Contoh: Saran Fitur atau Lapor Bug")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  const msgInput = new TextInputBuilder()
    .setCustomId(CUSTOM_IDS.INPUT_FB_MESSAGE)
    .setLabel("Isi Masukan atau Detail Bug")
    .setPlaceholder("Tulis masukanmu untuk pengembangan bot KARSA...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(catInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(msgInput),
  );
  return modal;
}
