import sharp from "sharp";
import { fileURLToPath } from "url";

const iconsDir = fileURLToPath(new URL("../public/icons/", import.meta.url));

function createSVG(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c6de4"/>
      <stop offset="100%" style="stop-color:#5244a8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="50%" y="54%" font-family="system-ui,sans-serif" font-size="${size * 0.55}" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="middle">R</text>
</svg>`);
}

await sharp(createSVG(192)).png().toFile(`${iconsDir}icon-192.png`);
await sharp(createSVG(512)).png().toFile(`${iconsDir}icon-512.png`);

console.log("PWA icons generated!");
