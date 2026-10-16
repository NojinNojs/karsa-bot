export interface WorkDilemma {
  id: string;
  title: string;
  context: string;
  ethicalChoice: {
    label: string;
    rewardRp: number;
    karmaDelta: number;
    xpDelta: number;
    outcomeText: string;
  };
  corruptChoice: {
    label: string;
    rewardRp: number;
    fineRp: number;
    auditChance: number;
    karmaDelta: number;
    xpDelta: number;
    successText: string;
    bustedText: string;
  };
}

export const WORK_DILEMMAS: WorkDilemma[] = [
  {
    id: "kopi_beans",
    title: "Karung Biji Kopi Pagi Ini",
    context:
      "Karung Gayo dari pengepul langganan naik harga. Sales keliling nawarin biji campuran jagung sangrai — separuh harga, warna mirip.",
    ethicalChoice: {
      label: "Tetap tebus Gayo asli",
      rewardRp: 450_000,
      karmaDelta: 5,
      xpDelta: 40,
      outcomeText: "Ojol & anak kantor antre kayak biasa. Gelas habis sebelum jam 9 malam.",
    },
    corruptChoice: {
      label: "Campur separuh jagung sangrai",
      rewardRp: 950_000,
      fineRp: 1_200_000,
      auditChance: 0.55,
      karmaDelta: -15,
      xpDelta: 15,
      successText: "Modal irit separuh, malam ini laci kasir tebal.",
      bustedText:
        "Pelanggan tetap nyium bau gosong jagung, foto gelasnya rame di grup warga. Omzet besoknya anjlok!",
    },
  },
  {
    id: "sponsor_struk",
    title: "Stiker di Meja Kasir",
    context:
      "Orang tak dikenal mampir bawa amplop coklat: titip stiker QR 'Spin Malam Ini' di kaca etalase selama seminggu.",
    ethicalChoice: {
      label: "Usir halus, tempel stiker kupon kopi",
      rewardRp: 550_000,
      karmaDelta: 8,
      xpDelta: 40,
      outcomeText: "Stempel 'beli 9 gratis 1' bikin pelanggan balik terus tiap sore.",
    },
    corruptChoice: {
      label: "Terima amplopnya, tempel di pojok",
      rewardRp: 1_400_000,
      fineRp: 2_500_000,
      auditChance: 0.7,
      karmaDelta: -25,
      xpDelta: 15,
      successText: "Amplop masuk laci, belum ada yang ngeh.",
      bustedText:
        "QRIS warung ikut diblokir bank gara-gara satu jaringan sama stiker itu. Seharian gak bisa terima bayaran!",
    },
  },
  {
    id: "pajak_umkm",
    title: "Catat Buku Kas Akhir Bulan",
    context:
      "Teman sesama pedagang bisikin cara bikin dua buku kas biar iuran lingkungan & retribusi pasar kelihatan kecil.",
    ethicalChoice: {
      label: "Satu buku apa adanya",
      rewardRp: 500_000,
      karmaDelta: 6,
      xpDelta: 40,
      outcomeText: "Pengurus pasar percaya penuh. Sewa lapak dapat potongan 15%.",
    },
    corruptChoice: {
      label: "Bikin buku kedua yang dikecilin",
      rewardRp: 1_100_000,
      fineRp: 1_800_000,
      auditChance: 0.6,
      karmaDelta: -18,
      xpDelta: 15,
      successText: "Iuran bulan ini lolos murah.",
      bustedText:
        "Petugas pasar cocokin nota supplier sama buku kas — ketahuan selisih jauh, kena denda dua kali lipat!",
    },
  },
  {
    id: "gula_aren_asli",
    title: "Jerigen Gula Aren Cair",
    context:
      "Stok gula aren asli Lebak menipis. Pedagang grosir nawarin sirup pemanis buatan rasa karamel yang harganya cuma sepertiga.",
    ethicalChoice: {
      label: "Pakai gula aren Lebak murni",
      rewardRp: 480_000,
      karmaDelta: 5,
      xpDelta: 40,
      outcomeText: "Wangi aren aslinya kecium sampai parkiran motor, pelanggan nambah pesanan bungkus.",
    },
    corruptChoice: {
      label: "Oplos sirup pemanis buatan",
      rewardRp: 1_000_000,
      fineRp: 1_500_000,
      auditChance: 0.58,
      karmaDelta: -16,
      xpDelta: 15,
      successText: "Biaya bahan manis hemat banyak malam ini.",
      bustedText: "Banyak pembeli komplain batuk & rasa pahit kimia di tenggorokan, rating warung jatuh!",
    },
  },
  {
    id: "susu_evaporasi",
    title: "Kaleng Susu di Gudang Belakang",
    context:
      "Ada 1 dus susu segar yang masa kedaluwarsanya tinggal malam ini, sementara agen nawarin krimer kental murah buat besok.",
    ethicalChoice: {
      label: "Beli stok susu segar baru",
      rewardRp: 520_000,
      karmaDelta: 6,
      xpDelta: 40,
      outcomeText: "Foam cappuccino-nya tebal dan lembut, rombongan anak kuliahan betah nongkrong.",
    },
    corruptChoice: {
      label: "Pakai sisa kaleng & encerkan air",
      rewardRp: 980_000,
      fineRp: 1_600_000,
      auditChance: 0.62,
      karmaDelta: -18,
      xpDelta: 15,
      successText: "Stok lama habis terpakai tanpa keluar modal baru.",
      bustedText:
        "Susu pecah pas diseduh air panas di depan pembeli, harus ganti rugi dan buang satu termos!",
    },
  },
  {
    id: "hujan_es_batu",
    title: "Kiriman Es Batu Kristal",
    context:
      "Truk es batu kristal terlambat karena macet. Tukang es balok pinggir jalan nawarin es balok mentah harga miring.",
    ethicalChoice: {
      label: "Tunggu es kristal matang RO",
      rewardRp: 460_000,
      karmaDelta: 5,
      xpDelta: 40,
      outcomeText: "Pembeli tenang karena es-nya bening dan higienis.",
    },
    corruptChoice: {
      label: "Pecahin es balok mentah",
      rewardRp: 920_000,
      fineRp: 1_450_000,
      auditChance: 0.6,
      karmaDelta: -17,
      xpDelta: 15,
      successText: "Pesanan es kopi tetap jalan cepat meski truk telat.",
      bustedText: "Warga nemu serpihan karung di dasar gelas es kopi, paguyuban pasar langsung tegur keras!",
    },
  },
  {
    id: "timbangan_roastery",
    title: "Titipan Biji Sangrai Tetangga",
    context:
      "Pedagang lapak sebelah nitip giling 5 kg biji kopi mereka di mesin grinder kamu dengan ongkos jasa giling.",
    ethicalChoice: {
      label: "Timbang pas 5 kg tanpa kurang",
      rewardRp: 510_000,
      karmaDelta: 7,
      xpDelta: 40,
      outcomeText: "Tetangga lapak puas banget, besoknya mereka ikut rekomendasiin warungmu.",
    },
    corruptChoice: {
      label: "Serok 500 gram masuk toples sendiri",
      rewardRp: 1_050_000,
      fineRp: 1_750_000,
      auditChance: 0.65,
      karmaDelta: -20,
      xpDelta: 15,
      successText: "Dapat tambahan stok bubuk kopi gratis.",
      bustedText:
        "Tetangga lapak nimbang ulang di timbangan digital mereka — selisih setengah kilo bikin geger satu blok!",
    },
  },
  {
    id: "kembalian_parkir",
    title: "Uang Kembalian Rombongan Malam",
    context:
      "Rombongan pembeli buru-buru bayar tunai Rp 200.000 saat hujan turun dan lupa menghitung uang kembalian Rp 50.000.",
    ethicalChoice: {
      label: "Kejar ke parkiran, balikin Rp 50rb",
      rewardRp: 490_000,
      karmaDelta: 9,
      xpDelta: 45,
      outcomeText: "Rombongan itu terharu, besoknya mereka borong 30 cup buat rapat kantor!",
    },
    corruptChoice: {
      label: "Diam-diam kantongi selisihnya",
      rewardRp: 900_000,
      fineRp: 1_400_000,
      auditChance: 0.55,
      karmaDelta: -16,
      xpDelta: 10,
      successText: "Uang lebih masuk kantong malam ini.",
      bustedText: "Mereka balik 10 menit kemudian cek struk, malu berat di depan antrean pelanggan lain!",
    },
  },
];
