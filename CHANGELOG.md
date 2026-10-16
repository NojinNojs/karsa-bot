# 📋 Catatan Rilis & Patch Notes — KARSA (`Karsa#5157`)

Dokumentasi perubahan versi (*Changelog & Patch Notes*) tersedia dalam **Bahasa Indonesia** dan **Bahasa Inggris (English)**.

---

## 🇮🇩 Bahasa Indonesia

### 🚀 `v1.2.0` — Audit Simulasi 20 Persona, S.O.S. Tebus Warga Multiplayer, & Presisi Kartu Pixel V3.2 *(16 Oktober 2026)*

#### 1. Perbaikan Visual & Presisi Huruf Kartu Pixel-Art (`384×216` → `1152×648`)
- **Zero Text Truncation & Anti-Collision**:
  - Memperbaiki teks terpotong pada lencana (`PEDAGANG PASAR` → `WARGA PASAR`, `LAPAK DISEGEL`, `BANGKIT LAGI`), sub-label unit usaha (`LV.X • GEROBAK`, `LV.X • KEBAL SITA`, `LV.X • BAGI HASIL`), dan seluruh gelar *Prestige* Lv.1–Lv.20 (`≤ 14 karakter`).
  - Memperbaiki tabrakan teks kiri-kanan di panel bawah kartu **Papan Peringkat (`/leaderboard`)** dan **Koperasi (`/koperasi`)** (`RINTISAN` + `SEWA NORMAL`), serta pada kartu **Catatan Usaha** saat memiliki tunggakan (`TUNGGAKAN` + `RP X,X JT`).
  - Menyeragamkan seluruh format mata uang dan hasil usaha menggunakan satuan **`Rb`** dan **`Jt` (1 desimal)** (`RP 1,5 JT`, `+350 RB/HR`).
  - Memperbaiki perataan vertikal (*vertical centering*) `drawPixelTextCentered()` dengan memperhitungkan tinggi *drop shadow* `1px`.
  - Menambahkan penanda merah **`DISEGEL`** pada baris `Kedai Kopi Karsa` saat lapak disegel, sementara `Tabungan Emas` tetap hijau **`+250 RB/HR`** (kebal sita).

#### 2. Fitur Multiplayer Baru & Keseimbangan Ekonomi (Hasil Simulasi 20 Agen)
- **Tombol S.O.S. Tebus Warga Lintas-Pemain (`🛟 Minta Tebus Warga`)**:
  - Saat pemain yang lapaknya disegel menekan tombol **`🛟 Minta Tebus Warga`**, bot mengirim kartu panggilan darurat publik di channel dengan tombol **`[🛟 Tebus Lapak @username (Rp 1,5Jt)]`** yang bisa ditekan oleh warga server lain untuk membebaskan segel rekannya (`+25 Nama Baik` & `+2 💎 Permata` bagi penolong).
- **Pelacakan Mitra Koperasi Aktif (`contributors_json`)**:
  - Kartu `/koperasi` kini mencatat dan menampilkan jumlah **`X MITRA AKTIF`** serta daftar **Top 3 Mitra Teraktif** secara *real-time* setiap kali warga menyetor patungan atau menebus gerobak.
- **Efek Level Pasar Server (`PASAR MALAM • LV.1–5`)**:
  - Setiap akumulasi **Rp 3,0 Jt** di Kas Koperasi menaikkan Level Pasar Server (`Lv.1` hingga `Lv.5`), memberikan **+5% Bonus Omzet & Seduh** bagi seluruh pemain di server pada setiap kenaikan level (hingga **+20%** di `Lv.5`).
- **Ekonomi Permata (`💎`) & Toko Tema Dual-Currency (`/shop`)**:
  - Pemain kini memperoleh **`+1 💎 Permata`** setiap kali naik level di `/work` dan setiap klaim `/daily` (**`+2 💎`** saat *streak* ≥ 3 hari).
  - Tema kartu di `/shop` (*GameBoy DMG-01*, *Glodok Cyber 2077*, *Keraton Royal Emerald*) kini disesuaikan harganya (`Rp 2,5Jt – Rp 7,5Jt`) dan dapat dibeli menggunakan **Kas (`Rp`)** maupun **Permata (`💎`)**.
- **Proteksi Kepemilikan Tombol Kartu Publik (*Anti-Hijack Guard*)**:
  - Mencegah pemain lain menimpa kartu `/portfolio` milik pemain di channel publik saat menekan tombol aksi pribadi.
- **Isolasi Database Pengujian (`:memory:`)**:
  - `bun test` kini otomatis berjalan di SQLite *in-memory* (`:memory:`) sehingga tidak pernah berbenturan dengan *volume* database produksi Docker (`20 test suites / 313 assertions LULUS`).

---

