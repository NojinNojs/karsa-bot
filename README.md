<div align="center">
  <img src="./output/bot_banner_680x240.png" alt="KARSA — Pasar Malam & Koperasi Pedagang" width="680" />

  <h1>☕ KARSA</h1>
  <p><strong>Mesin Ekonomi Warung Kopi &amp; Koperasi Pasar Malam untuk Komunitas Discord</strong><br/><em>Night-Market Coffee Stall &amp; Cooperative Economy Bot for Discord Communities</em></p>

  <p>
    <a href="#-bahasa-indonesia"><img src="https://img.shields.io/badge/ Dokumentasi-Bahasa_Indonesia-f59e0b?style=for-the-badge" alt="Bahasa Indonesia" /></a>
    <a href="#-english-documentation"><img src="https://img.shields.io/badge/ Documentation-English-3b82f6?style=for-the-badge" alt="English Documentation" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Runtime-Bun_1.4+-f9f1e1?logo=bun&logoColor=14151a" alt="Bun Runtime" />
    <img src="https://img.shields.io/badge/TypeScript-5.x_Strict-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ed?logo=docker&logoColor=white" alt="Docker Ready" />
    <img src="https://img.shields.io/badge/Database-SQLite_WAL_ACID-003b57?logo=sqlite&logoColor=white" alt="SQLite WAL" />
    <img src="https://img.shields.io/badge/Renderer-@napi--rs%2Fcanvas_384%C3%97216-d97706" alt="Pixel Renderer" />
  </p>
</div>

---

## 🖼️ Visual Showcase / Galeri Kartu Visual

<table>
  <tr>
    <td align="center" width="50%">
      <img src="./output/portfolio_retro_gold.png" alt="Kartu Catatan Usaha" width="100%" />
      <br />
      <sub><strong>Kartu Catatan Usaha (<code>/portfolio</code>)</strong><br/>Buku kas pedagang, brankas darurat, skor nama baik, dan rincian unit usaha.</sub>
    </td>
    <td align="center" width="50%">
      <img src="./output/koperasi_card.png" alt="Kartu Koperasi Pedagang" width="100%" />
      <br />
      <sub><strong>Kartu Koperasi Pedagang (<code>/koperasi</code>)</strong><br/>Kas bersama satu server, kuota tebus gerobak warga, dan penyumbang utama.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="./output/leaderboard_card.png" alt="Kartu Papan Peringkat" width="100%" />
      <br />
      <sub><strong>Papan Peringkat Pasar (<code>/leaderboard</code>)</strong><br/>Top pedagang berdasarkan total kekayaan bersih &amp; reputasi pasar.</sub>
    </td>
    <td align="center" width="50%">
      <img src="./output/azab_pinjol_card.png" alt="Surat Segel Lapak" width="100%" />
      <br />
      <sub><strong>Surat Segel Lapak (<code>/jalan-pintas</code>)</strong><br/>Penyitaan aset usaha saat tunggakan bunga harian melewati batas aman.</sub>
    </td>
  </tr>
</table>

---

# 🇮🇩 Bahasa Indonesia

## 1. Gambaran Umum
**KARSA** adalah bot ekonomi Discord bertema pasar malam dan peracik kopi jalanan yang dirancang dengan sistem progresi berjenjang (*strict progression gates*), buku kas berbasis transaksi **SQLite WAL ACID**, serta mesin perender kartu visual *in-memory* (`384×216` *native grid* yang diperbesar secara *nearest-neighbor* **3×** menjadi `1152×648` PNG dalam ~30ms).

Pemain merintis usaha benar-benar dari bawah (**Level 1**, modal awal **Rp 500.000**, dan **Kedai Kopi Lv.1**), mengatur belanja bahan baku harian, membuka akses ke **Brankas Darurat** dan **Saham Koperasi**, serta bergotong royong bersama warga satu server Discord.

---

## 2. Alur Pemain & Syarat Terbuka (*Progression Gates*)

