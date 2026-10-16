import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { renderAvatarV3 } from "./renderer/renderAvatarV3.ts";

const avatarBuf = renderAvatarV3();
GlobalFonts.registerFromPath(resolve(process.cwd(), "assets/fonts/PressStart2P.ttf"), "PS2P");
GlobalFonts.registerFromPath(resolve(process.cwd(), "assets/fonts/Silkscreen.ttf"), "SILK");
const outDir = resolve(process.cwd(), "output");
writeFileSync(resolve(outDir, "bot_avatar_512.png"), avatarBuf);

const img = await loadImage(avatarBuf);
const preview = createCanvas(640, 240);
const ctx = preview.getContext("2d");

// Discord dark theme chat background (#313338)
ctx.fillStyle = "#313338";
ctx.fillRect(0, 0, 640, 240);

function drawCircleAvatar(cx: number, cy: number, size: number, statusDot = true) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + size / 2, cy + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, cx, cy, size, size);
  ctx.restore();

  if (statusDot) {
    const r = Math.max(5, Math.round(size * 0.14));
    const dx = cx + size - r * 0.85;
    const dy = cy + size - r * 0.85;
    ctx.beginPath();
    ctx.arc(dx, dy, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = "#313338";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#23A55A"; // Discord online green
    ctx.fill();
  }
}

// 1. Large Profile Popup (128x128)
drawCircleAvatar(36, 56, 128, true);

// 2. Chat Message Mockup (40x40)
drawCircleAvatar(210, 64, 40, true);
ctx.fillStyle = "#F2F3F5";
ctx.font = "12px PS2P";
ctx.fillText("Karsa", 264, 80);
ctx.fillStyle = "#5865F2";
const kw = ctx.measureText("Karsa").width;
ctx.fillRect(264 + kw + 8, 66, 36, 18);
ctx.fillStyle = "#FFFFFF";
ctx.font = "8px SILK";
ctx.fillText("APP", 264 + kw + 16, 79);
ctx.fillStyle = "#DBDEE1";
ctx.font = "8px SILK";
ctx.fillText("Laci kas warungmu bertambah +Rp 1,6 Jt hari ini!", 264, 102);

// 3. Member List Mockup (32x32)
drawCircleAvatar(210, 140, 32, true);
ctx.fillStyle = "#F2F3F5";
ctx.font = "10px PS2P";
ctx.fillText("Karsa", 254, 156);
ctx.fillStyle = "#949BA4";
ctx.font = "8px SILK";
ctx.fillText("Playing Pasar Malam • Lv.4", 254, 172);

writeFileSync(resolve(outDir, "discord_pp_preview.png"), preview.toBuffer("image/png"));
console.log("Rendered avatar + discord_pp_preview.png!");
