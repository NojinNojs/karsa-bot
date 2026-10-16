import { createCanvas } from "@napi-rs/canvas";
import { drawSideMugMotif } from "./avatarMugMotif.ts";

export { drawSideMugMotif };

/**
 * Renders the 512x512 Discord Bot Profile Picture from a bold 32x32 native pixel
 * grid upscaled 16x (1 logical pixel = 16x16 screen pixels).
 * - Fills ~70% of the circle so it passes the Discord 32px/40px Squint Test!
 */
export function renderAvatarV3(): Buffer {
  const W = 32;
  const H = 32;
  const SCALE = 16;

  const c = createCanvas(W, H);
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;

  const cx = 15.5;
  const cy = 15.5;

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let col = "#191324";
      if (dist <= 15.3 && dist > 14.2) {
        col = "#0B080E"; // outer dark rim
      } else if (dist <= 14.2 && dist > 12.8) {
        col = dx + dy < -3 ? "#FFE08A" : dx + dy > 4 ? "#A86E1E" : "#F4B446"; // bold gold medallion ring
      } else if (dist <= 12.8 && dist > 11.8) {
        col = "#0B080E"; // inner ink ring
      } else if (dist <= 11.8) {
        if (dist < 7.5) {
          col = (px + py) & 1 ? "#352844" : "#2B2038";
        } else {
          col = (px + py) & 1 ? "#241B2E" : "#1C1524";
        }
      }
      x.fillStyle = col;
      x.fillRect(px, py, 1, 1);
    }
  }

  // Center the 24x22 bold mug inside the 32x32 medallion at (x=5, y=5)
  drawSideMugMotif(x, 5, 5, 1);

  const out = createCanvas(W * SCALE, H * SCALE);
  const ox = out.getContext("2d");
  ox.imageSmoothingEnabled = false;
  ox.drawImage(c, 0, 0, W * SCALE, H * SCALE);
  return out.toBuffer("image/png");
}
