import type { ChatInputCommandInteraction } from "discord.js";
import { withUserLock } from "./concurrencyGuard.ts";
import { handleCoreSlashCommands } from "./slashCore.ts";
import { handleMarketSlashCommands } from "./slashMarket.ts";

export async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await withUserLock(interaction.user.id, async () => {
    if (interaction.commandName === "dev") {
      await handleMarketSlashCommands(interaction);
      return;
    }
    if (await handleCoreSlashCommands(interaction)) {
      return;
    }
    await handleMarketSlashCommands(interaction);
  });
}