Agar alur permainan jelas dan terstruktur, **KARSA** menerapkan sistem prasyarat (*"Belum A, Tidak Bisa B"*):

```mermaid
flowchart TD
    START["/start — Buka Lapak Pertama<br/>Level 1 • Kas Rp 500 Rb • Kedai Kopi Lv.1"] --> WORK["/work (Cooldown 30d) & /daily (Cooldown 20j)<br/>Kumpulkan Kas, XP, & Nama Baik"]
    WORK --> KEDAI2["Upgrade Kedai Kopi ke Lv.2 (/bisnis)"]
    KEDAI2 --> BRANKAS["🔓 Terbuka: Brankas Emas Darurat<br/>(100% Kebal Sita Saat Lapak Disegel)"]
    WORK --> LV2["Capai Pemain Level 2+ & Tanpa Tunggakan"]
    LV2 --> COOP["🔓 Terbuka: Patungan & Talangi Warga (/koperasi)"]
    KEDAI2 --> KEDAI3["Upgrade Kedai Kopi ke Lv.3 + Nama Baik ≥ 65"]
    KEDAI3 --> SAHAM["🔓 Terbuka: Saham Koperasi Warga"]
    SEIZED["🚨 Lapak Terkena Surat Segel (is_seized = 1)"] -.->|"Blokir Upgrade & Klaim Omzet"| REPAY["💸 Lunasi Tagihan (/jalan-pintas) atau Ditalangi Warga (/koperasi)"]
    REPAY --> WORK
```

| Fitur / Aksi | Syarat Buka (*Prerequisite Gate*) | Cooldown / Aturan |
| :--- | :--- | :--- |
| **Semua Perintah & Tombol** | Wajib membuka lapak terlebih dahulu lewat `/start` | Sekali pendaftaran (tidak mereset progres lama) |
| **Seduh Kopi (`/work`)** | Lapak terdaftar (`/start`) | **30 detik** antar-giliran seduh |
| **Uang Belanja (`/daily`)** | Lapak terdaftar (`/start`) | **20 jam** (hangus *streak* jika lewat **48 jam**) |
| **Klaim Omzet (`/bisnis`)** | Memiliki unit usaha aktif & lapak **tidak disegel** | **5 menit** antar-pencairan omzet |
| **Buka Brankas Emas (`/bisnis`)** | **Kedai Kopi mencapai Level 2+** & lapak tidak disegel | Dana di dalam brankas **100% kebal sita** |
| **Buka Saham Koperasi (`/bisnis`)** | **Kedai Kopi mencapai Level 3+** & **Nama Baik ≥ 65** | Menghasilkan dividen harian pasif |
| **Patungan & Talangi (`/koperasi`)** | **Pemain mencapai Level 2+** & **tidak punya tunggakan** | Patungan Rp 5 Jt / Talangi rekan Rp 10 Jt |
| **Beli Tema Kartu (`/shop`)** | Bebas tunggakan (`pinjol_debt = 0`) & lapak tidak disegel | Dilengkapi *Live Preview* atas nama sendiri |

---

## 3. Fitur Discord Native UX

**KARSA** memanfaatkan fitur asli (*native capabilities*) **discord.js v14** agar interaksi di dalam kanal tetap bersih, responsif, dan bebas *spam*:

