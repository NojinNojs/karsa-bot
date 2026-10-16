import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buyOrUpgradeBusiness,
  claimDailyBonus,
  claimPassiveIncome,
  equipOrBuySkin,
  getOrCreateServerCoop,
  getOrCreateUser,
  getTopLeaderboard,
  getUserBusinesses,
  investOrRescueCoop,
  sqlite,
  takeShortcutGambleOrPinjol,
  workShift,
} from "./db/index.ts";
import { renderAzabCard, renderCoopCard, renderLeaderboardCard, renderPortfolioCard } from "./renderer/pixelCard.ts";

export async function runRenderTests(): Promise<void> {
  const outDir = resolve(process.cwd(), "output");
  mkdirSync(outDir, { recursive: true });

  // Reset demo user Aqsan for deterministic showcase
  sqlite.query("DELETE FROM users WHERE id = 'aqsan_founder'").run();
  sqlite.query("DELETE FROM user_businesses WHERE user_id = 'aqsan_founder'").run();
  sqlite.query("DELETE FROM ledger_logs WHERE user_id = 'aqsan_founder'").run();

  const user = getOrCreateUser("aqsan_founder", "AQSAN");
  const businesses = getUserBusinesses("aqsan_founder");
  const coop = getOrCreateServerCoop("guild_kota_mandiri");

  // 1. Render Default Retro Arcade Gold Portfolio Card
  const t0 = performance.now();
  const goldPng = renderPortfolioCard({ user, businesses, coop, overrideSkin: "retro_gold" });
  const dtGold = (performance.now() - t0).toFixed(1);
  const goldPath = resolve(outDir, "portfolio_retro_gold.png");
  writeFileSync(goldPath, goldPng);
  console.log(`   ✅ [Render 1/6] portfolio_retro_gold.png (${(goldPng.length / 1024).toFixed(1)} KB in ${dtGold}ms)`);

  // 2. Render GameBoy DMG-01 Skin Preview
  const gbPng = renderPortfolioCard({ user, businesses, coop, overrideSkin: "gameboy_green" });
  const gbPath = resolve(outDir, "portfolio_gameboy_green.png");
  writeFileSync(gbPath, gbPng);
  console.log(`   ✅ [Render 2/6] portfolio_gameboy_green.png (${(gbPng.length / 1024).toFixed(1)} KB)`);

  // 3. Render Glodok Cyber 2077 Skin Preview
  const cyberPng = renderPortfolioCard({ user, businesses, coop, overrideSkin: "cyberpunk_neon" });
  const cyberPath = resolve(outDir, "portfolio_cyberpunk_neon.png");
  writeFileSync(cyberPath, cyberPng);
  console.log(`   ✅ [Render 3/6] portfolio_cyberpunk_neon.png (${(cyberPng.length / 1024).toFixed(1)} KB)`);

  // 4. Simulate a dummy victim taking illegal Pinjol & render Debt Collector Seizure Card
  sqlite.query("DELETE FROM users WHERE id = 'korban_pinjol'").run();
  const azabSim = takeShortcutGambleOrPinjol("korban_pinjol", "SI_NEKAT", "pinjol", "guild_kota_mandiri");
  const azabPng = renderAzabCard({
    username: "SI_NEKAT",
    mode: "pinjol",
    cashLost: azabSim.cashLost,
    totalDebt: azabSim.totalDebt,
    assetSeizedName: azabSim.assetSeizedName,
    karmaAfter: 20,
  });
  const azabPath = resolve(outDir, "azab_pinjol_card.png");
  writeFileSync(azabPath, azabPng);
  console.log(`   ✅ [Render 4/6] azab_pinjol_card.png (${(azabPng.length / 1024).toFixed(1)} KB)`);

  const coopPng = renderCoopCard(coop);
  writeFileSync(resolve(outDir, "koperasi_card.png"), coopPng);
  console.log(`   ✅ [Render 5/6] koperasi_card.png (${(coopPng.length / 1024).toFixed(1)} KB)`);

  // 5. Exercise workShift, upgrade, passive claim, daily bonus, leaderboard, and koperasi rescue
  const shift = workShift("aqsan_founder", "AQSAN", "ethical", 0);
  const claim = claimPassiveIncome("aqsan_founder", "AQSAN");
  const daily = claimDailyBonus("aqsan_founder", "AQSAN");
  const upg = buyOrUpgradeBusiness("aqsan_founder", "AQSAN", "kedai_kopi");
  const rescue = investOrRescueCoop("aqsan_founder", "AQSAN", "rescue", "guild_kota_mandiri");
  const skinEquip = equipOrBuySkin("aqsan_founder", "AQSAN", "retro_gold");
  const topLeaders = getTopLeaderboard(5);

  const leaderboardPng = renderLeaderboardCard(topLeaders, coop);
  writeFileSync(resolve(outDir, "leaderboard_card.png"), leaderboardPng);
  console.log(`   ✅ [Render 6/6] leaderboard_card.png (${(leaderboardPng.length / 1024).toFixed(1)} KB)`);

  console.log(
    `   📊 [Simulasi Ekonomi] Shift Jujur: +Rp${(shift.deltaRp / 1_000_000).toFixed(2)}Jt | Klaim Dividen: +Rp${(claim.net / 1_000_000).toFixed(2)}Jt | Daily Bonus: +Rp${(daily.rewardRp / 1_000).toFixed(0)}Rb (Streak ${daily.streak}x) | Upgrade Kedai: Lv.${upg.nextLevel} | Rescue Koperasi: ${rescue.ok} | Top Leaderboard: ${topLeaders.length} warga | Skin: ${skinEquip.user.skin_id}`,
  );
}

if (import.meta.main) {
  await runRenderTests();
}
