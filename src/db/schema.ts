import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  job_title: text("job_title").notNull().default("PERACIK KOPI"),
  badge: text("badge").notNull().default("WARGA BARU"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  cash: integer("cash").notNull().default(500000),
  balance: integer("balance").notNull().default(500000),
  emergency_fund: integer("emergency_fund").notNull().default(0),
  gems: integer("gems").notNull().default(0),
  karma: integer("karma").notNull().default(60),
  pinjol_debt: integer("pinjol_debt").notNull().default(0),
  pinjol_strikes: integer("pinjol_strikes").notNull().default(0),
  is_seized: integer("is_seized").notNull().default(0),
  business_level: integer("business_level").notNull().default(1),
  coop_shares: integer("coop_shares").notNull().default(0),
  skin_id: text("skin_id").notNull().default("retro_gold"),
  owned_skins: text("owned_skins").notNull().default('["retro_gold"]'),
  active_quest: text("active_quest").notNull().default("Kerja 3 shift jujur di /work untuk naik ke Lv.2"),
  daily_streak: integer("daily_streak").notNull().default(0),
  last_work_at: integer("last_work_at").notNull().default(0),
  last_passive_at: integer("last_passive_at").notNull().default(0),
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
    base_value: integer("base_value").notNull().default(0),
    income_rate: integer("income_rate").notNull().default(0),
    value: integer("value").notNull().default(0),
    daily_yield: integer("daily_yield").notNull().default(0),
    ethical_mode: integer("ethical_mode").notNull().default(1),
  },
  (table) => [uniqueIndex("user_businesses_user_id_biz_type_unique").on(table.user_id, table.biz_type)],
);

export const server_coop = sqliteTable("server_coop", {
  guild_id: text("guild_id").primaryKey(),
  total_pool: integer("total_pool").notNull().default(0),
  target_pool: integer("target_pool").notNull().default(50000000),
  level: integer("level").notNull().default(1),
  contributors_json: text("contributors_json").notNull().default("{}"),
  pool_balance: integer("pool_balance").notNull().default(0),
  eco_level: integer("eco_level").notNull().default(1),
  eco_health: integer("eco_health").notNull().default(0),
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
