import type { ButtonInteraction } from "discord.js";
import { handleBizButtons } from "./buttonBiz.ts";
import { handleDebtButtons } from "./buttonDebt.ts";

export async function handleBizAndDebtButtons(interaction: ButtonInteraction, id: string): Promise<boolean> {
  if (await handleBizButtons(interaction, id)) return true;
  return handleDebtButtons(interaction, id);
}