- **In-Place Dashboard Editing (`deferUpdate()` & `editReply()`)**: Saat pemain menekan tombol navigasi, mengganti bab panduan `/help`, mencairkan omzet, menaikkan level usaha, atau mengganti *live preview* tema di `/shop`, bot memperbarui pesan yang sedang terbuka secara langsung (*in-place*) tanpa mengirim pesan baru yang memenuhi *chat*.
- **Ephemeral Private Guards (`MessageFlags.Ephemeral`)**: Peringatan syarat progresi (*Progression Gate*), pengingat waktu *cooldown*, buku pedoman `/help`, serta transaksi sensitif (seperti rincian Talangan Kilat dan pelunasan segel) dikirim secara privat (*Hanya kamu yang dapat melihat ini*) sehingga privasi pemain terjaga.
- **Dynamic Discord Timestamps (`<t:UNIX:R>`)**: Seluruh hitung mundur *cooldown* (`/work`, `/daily`, `/bisnis`) dan jadwal pergantian cuaca pasar ditampilkan menggunakan penanda waktu dinamis Discord (mis. *dalam 24 detik* / *dalam 42 menit*) yang bergerak otomatis mengikuti zona waktu perangkat masing-masing pemain.
- **Rich Embeds + Kanvas Piksel (`attachment://` `1152×648` PNG)**: Kartu visual hasil render *in-memory* disematkan langsung di dalam **Discord Rich Embed** (`EmbedBuilder`) sebagai lampiran `attachment://`, memadukan estetika piksel *retro* dengan teks informasi terstruktur dan indikator acara pasar aktif.
- **Modal Popups (`ModalBuilder` & `TextInputBuilder`)**: Selain tombol nominal cepat, pemain dapat membuka formulir *popup* interaktif di klien Discord untuk mengetik **nominal Rupiah bebas** saat mencicil tagihan pinjol (**Cicil Pinjol Nominal Bebas**) maupun menyetor kas gotong royong (**Patungan Koperasi Nominal Bebas**).

---

## 4. Sistem Replayability: Dilema Pasar, Cuaca Makro & Gelar Prestise

### A. 12 Dilema Pasar Malam (`/work`)
Setiap giliran seduh kopi (`/work`) menyajikan **1 dari 12 skenario dilema pasar malam** yang kontekstual dengan kehidupan pedagang kaki lima & warung kopi Nusantara (mulai dari pilihan biji Gayo asli vs campuran jagung sangrai, stiker titipan di meja kasir, pembukuan kas akhir bulan, gula aren asli vs pemanis buatan, ketebalan *cup* plastik, stiker QRIS palsu, lonjakan pesanan saat hujan deras malam minggu, oknum minta jatah kopi, tren es kopi susu gula aren, mesin *grinder* macet, *endorse* kreator kuliner, hingga kualitas es batu kristal):
- **Pilihan Jujur (*Ethical Choice*)**: Memberikan keuntungan kas stabil, **+XP tinggi**, dan menaikkan skor **Nama Baik (Karma)**.
- **Pilihan Pintas (*Corrupt Choice*)**: Menawarkan margin kas berlipat ganda, namun memicu risiko **Sidak Pasar / Komplain Warga (`auditChance`)** yang dapat menjatuhkan denda Rupiah serta memangkas skor Nama Baik.

### B. 6 Cuaca & Ekonomi Makro Pasar Dinamis (`MARKET_EVENTS`)
Kondisi ekonomi dan cuaca di Pasar Malam KARSA **berputar otomatis setiap 1 jam** (dilengkapi penanda `<t:UNIX:R>` menuju pergantian berikutnya) dan memengaruhi pengali omzet seduh (`workMultiplier`), peluang sidak (`auditModifier`), serta bagi hasil unit usaha (`bizYieldMultiplier`):

| Cuaca / Kondisi Makro Pasar | Efek Ekonomi & Lapak |
| :--- | :--- |
| 📉 **IHSG & Rupiah Goyang** | Harga bahan baku naik, namun nilai **Tabungan Emas / Usaha +20%** |
| 🌧️ **Hujan Deras Malam Minggu** | Kopi panas laris manis (**+25% Omzet Seduh**) |
| ☀️ **Malam Gajian Kantor** | Antrean ojol & pekerja mengular (**+20% Omzet Seduh**) |
| 🏛️ **Pejabat Bikin Aturan Ngawur** | Retribusi ketat & risiko **Sidak Pasar +15%** |
| 🌾 **Panen Raya Gayo** | Harga biji kopi turun dari hulu (**+15% Margin Bersih**) |
| 🔥 **Festival Kuliner Pasar Malam** | Keramaian puncak, **Koperasi & Unit Usaha Bagi Bonus (+20% Yield)** |

