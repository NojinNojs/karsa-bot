import { stmt } from "./connection.ts";
import type { FeedbackRow } from "./telemetryTypes.ts";

export function submitUserFeedback(userId: string, username: string, category: string, message: string): FeedbackRow {
  const now = Date.now();
  const cleanCat = (category || "Masukan Umum").trim().slice(0, 40);
  const cleanMsg = message.trim().slice(0, 500);
  stmt("INSERT INTO user_feedback (user_id, username, category, message, created_at) VALUES (?, ?, ?, ?, ?)").run(
    userId,
    username,
    cleanCat,
    cleanMsg,
    now,
  );
  return {
    id: 0,
    user_id: userId,
    username,
    category: cleanCat,
    message: cleanMsg,
    created_at: now,
  };
}

export function getRecentFeedback(limit = 8): FeedbackRow[] {
  return stmt("SELECT * FROM user_feedback ORDER BY id DESC LIMIT ?").all(Math.max(1, limit)) as FeedbackRow[];
}

export function getSystemMeta(key: string): string | null {
  const row = stmt("SELECT value FROM system_meta WHERE key = ?").get(key) as { value: string } | null;
  return row ? row.value : null;
}

export function setSystemMeta(key: string, value: string): void {
  stmt(
    "INSERT INTO system_meta (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  ).run(key, value, Date.now());
}
