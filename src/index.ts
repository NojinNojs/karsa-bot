import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { COMMAND_DEFINITIONS } from "./commands/definitions.ts";

export const KARSA_PRESENCE_ROTATION = [
  "☕ Seduh Kopi Malam • /start",
  "🏪 Pasar Malam Lv.4 • /portfolio",
  "🤝 Koperasi Pedagang • /koperasi",
  "🏆 Papan Peringkat • /leaderboard",
] as const;

export const KARSA_BOT_BIO = [
  "☕ **KARSA — Pasar Malam & Koperasi Pedagang**",
  "Rintis lapak dari warkop sudut pasar hingga juragan ruko bersama warga server.",
  "",
  "🏪 **Lapak & Koperasi** • Kelola stok, cuaca pasar, & patungan kas warga",
  "🪪 **Kartu Pedagang** • Pantau portofolio usaha & reputasi lencana",
  "🧭 Mulai buka lapak pertamamu lewat **/start** atau **/help**",
].join("\n");

/**
 * Memperbarui deskripsi (About Me / Bio) aplikasi bot Discord secara otomatis
 * melalui endpoint `PATCH /applications/@me`.
 */
export async function updateBotApplicationProfile(token: string): Promise<void> {
  if (!token || token.trim().length === 0) return;
  const rest = new REST({ version: "10" }).setToken(token.trim());

  try {
    await rest.patch(Routes.currentApplication(), {
      body: { description: KARSA_BOT_BIO },
    });
    console.log("✅ [REST] Bio profil aplikasi KARSA berhasil diperbarui!");
  } catch (err) {
    console.warn(
      "⚠️ [REST] Gagal memperbarui bio aplikasi Discord (diabaikan):",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Menjalankan rotasi status & aktivitas Playing pada profil bot Discord.
 */
export function startPresenceRotation(
  client: Client,
  intervalMs = 45_000
): Timer {
  let index = 0;

  client.user?.setPresence({
    status: "online",
    activities: [
      {
        name: KARSA_PRESENCE_ROTATION[0],
        type: ActivityType.Playing,
      },
    ],
  });

  const timer = setInterval(() => {
    index = (index + 1) % KARSA_PRESENCE_ROTATION.length;
    const activityName = KARSA_PRESENCE_ROTATION[index] ?? KARSA_PRESENCE_ROTATION[0];
    client.user?.setPresence({
      status: "online",
      activities: [
        {
          name: activityName,
          type: ActivityType.Playing,
        },
      ],
    });
  }, intervalMs);

  timer.unref?.();
  return timer;
}

/**
 * Mendaftarkan Slash Commands secara otomatis ke Discord API menggunakan REST
 * ketika DISCORD_TOKEN dan DISCORD_CLIENT_ID tersedia di environment.
 * - Jika DISCORD_GUILD_ID diset, mendaftarkan ke Guild tersebut (instan < 1 detik)
 *   sekaligus memastikan command siap diuji.
 * - Jika DISCORD_GUILD_ID kosong, mendaftarkan secara Global.
 */
export async function registerSlashCommands(
  token: string,
  clientId: string,
  guildId?: string
): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    if (guildId && guildId.trim().length > 0) {
      console.log(
        `📡 [REST] Mendaftarkan ${COMMAND_DEFINITIONS.length} Slash Command ke Guild (${guildId})...`
      );
      await rest.put(Routes.applicationGuildCommands(clientId, guildId.trim()), {
        body: COMMAND_DEFINITIONS,
      });
      console.log("✅ [REST] Slash Command Guild berhasil didaftarkan secara instan!");
    } else {
      console.log(
        `🌐 [REST] Mendaftarkan ${COMMAND_DEFINITIONS.length} Slash Command secara Global...`
      );
      await rest.put(Routes.applicationCommands(clientId), {
        body: COMMAND_DEFINITIONS,
      });
      console.log("✅ [REST] Slash Command Global berhasil didaftarkan!");
    }
  } catch (err) {
    console.error("⚠️ [REST] Gagal mendaftarkan Slash Command:", err);
  }
}

/**
 * Helper pemuat modul dinamis yang aman terhadap pemeriksaan statis TypeScript
 * saat beberapa submodul dijalankan secara independen.
 */
async function loadModule(specifier: string): Promise<Record<string, any>> {
  return (await import(specifier)) as Record<string, any>;
}

/**
 * Mengarahkan interaksi Discord (Slash Command, Button, StringSelectMenu)
 * ke modul `src/commands/handlers.ts` dengan penanganan error yang aman (graceful).
 */
async function routeInteraction(interaction: Interaction): Promise<void> {
  try {
    const handlers = await loadModule("./commands/handlers.ts");

    if (interaction.isChatInputCommand()) {
      const fn =
        handlers.handleChatInputCommand ??
        handlers.handleCommandInteraction ??
        handlers.handleSlashCommand ??
        handlers.handleInteraction;
      if (typeof fn === "function") {
        await fn(interaction as ChatInputCommandInteraction);
        return;
      }
    } else if (interaction.isButton()) {
      const fn =
        handlers.handleButtonInteraction ??
        handlers.handleButton ??
        handlers.handleComponentInteraction ??
        handlers.handleInteraction;
      if (typeof fn === "function") {
        await fn(interaction as ButtonInteraction);
        return;
      }
    } else if (interaction.isStringSelectMenu()) {
      const fn =
        handlers.handleStringSelectMenuInteraction ??
        handlers.handleSelectMenuInteraction ??
        handlers.handleSelectMenu ??
        handlers.handleComponentInteraction ??
        handlers.handleInteraction;
      if (typeof fn === "function") {
        await fn(interaction as StringSelectMenuInteraction);
        return;
      }
    }
  } catch (err) {
    console.error("❌ [Router] Terjadi kesalahan saat memproses interaksi:", err);
    if (interaction.isRepliable()) {
      const errorMsg = {
        content:
          "⚠️ **Gangguan Kasir Pasar!** Terjadi kendala teknis saat memproses aksimu. Silakan coba beberapa saat lagi.",
      } as const;

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(errorMsg);
        } else {
          await interaction.reply(errorMsg);
        }
      } catch {
        // Abaikan jika interaksi sudah kedaluwarsa di sisi Discord
      }
    }
  }
}