### C. 10 Gelar Prestise Pedagang (`PRESTIGE_RANKS`)
Seiring bertambahnya pengalaman (`XP`) dan naiknya level pemain, gelar kehormatan pedagang pada Kartu Catatan Usaha dan Papan Peringkat meningkat melalui **10 jenjang prestise** dari **`PERINTIS LAPAK` (Lv.1)** hingga **`SULTAN KOPERASI NUSANTARA` (Lv.25)**:

| Level Minimum | Gelar Prestise (`PRESTIGE_RANKS`) | Peran di Pasar Malam |
| :---: | :--- | :--- |
| **Lv. 1** | **PERINTIS LAPAK** | Pedagang baru yang merintis gerobak kopi pertama |
| **Lv. 2** | **PERACIK KOPI MALAM** | Mulai dikenal pelanggan ronda & ojol malam |
| **Lv. 4** | **JURAGAN SEDUH** | Racikan kopi stabil dengan antrean pelanggan tetap |
| **Lv. 6** | **PENGGERAK WARUNG** | Unit usaha berkembang & aktif di lingkar pasar |
| **Lv. 8** | **SAUDAGAR PASAR** | Arus kas kuat dan disegani pemasok bahan baku |
| **Lv. 11** | **BANDAR BIJI GAYO** | Pengendali pasokan biji kopi unggulan satu blok pasar |
| **Lv. 14** | **PEMANGKU KOPERASI** | Tulang punggung likuiditas & talangan warga server |
| **Lv. 17** | **MAESTRO NIAGA** | Pengusaha matang dengan portofolio usaha berlapis |
| **Lv. 21** | **KOMISARIS PASAR MALAM** | Tokoh utama penentu arah ekonomi pasar malam |
| **Lv. 25** | **SULTAN KOPERASI NUSANTARA** | Puncak prestise tertinggi pedagang & pelindung koperasi |

---

## 5. Daftar 11 Perintah (*Slash Commands*)

| Perintah | Deskripsi Singkat |
| :--- | :--- |
| `/start` | Membuka lapak pertama di Pasar Malam KARSA (Modal Kas Rp 500.000 & Kedai Kopi Lv.1). |
| `/help` | Membuka buku pedoman interaktif 4 bab (*Buka Lapak*, *Seduh & Bahan*, *Koperasi Pasar*, *Talangan & Segel*). |
| `/portfolio` | Mencetak Kartu Catatan Usaha (`1152×648` PNG) lengkap dengan 2 baris tombol aksi cepat. |
| `/card` | Alias cepat dari `/portfolio` untuk melihat kartu milik sendiri atau pedagang lain. |
| `/daily` | Mengambil uang belanja pasar harian dengan bonus *streak* bertingkat hingga 7+ hari. |
| `/work` | Menjalankan giliran seduh kopi & menghadapi 12 pilihan dilema belanja bahan baku di pasar. |
| `/bisnis` | Menaikkan level Kedai Kopi, membuka Brankas Emas & Saham Koperasi, serta mencairkan omzet. |
| `/koperasi` | Menyetor iuran kas koperasi server (tombol cepat / modal nominal bebas) atau menebus gerobak warga yang disegel. |
| `/leaderboard` | Mencetak kartu visual **Papan Peringkat** pedagang terkaya beserta cuaca ekonomi pasar server. |
| `/shop` | Mencoba *live preview* dan mengganti tema visual Kartu Usaha (*Retro Gold*, *GameBoy*, *Glodok Cyber*, *Keraton*). |
| `/jalan-pintas` | Mengakses fasilitas Talangan Kilat (bunga 8%/hari), Meja Putar Belakang, atau **Melunasi / Mencicil Tagihan Segel**. |

---

## 6. Menjalankan dengan Docker (Rekomendasi untuk Laptop & Migrasi VPS)

