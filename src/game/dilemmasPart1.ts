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

export const WORK_DILEMMAS_PART1: WorkDilemma[] = [
  {
    id: "kopi_beans",
    title: "Belanja Biji Kopi Pagi",
    context: "Harga biji Arabika Gayo naik Rp 15.000/kg di pasar induk. Pengepul belakang nawarin biji jagung sangrai buat campuran.",
    ethicalChoice: {
      label: "Tetap 100% Kopi Murni",
      rewardRp: 450_000,
      karmaDelta: 5,
      xpDelta: 35,
      outcomeText: "Pelanggan pagi puas sama aroma kopi asli warungmu!",
    },
    corruptChoice: {
      label: "Oplos Jagung 40%",
      rewardRp: 900_000,
      fineRp: 1_200_000,
      auditChance: 0.45,
      karmaDelta: -15,
      xpDelta: 15,
      successText: "Untung besar dari selisih bahan baku!",
      bustedText: "Pelanggan tetap komplain rasa kopi aneh dan nyebarin ke grup warga!",
    },
  },
  {
    id: "titip_edaran",
    title: "Tawaran Stiker Meja",
    context: "Orang tak dikenal nawarin uang tunai kalau boleh nempel stiker situs taruhan di meja kasir warungmu.",
    ethicalChoice: {
      label: "Tolak & Usir Halus",
      rewardRp: 400_000,
      karmaDelta: 8,
      xpDelta: 40,
      outcomeText: "Pengurus RT salut warungmu bersih dari promosi gelap!",
    },
    corruptChoice: {
      label: "Terima Uang Tempel",
      rewardRp: 1_100_000,
      fineRp: 1_800_000,
      auditChance: 0.55,
      karmaDelta: -25,
      xpDelta: 10,
      successText: "Uang stiker masuk kantong diam-diam.",
      bustedText: "Razia ketertiban pasar nyopot paksa stiker dan denda warungmu!",
    },
  },
  {
    id: "pajak_umkm",
    title: "Iuran Kebersihan & Kas Pasar",
    context: "Bendahara paguyuban keliling narik iuran wajib bulanan untuk lampu jalan dan angkut sampah pasar malam.",
    ethicalChoice: {
      label: "Bayar Sesuai Omzet",
      rewardRp: 500_000,
      karmaDelta: 6,
      xpDelta: 35,
      outcomeText: "Lampu tenda warungmu dipasangin bohlam baru paling terang!",
    },
    corruptChoice: {
      label: "Ngaku Warung Sepi",
      rewardRp: 850_000,
      fineRp: 1_300_000,
      auditChance: 0.4,
      karmaDelta: -12,
      xpDelta: 15,
      successText: "Berhasil ngeles dari iuran penuh bulan ini.",
      bustedText: "Ketahuan antrean warungmu paling panjang, kena denda paguyuban!",
    },
  },
];
