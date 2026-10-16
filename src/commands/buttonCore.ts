import type { ButtonInteraction } from "discord.js";
import { handleNavButtonInteraction } from "./buttonNav.ts";
import { handleWorkAndDailyButtons } from "./buttonWorkAndDaily.ts";

export async function handleCoreButtonInteraction(interaction: ButtonInteraction, id: string, rawId: string): Promise<boolean> {
  if (await handleNavButtonInteraction(interaction, id)) return true;
  return handleWorkAndDailyButtons(interaction, id, rawId);
}