Proyek ini sudah dilengkapi `Dockerfile`, `docker-compose.yml`, dan skrip portabel `./docker-sync.sh` sehingga seluruh *runtime* Bun, *font* piksel, dan *library* kanvas langsung berjalan di dalam kontainer tanpa perlu menginstal dependensi di *host*.

### A. Menyalakan Bot di Docker (24/7 Auto-Restart)
```bash
cp .env.example .env
# Isi DISCORD_TOKEN dan DISCORD_CLIENT_ID di dalam .env
./docker-sync.sh up
```

### B. Mereset Seluruh Statistik Pemain ke Nol (Fresh Wipe)
```bash
./docker-sync.sh reset
# atau melalui CLI Bun secara langsung:
bun run src/index.ts --reset-db
```

### C. Memindahkan Bot + Database dari Laptop ke VPS (1 Perintah)
```bash
# 1. Di laptop: buat bundel portabel (.tar.gz berisi kode + .env + database SQLite)
./docker-sync.sh backup

# 2. Kirim ke VPS dan jalankan:
scp /home/nojin/Documents/00_Obsidian_HQ/06_Infra_&_Backup/karsa-bot-docker-latest.tar.gz user@ip-vps:~/
ssh user@ip-vps "tar -xzf karsa-bot-docker-latest.tar.gz && cd kota-mandiri-bot && ./docker-sync.sh up"
```

---

# 🌐 English Documentation

## 1. Overview
**KARSA** is a Discord coffee-stall and night-market economy bot built with **Bun**, **TypeScript (`strict`)**, **discord.js v14**, **SQLite WAL (ACID transactions)**, and a **zero-AI-slop procedural pixel-art UI engine** (`@napi-rs/canvas`).

Every player card, server cooperative dashboard, leaderboard, and seizure notice is rendered in-memory on a strict **384×216 native pixel grid** using a custom 5×7 bitmap font engine and integer-upscaled **3×** to **1152×648 PNG** in ~30ms.

---

## 2. Progression Flow & Prerequisite Gates ("If Not A, Cannot Do B")

Players begin from scratch (**Level 1**, **Rp 500,000** starter cash, **Lv.1 Coffee Stall**, and locked advanced assets) and unlock features progressively:

1. **Account Registration Gate (`/start`)**: Unregistered users attempting any command or button interaction receive an ephemeral onboarding prompt with a one-click **`🪪 Buka Lapak Pertama`** button. Running `/start` again never overwrites an existing player's progress.
2. **Work & Leveling (`/work` — 30s Cooldown)**: Completing coffee-brewing shifts awards cash, reputation (*Nama Baik*), and XP (`Level = 1 + floor(XP / 100)`).
3. **Asset Unlock Tree (`/bisnis` — 5m Claim Cooldown)**:
   - **Kedai Kopi (Coffee Stall)**: Unlocked at **Level 1**.
   - **Brankas Emas (Emergency Vault)**: Locked (`Lv.0`) until **Kedai Kopi reaches Level 2**. Funds stored here are **100% immune to asset seizure**.
   - **Saham Koperasi (Co-op Shares)**: Locked (`Lv.0`) until **Kedai Kopi reaches Level 3** and **Reputation ≥ 65**.
4. **Server Cooperative Gate (`/koperasi`)**: Contributing to the server liquidity pool or bailing out a sealed stall requires **Player Level 2+** and **zero active high-interest debt**.
5. **Seizure Lockdown & Recovery (`is_seized = 1`)**: If high-interest loan debt (`8%/day` compound) exceeds the seizure threshold, the player's stall is sealed—blocking business upgrades, passive income claims, and skin purchases until they repay the debt (`💸 Bayar / Lunasi Tagihan`) or are bailed out by fellow server members in `/koperasi`.

---

## 3. Discord Native UX Architecture

**KARSA** is engineered around modern **discord.js v14** interaction patterns for a responsive, clutter-free server experience:

