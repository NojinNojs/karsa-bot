import { ActivityType, type Client, REST, Routes } from "discord.js";
import { COMMAND_DEFINITIONS } from "../commands/definitions.ts";
import { BOT_VERSION } from "../game/versionInfo.ts";

export const KARSA_PRESENCE_ROTATION = [
  `☕ Seduh Kopi • /start (v${BOT_VERSION})`,
  "🏪 Pasar Malam • /portfolio",
  "🤝 Koperasi Warga • /koperasi",
  "🏆 Papan Peringkat • /leaderboard",
] as const;

export const KARSA_BOT_BIO = [
  `☕ **KARSA v${BOT_VERSION} — Pasar Malam & Koperasi Pedagang**`,
  "Rintis lapak dari warkop sudut pasar hingga juragan ruko bersama warga server.",
  "",
  "🏪 **Lapak & Koperasi** • Kelola stok, cuaca pasar, & patungan kas warga",
  "🪪 **Kartu Pedagang** • Pantau portofolio usaha & reputasi lencana",
  "🧭 Mulai buka lapak pertamamu lewat **/start**, **/help**, atau **/update**",
].join("\n");

export async function updateBotApplicationProfile(token: string): Promise<void> {
  if (!token || token.trim().length === 0) return;
  const rest = new REST({ version: "10" }).setToken(token.trim());
  try {
    await rest.patch(Routes.currentApplication(), { body: { description: KARSA_BOT_BIO } });
    console.log("✅ [REST] Bio profil aplikasi KARSA berhasil diperbarui!");
  } catch (err) {
    console.warn("⚠️ [REST] Gagal memperbarui bio aplikasi Discord:", err instanceof Error ? err.message : err);
  }
}

export function startPresenceRotation(client: Client, intervalMs = 45_000): Timer {
  let index = 0;
  client.user?.setPresence({
    status: "online",
    activities: [{ name: KARSA_PRESENCE_ROTATION[0], type: ActivityType.Playing }],
  });
  const timer = setInterval(() => {
    index = (index + 1) % KARSA_PRESENCE_ROTATION.length;
    const activityName = KARSA_PRESENCE_ROTATION[index] ?? KARSA_PRESENCE_ROTATION[0];
    client.user?.setPresence({
      status: "online",
      activities: [{ name: activityName, type: ActivityType.Playing }],
    });
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export async function registerSlashCommands(token: string, clientId: string, guildId?: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    if (guildId && guildId.trim().length > 0) {
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      console.log(`📡 [REST] Mendaftarkan ${COMMAND_DEFINITIONS.length} Slash Command ke Guild (${guildId})...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId.trim()), {
        body: COMMAND_DEFINITIONS,
      });
      console.log("✅ [REST] Slash Command Guild berhasil didaftarkan secara instan!");
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: COMMAND_DEFINITIONS });
      console.log("✅ [REST] Slash Command Global berhasil didaftarkan!");
    }
  } catch (err) {
    console.error("⚠️ [REST] Gagal mendaftarkan Slash Command:", err);
  }
}