/**
 * Mode Demo CLI (`bun start --demo` atau ketika DISCORD_TOKEN belum diatur).
 * Memungkinkan pengujian database SQLite, simulasi ekonomi pasar malam,
 * dan perenderan kartu visual secara lokal tanpa kredensial Discord.
 */
export async function runDemoMode(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  ☕  KARSA — PASAR MALAM & KOPERASI PEDAGANG (MODE DEMO LOKAL)   ║");
  console.log("║  Simulasi Lapak Pasar, Kas Koperasi Warga & Portofolio Pedagang  ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log("");

  // 1. Inisialisasi Database SQLite jika modul db tersedia
  try {
    const dbMod = await loadModule("./db/index.ts");
    if (typeof dbMod.initDatabase === "function") {
      await dbMod.initDatabase();
    } else if (typeof dbMod.ensureSchema === "function") {
      await dbMod.ensureSchema();
    }
    console.log("✅ [1/3] Database SQLite lokal siap digunakan.");
  } catch (err) {
    console.warn("ℹ️ [1/3] Modul database sedang disiapkan:", (err as Error).message);
  }

  // 2. Tampilkan daftar Slash Command yang terdaftar
  console.log(
    `✅ [2/3] ${COMMAND_DEFINITIONS.length} Slash Command terdaftar di sistem:`
  );
  for (const cmd of COMMAND_DEFINITIONS) {
    console.log(`   • /${cmd.name.padEnd(14, " ")} — ${cmd.description}`);
  }
  console.log("");

  // 3. Jalankan generator & pengujian kartu PNG (`src/test-render.ts`)
  console.log("🎨 [3/3] Merender sampel kartu visual KARSA & simulasi ekonomi...");
  try {
    const testRenderMod = await loadModule("./test-render.ts");
    if (typeof testRenderMod.runRenderTests === "function") {
      await testRenderMod.runRenderTests();
    } else if (typeof testRenderMod.main === "function") {
      await testRenderMod.main();
    }
  } catch (err) {
    console.warn(
      "ℹ️ [3/3] Gagal menjalankan test-render otomatis:",
      (err as Error).message
    );
  }

  console.log("");
  console.log("✨ Mode Demo selesai! Untuk menyalakan bot di server Discord:");
  console.log("   1. Salin `.env.example` menjadi `.env`");
  console.log("   2. Isi `DISCORD_TOKEN` dan `DISCORD_CLIENT_ID`");
  console.log("   3. Jalankan `bun start`");
}

/**
 * Entrypoint Utama KARSA — Pasar Malam & Koperasi Pedagang
 */
export async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const isDemoFlag = args.has("--demo") || args.has("-d");

  const token = process.env.DISCORD_TOKEN?.trim() ?? "";
  const clientId = process.env.DISCORD_CLIENT_ID?.trim() ?? "";
  const guildId = process.env.DISCORD_GUILD_ID?.trim();

  if (isDemoFlag || !token) {
    if (!isDemoFlag && !token) {
      console.log(
        "ℹ️  DISCORD_TOKEN tidak ditemukan di environment. Menjalankan Mode Demo (`--demo`) secara otomatis...\n"
      );
    }
    await runDemoMode();
    return;
  }

  // Pastikan database SQLite terinisialisasi sebelum login ke Discord
  try {
    const dbMod = await loadModule("./db/index.ts");
    if (typeof dbMod.initDatabase === "function") {
      await dbMod.initDatabase();
    } else if (typeof dbMod.ensureSchema === "function") {
      await dbMod.ensureSchema();
    }
  } catch (err) {
    console.error("⚠️ Gagal menginisialisasi database saat startup:", err);
  }

  // Registrasi otomatis Slash Command jika DISCORD_TOKEN dan DISCORD_CLIENT_ID tersedia
  if (token && clientId && process.env.REGISTER_COMMANDS_ON_BOOT !== "false") {
    await registerSlashCommands(token, clientId, guildId);
  } else if (!clientId) {
    console.warn(
      "⚠️ DISCORD_CLIENT_ID belum diatur di .env — melewati registrasi Slash Command otomatis."
    );
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  let presenceInterval: Timer | undefined;

  client.once(Events.ClientReady, async (readyClient) => {
    console.log("════════════════════════════════════════════════════════════════════");
    console.log(
      `☕  KARSA — Pasar Malam & Koperasi Pedagang Online sebagai ${readyClient.user.tag}`
    );
    console.log(`🏪  Melayani ${readyClient.guilds.cache.size} Server Discord`);
    console.log("════════════════════════════════════════════════════════════════════");

    presenceInterval = startPresenceRotation(readyClient, 45_000);
    await updateBotApplicationProfile(token);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    await routeInteraction(interaction);
  });

  // Penanganan sinyal terminasi yang bersih
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Menerima sinyal ${signal}. Menutup koneksi KARSA...`);
    if (presenceInterval) {
      clearInterval(presenceInterval);
      presenceInterval = undefined;
    }
    client.destroy();
    process.exit(0);
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  await client.login(token);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("💥 Fatal Error di KARSA — Pasar Malam & Koperasi Pedagang:", err);
    process.exit(1);
  });
}
