import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderAvatarV3 } from "./renderer/renderAvatarV3.ts";
import { renderBannerV3 } from "./renderer/renderBannerV3.ts";

const outDir = resolve(process.cwd(), "output");
mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, "bot_avatar_512.png"), renderAvatarV3());
writeFileSync(resolve(outDir, "bot_banner_680x240.png"), renderBannerV3());
console.log("Rendered V3 Avatar (512x512) & Banner (680x240)!");