### ⚡ `v1.1.0` — State-Driven Discord UX, Anti-Duplikat Slash Command, & 6 Cuaca Pasar Dinamis *(16 Oktober 2026)*
- **State-Driven Action Rows (`buildDashboardRows`)**: Tombol pada kartu otomatis menyala/mati (`disabled`) sesuai status pemain (Level 1 mengunci tombol Koperasi `🔒 Koperasi (Lv.2)`, cooldown harian mengubah tombol menjadi `✅ Harian Diambil`, dan status segel mengalihkan tombol ke mode pemulihan).
- **Pendaftaran Slash Command Tunggal**: Menghapus duplikasi *Global* vs *Guild* command dengan mengosongkan *Global Commands* saat `DISCORD_GUILD_ID` aktif.
- **Native Discord v14 Features**: *In-place message editing* (`deferUpdate`), *ephemeral panels* (`MessageFlags.Ephemeral`), *live relative timestamps* (`<t:UNIX:R>`), dan *Modal Popup Input* untuk cicilan nominal bebas.
- **6 Cuaca Ekonomi Pasar Per Jam (`MARKET_EVENTS`)**: Termasuk event `📉 IHSG & Rupiah Goyang`, `🌧️ Hujan Deras Malam Minggu`, dan 12 dilema kerja harian.

---

### 🎉 `v1.0.0` — Rilis Perdana KARSA & Infrastruktur Docker Portabel *(15–16 Oktober 2026)*
- Mesin *pixel-art* prosedural murni dari kode (`@napi-rs/canvas`, *bitmap font* 5×7 `pixelFont.ts`, *circle-crop-safe avatar* `512×512`, banner `680×240`).
- Sistem progresi *Zero-to-Hero* dari Level 1 (`Rp 500 Rb`), SQLite WAL ACID, pembungkusan penuh di dalam kontainer **Docker** (`Dockerfile`, `docker-compose.yml`, `./docker-sync.sh`), dan *local pre-push CI hook*.

---

## 🌐 English Release Notes

### 🚀 `v1.2.0` — 20-Persona Simulation Audit, Multiplayer S.O.S. Bailout, & Pixel Card V3.2 Precision *(October 16, 2026)*

#### 1. Pixel-Art Card Typography & Layout Precision (`384×216` → `1152×648`)
- **Zero Text Truncation & Anti-Collision**:
  - Fixed text clipping across all status badges (`WARGA PASAR`, `LAPAK DISEGEL`, `BANGKIT LAGI`), business subtitles (`LV.X • GEROBAK`, `LV.X • KEBAL SITA`, `LV.X • BAGI HASIL`), and all Lv.1–Lv.20 Prestige Rank titles (`≤ 14 chars`), enforced by automated bounding-box unit tests.
  - Resolved left/right label collisions in the bottom-left market health panel on `/leaderboard` and `/koperasi` (`RINTISAN` + `SEWA NORMAL`) as well as on indebted portfolio cards (`TUNGGAKAN` + `RP X,X JT`).
  - Standardized all currency and yield displays to **`Rb`** and **`Jt` (1 decimal place)** (`RP 1,5 JT`, `+350 RB/HR`).
  - Adjusted `drawPixelTextCentered()` vertical math to account for `1px` drop-shadow height.
  - Added a red **`DISEGEL`** indicator on sealed stalls while keeping the seizure-immune `Tabungan Emas` vault green (`+250 RB/HR`).

#### 2. Multiplayer Co-op & Economy Balancing (20-Agent Simulation Findings)
- **Cross-Player S.O.S. Bailout (`🛟 Minta Tebus Warga`)**:
  - Indebted players can broadcast a public S.O.S. card with a one-click **`[🛟 Tebus Lapak @username (Rp 1,5Jt)]`** button, allowing fellow server members to unseal their stall and earn **`+25 Reputation`** and **`+2 💎 Gems`**.
- **Live Co-op Contributor Leaderboard (`contributors_json`)**:
  - `/koperasi` now persists and renders active contributors (`X MITRA AKTIF`) and the Top 3 cooperative supporters on the pixel card.
- **Server Market Level Buff (`PASAR MALAM • LV.1–5`)**:
  - Every **Rp 3.0M** pooled in the server co-op raises the server market level (`Lv.1` to `Lv.5`), granting **+5% Work & Passive Yield** per level above 1 (up to **+20%** at `Lv.5`) to all players in the server.
- **Gem Economy (`💎`) & Dual-Currency Skin Shop (`/shop`)**:
  - Players earn **`+1 💎 Gem`** per level-up and daily claim (**`+2 💎`** on 3+ day streaks) and can unlock card themes using either **Cash (`Rp`)** or **Gems (`💎`)**.
- **Public Card Button Ownership Guard & In-Memory Test Isolation (`:memory:`)**:
  - Prevents other users from overwriting a player's public `/portfolio` dashboard and isolates `bun test` runs in `:memory:` SQLite (`20 test suites / 313 assertions PASS`).
