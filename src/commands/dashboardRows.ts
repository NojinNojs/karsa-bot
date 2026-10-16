import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { DAILY_COOLDOWN_MS, type UserRow } from "../db/index.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildCooldownTag, buildFeedbackModal, buildOnboardingPrompt } from "./onboardingAndFeedbackUi.ts";

export { buildCooldownTag, buildFeedbackModal, buildOnboardingPrompt };

function btn(id: string, label: string, style: ButtonStyle, disabled = false): ButtonBuilder {
  return new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled);
}

export function buildDashboardRows(user: UserRow, now = Date.now()): ActionRowBuilder<ButtonBuilder>[] {
  const inDebt = user.is_seized === 1 || user.pinjol_debt > 0;
  const dailyReady = !user.last_daily_at || now >= user.last_daily_at + DAILY_COOLDOWN_MS;
  const coopUnlocked = user.level >= 2;
  const hasLiquid = user.balance > 0;

  if (inDebt) {
    const r1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      btn(CUSTOM_IDS.BTN_WORK, "☕ Seduh Cari Uang", ButtonStyle.Primary),
      btn(
        CUSTOM_IDS.BTN_REPAY_DEBT,
        `💸 Bayar Segel (${formatRpShort(user.pinjol_debt)})`,
        hasLiquid ? ButtonStyle.Success : ButtonStyle.Secondary,
        !hasLiquid,
      ),
      btn(CUSTOM_IDS.BTN_REPAY_MODAL_OPEN, "✍️ Cicil Nominal", ButtonStyle.Primary, !hasLiquid),
      btn(CUSTOM_IDS.BTN_BISNIS, "🔒 Usaha Disegel", ButtonStyle.Secondary, true),
    );
    const r2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      btn(
        CUSTOM_IDS.BTN_DAILY,
        dailyReady ? "☀️ Uang Harian" : "✅ Harian Diambil",
        dailyReady ? ButtonStyle.Primary : ButtonStyle.Secondary,
        !dailyReady,
      ),
      btn(CUSTOM_IDS.BTN_KOPERASI, coopUnlocked ? "🤝 Koperasi" : "🔒 Koperasi (Lv.2)", ButtonStyle.Secondary, !coopUnlocked),
      btn(CUSTOM_IDS.BTN_KOPERASI_TALANGI, "🛟 Minta Tebus Warga", ButtonStyle.Secondary, !coopUnlocked),
      btn(CUSTOM_IDS.BTN_HELP, "📖 Panduan", ButtonStyle.Secondary),
      btn(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH, "🔄 Segarkan", ButtonStyle.Secondary),
    );
    return [r1, r2];
  }

  const r1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    btn(CUSTOM_IDS.BTN_WORK, "☕ Seduh Kopi", ButtonStyle.Primary),
    btn(CUSTOM_IDS.BTN_BISNIS, "🏪 Kelola Usaha", ButtonStyle.Success),
    btn(CUSTOM_IDS.BTN_KOPERASI, coopUnlocked ? "🤝 Koperasi" : "🔒 Koperasi (Lv.2)", ButtonStyle.Secondary, !coopUnlocked),
    btn(CUSTOM_IDS.BTN_JALAN_PINTAS, "⚡ Talangan", ButtonStyle.Danger),
  );
  const r2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    btn(
      CUSTOM_IDS.BTN_DAILY,
      dailyReady ? "☀️ Uang Harian" : "✅ Harian Diambil",
      dailyReady ? ButtonStyle.Primary : ButtonStyle.Secondary,
      !dailyReady,
    ),
    btn(CUSTOM_IDS.BTN_SHOP, "🎨 Tema", ButtonStyle.Secondary),
    btn(CUSTOM_IDS.BTN_LEADERBOARD, "🏆 Peringkat", ButtonStyle.Secondary),
    btn(CUSTOM_IDS.BTN_HELP, "📖 Panduan", ButtonStyle.Secondary),
    btn(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH, "🔄 Segarkan", ButtonStyle.Secondary),
  );
  return [r1, r2];
}

export const buildStateAwarePortfolioRows = buildDashboardRows;
