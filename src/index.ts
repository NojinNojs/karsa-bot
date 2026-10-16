import { Client, Events, GatewayIntentBits } from "discord.js";
import { initDatabase, resetAllUserData } from "./db/index.ts";
import { notifyBotOffline, notifyBotOnline } from "./lifecycle/notifier.ts";
import {
  KARSA_BOT_BIO,
  KARSA_PRESENCE_ROTATION,
  registerSlashCommands,
  startPresenceRotation,
  updateBotApplicationProfile,
} from "./lifecycle/presenceAndRest.ts";
import { routeInteraction, runDemoMode } from "./lifecycle/routerAndDemo.ts";

export { KARSA_BOT_BIO, KARSA_PRESENCE_ROTATION, registerSlashCommands, runDemoMode, startPresenceRotation, updateBotApplicationProfile };

export async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if (args.has("--reset-db")) {
    resetAllUserData();
    console.log("🧹 [DB] Seluruh statistik pemain & kas koperasi telah direset ke nol!");
    if (!args.has("--start")) return;
  }

  const token = process.env.DISCORD_TOKEN?.trim() ?? "";
  const clientId = process.env.DISCORD_CLIENT_ID?.trim() ?? "";
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  if (args.has("--demo") || args.has("-d") || !token) {
    await runDemoMode();
    return;
  }

  initDatabase();
  if (token && clientId && process.env.REGISTER_COMMANDS_ON_BOOT !== "false") {
    await registerSlashCommands(token, clientId, guildId);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
  let presenceInterval: Timer | undefined;
  let shuttingDown = false;

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`☕ KARSA Online sebagai ${readyClient.user.tag} (${readyClient.guilds.cache.size} Server)`);
    presenceInterval = startPresenceRotation(readyClient, 45_000);
    await updateBotApplicationProfile(token);
    await notifyBotOnline(readyClient);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    await routeInteraction(interaction);
  });

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n🛑 Menerima sinyal ${signal}. Mengirim pemberitahuan Off & menutup koneksi KARSA...`);
    if (presenceInterval) clearInterval(presenceInterval);
    client.user?.setStatus("dnd");
    await notifyBotOffline(client, `Restart / Container Shutdown (${signal})`);
    client.destroy();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await client.login(token);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("💥 Fatal Error di KARSA:", err);
    process.exit(1);
  });
}