- **In-Place Dashboard Editing (`deferUpdate()` & `editReply()`)**: Clicking dashboard buttons, switching `/help` handbook chapters, claiming business yields, upgrading stalls, or previewing `/shop` skins updates the existing message in-place without flooding the channel with new replies.
- **Ephemeral Private Guards (`MessageFlags.Ephemeral`)**: Prerequisite gate warnings, active cooldown notices, interactive `/help` guides, and sensitive financial actions (such as high-interest loan prompts and seizure repayments) are delivered ephemerally so only the invoking player can see them.
- **Dynamic Discord Timestamps (`<t:UNIX:R>`)**: All action cooldowns (`/work`, `/daily`, `/bisnis`) and hourly market weather transitions use native Discord relative timestamps (e.g., *in 25 seconds*, *in 38 minutes*) that count down live in every user's local timezone.
- **Rich Embeds + Pixel Canvas Attachments (`attachment://` `1152×648` PNG)**: Procedural pixel-art cards are bound directly inside structured Discord **Rich Embeds** (`EmbedBuilder`) via `attachment://` URIs, combining crisp retro visuals with live macro-economic indicators and action rows.
- **Interactive Modal Popups (`ModalBuilder` & `TextInputBuilder`)**: Alongside quick-action buttons, players can launch native Discord modal dialogs to input **custom Rupiah amounts** when paying down loan balances (*Cicil Pinjol Nominal Bebas*) or contributing to the server cooperative (*Patungan Koperasi Nominal Bebas*).

---

## 4. Long-Term Replayability: Dilemmas, Dynamic Market Events & Prestige Ranks

### A. 12 Night-Market Work Dilemmas (`/work`)
Each `/work` shift presents **1 of 12 grounded Indonesian street-market dilemmas** (ranging from authentic Gayo Arabica vs. roasted corn filler, shady counter QR stickers, dual ledger bookkeeping, pure palm sugar vs. artificial sweetener, cup packaging quality, counterfeit QRIS stickers, Saturday night downpours, market officials demanding free coffee, viral iced palm-sugar coffee rushes, jammed burr grinders, food-vlogger endorsements, to crystal ice vs. raw tap-water ice):
- **Ethical Choice**: Reliable Rupiah payout, **high XP gain**, and increased **Reputation (Karma)**.
- **Shortcut / Corrupt Choice**: Higher immediate cash payout, but carries an **Audit / Customer Backlash risk (`auditChance`)** that can trigger heavy fines and reputation penalties.

### B. 6 Dynamic Hourly Market Events (`MARKET_EVENTS`)
Macro-economic and weather conditions rotate **every hour on the hour** (`getCurrentMarketEvent()`), complete with a live `<t:UNIX:R>` countdown to the next shift, dynamically scaling `/work` payouts (`workMultiplier`), inspection probabilities (`auditModifier`), and passive business yields (`bizYieldMultiplier`):

| Hourly Market Event | Economic Modifiers |
| :--- | :--- |
| 📉 **IHSG & Rupiah Goyang** (*Market & Currency Volatility*) | Raw material costs rise; **Gold Vault & Business Yield +20%** |
| 🌧️ **Hujan Deras Malam Minggu** (*Saturday Night Downpour*) | Hot coffee demand surges (**+25% Work Payout**) |
| ☀️ **Malam Gajian Kantor** (*Payday Evening Rush*) | Delivery drivers & office workers queue up (**+20% Work Payout**) |
| 🏛️ **Pejabat Bikin Aturan Ngawur** (*Erratic Market Regulations*) | Tightened levies & **+15% Market Audit Risk** |
| 🌾 **Panen Raya Gayo** (*Bumper Gayo Coffee Harvest*) | Wholesale bean prices drop (**+15% Net Work Margin**) |
| 🔥 **Festival Kuliner Pasar Malam** (*Night-Market Culinary Festival*) | Peak foot traffic; **Co-op & Business Yield Bonus (+20% Yield)** |

