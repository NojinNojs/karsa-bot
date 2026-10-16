import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  job_title: text("job_title").notNull().default("FOUNDER KEDAI"),
  badge: text("badge").notNull().default("WARGA BARU"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  balance: integer("balance").notNull().default(5000000),
  emergency_fund: integer("emergency_fund").notNull().default(1000000),
  gems: integer("gems").notNull().default(1),
  karma: integer("karma").notNull().default(75),
  pinjol_debt: integer("pinjol_debt").notNull().default(0),
  pinjol_strikes: integer("pinjol_strikes").notNull().default(0),
  coop_shares: integer("coop_shares").notNull().default(0),
  skin_id: text("skin_id").notNull().default("retro_gold"),
  owned_skins: text("owned_skins").notNull().default('["retro_gold"]'),
  active_quest: text("active_quest").notNull().default("Bantu 2 warga lunasi pinjol"),
  last_work_at: integer("last_work_at").notNull().default(0),
  last_daily_at: integer("last_daily_at").notNull().default(0),
  created_at: integer("created_at").notNull(),
});

export const user_businesses = sqliteTable(
  "user_businesses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    user_id: text("user_id").notNull(),
    biz_type: text("biz_type").notNull(),
    name: text("name").notNull(),
    level: integer("level").notNull().default(1),
    value: integer("value").notNull(),
    daily_yield: integer("daily_yield").notNull(),
    ethical_mode: integer("ethical_mode").notNull().default(1),
  },
  (table) => [uniqueIndex("user_businesses_user_id_biz_type_unique").on(table.user_id, table.biz_type)]
);

export const server_coop = sqliteTable("server_coop", {
  guild_id: text("guild_id").primaryKey(),
  pool_balance: integer("pool_balance").notNull().default(25000000),
  eco_level: integer("eco_level").notNull().default(4),
  eco_health: integer("eco_health").notNull().default(90),
  rescued_count: integer("rescued_count").notNull().default(0),
});

export const ledger_logs = sqliteTable("ledger_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_id: text("user_id").notNull(),
  kind: text("kind").notNull(),
  amount: integer("amount").notNull(),
  note: text("note").notNull(),
  created_at: integer("created_at").notNull(),
});
