import { stmt } from "./connection.ts";
import type { UserBusinessRow, UserRow } from "./types.ts";

export function hasUserAccount(userId: string): boolean {
  const row = stmt("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | null;
  return row !== null;
}

export function computeProgressionQuest(user: UserRow, businesses: UserBusinessRow[]): string {
  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return "Seduh kopi lalu klik Bayar Segel di bawah";
  }
  const kedai = businesses.find((b) => b.biz_type === "kedai_kopi");
  const brankas = businesses.find((b) => b.biz_type === "brankas_darurat");
  const saham = businesses.find((b) => b.biz_type === "saham_koperasi");

  if (user.level < 2) return "Klik Seduh Kopi 3x untuk naik ke Lv.2";
  if ((kedai?.level ?? 1) < 2) return "Naikkan Kedai Kopi ke Lv.2 di Kelola Usaha";
  if ((brankas?.level ?? 0) < 1) return "Buka Tabungan Emas Lv.1 di Kelola Usaha";
  if ((kedai?.level ?? 1) < 3) return "Naikkan Kedai Kopi ke Lv.3 di Kelola Usaha";
  if ((saham?.level ?? 0) < 1) return "Buka Koperasi Warga Lv.1 di Kelola Usaha";
  return "Patungan kas atau tebus warga di Koperasi";
}

export function formatCooldown(ms: number): string {
  if (ms <= 0) return "0d";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}j ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}d`;
  return `${seconds}d`;
}