### C. 10 Merchant Prestige Ranks (`PRESTIGE_RANKS`)
As players accumulate XP and level up, they ascend through **10 Prestige Ranks** (`getRankForLevel(level)`), from **Lv.1 `PERINTIS LAPAK`** (*Stall Pioneer*) up to **Lv.25 `SULTAN KOPERASI NUSANTARA`** (*Archipelago Co-op Sultan*), displayed across embeds and progression badges.

---

## 5. Architecture & Directory Structure

```text
kota-mandiri-bot/
├── assets/fonts/                 # Embedded pixel fonts (PressStart2P, Silkscreen)
├── src/
│   ├── index.ts                  # Gateway entrypoint, rotating presence, --demo & --reset-db CLI
│   ├── commands/
│   │   ├── definitions.ts        # 11 Discord Slash Command schemas
│   │   └── handlers.ts           # Interaction routers, registration gates, modals & button flows
│   ├── db/
│   │   ├── schema.ts             # Drizzle/SQLite table definitions
│   │   └── index.ts              # ACID transactions, progression gates & cooldown engine
│   ├── game/
│   │   ├── mechanics.ts          # 12 work dilemmas, 6 hourly market events, 10 prestige ranks & catalog
│   │   └── guide.ts              # 4-tab interactive player handbook (/help)
│   └── renderer/
│       ├── designSpec.ts         # Mathematical grid constants, bevels & 4 color themes
│       ├── pixelFont.ts          # Custom 5×7 bitmap pixel font renderer
│       ├── spritesV3.ts          # Hand-crafted 16×16 & 24×24 pixel sprites
│       ├── renderAvatarV3.ts     # 32×32 → 512×512 circle-crop-safe bot avatar generator
│       ├── renderBannerV3.ts     # 340×120 → 680×240 bot profile banner generator
│       ├── renderPortfolioV3.ts  # Portfolio, Co-op & Seizure card renderers
│       └── renderLeaderboardV3.ts# Top 3 server leaderboard card renderer
├── tests/
│   └── karsa.test.ts             # Unit & integration test suite (ACID, gates, cooldowns, PNG bytes)
├── Dockerfile                    # Production Bun + Skia container definition
├── docker-compose.yml            # Persistent volume & auto-restart orchestration
└── docker-sync.sh                # One-command up / reset / VPS backup & restore utility
```

---

## 6. Development, Testing & Docker Deployment

```bash
# Install dependencies
bun install

# Run static typecheck & unit/integration test suite
bun run typecheck
bun test

# Regenerate all visual cards & branding assets into ./output/
bun run src/test-render.ts
bun run src/render-branding.ts

# Wipe all player stats to zero
bun run src/index.ts --reset-db

# Build & run inside Docker (recommended for production / VPS)
./docker-sync.sh up
```

---

## 7. Release History & Patch Notes (`v1.2.0`)

See **[CHANGELOG.md](./CHANGELOG.md)** for full bilingual patch notes (Bahasa Indonesia & English):
- **`v1.2.0` (Latest)**: 20-Persona Simulation Audit, Multiplayer S.O.S. Stall Bailout (`🛟 Minta Tebus Warga`), Live Co-op Contributors Tracking (`contributors_json`), Server Market Level Buff (`+5%` to `+20%` yield across `PASAR MALAM • LV.1–5`), Dual-Currency Rp/Gem `/shop`, Public Card Ownership Guard, and V3.2 Pixel Typography Precision (`20 test suites / 313 assertions`).
- **`v1.1.0`**: State-Driven Discord Action Rows, Single-Scope Guild Slash Command Registration, Dynamic `<t:UNIX:R>` Timestamps, and 6 Hourly Market Events.
- **`v1.0.0`**: Initial Procedural 16-Bit Pixel-Art Engine (`384×216` → `1152×648`), SQLite WAL ACID Progression Gates, and Portable Docker Deployment.
