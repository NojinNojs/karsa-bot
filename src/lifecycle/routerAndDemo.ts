import { type Interaction, MessageFlags } from "discord.js";
import { COMMAND_DEFINITIONS } from "../commands/definitions.ts";
import {
  handleButtonInteraction,
  handleChatInputCommand,
  handleModalSubmitInteraction,
  handleStringSelectMenuInteraction,
} from "../commands/handlers.ts";
import { initDatabase } from "../db/index.ts";

export async function routeInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleStringSelectMenuInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmitInteraction(interaction);
    }
  } catch (err) {
    console.error("❌ [Router] Terjadi kesalahan saat memproses interaksi:", err);
    if (interaction.isRepliable()) {
      const errorMsg = {
        content: "⚠️ **Gangguan Kasir Pasar!** Terjadi kendala teknis saat memproses aksimu. Silakan coba lagi.",
        flags: MessageFlags.Ephemeral,
      } as const;
      try {
        if (interaction.deferred || interaction.replied) await interaction.followUp(errorMsg);
        else await interaction.reply(errorMsg);
      } catch {}
    }
  }
}

export async function runDemoMode(): Promise<void> {
  console.log("☕ KARSA — PASAR MALAM & KOPERASI PEDAGANG (MODE DEMO LOKAL)");
  initDatabase();
  console.log(`✅ [1/2] Database SQLite WAL siap. ${COMMAND_DEFINITIONS.length} Slash Command terdaftar:`);
  for (const cmd of COMMAND_DEFINITIONS) {
    console.log(`   • /${cmd.name.padEnd(14, " ")} — ${cmd.description}`);
  }
  try {
    const testRenderMod = (await import("../test-render.ts")) as Record<string, unknown>;
    if (typeof testRenderMod.runRenderTests === "function") await testRenderMod.runRenderTests();
  } catch {}
}
