const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { formatPhoneNumber } = require('./formatNumber');

let logoCache = null;
function getLogoBase64() {
    if (logoCache !== null) return logoCache;
    try {
        const logoPath = path.resolve(__dirname, '..', '..', 'assets', 'logo.png');
        const buf = fs.readFileSync(logoPath);
        logoCache = `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
        logoCache = null;
    }
    return logoCache;
}

function buildCardSvg(number) {
    const size = 800;
    const logo = getLogoBase64();
    const logoSize = size * 0.14;
    const logoX = size - logoSize - size * 0.035;
    const logoY = size * 0.035;
    const fontSize = size * 0.060;
    const formatted = formatPhoneNumber(number);
    const borderWidth = size * 0.004;
    const borderColor = 'rgba(255,255,255,0.10)'; // как у тебя на сайте
    return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="logoClip">
      <circle cx="${logoX + logoSize / 2}" cy="${logoY + logoSize / 2}" r="${logoSize / 2}" />
    </clipPath>
  </defs>

  <rect width="${size}" height="${size}" fill="#5a17cc" />
  <rect width="${size}" height="${size}" fill="#721aff" opacity="0.85" />

  ${logo ? `<image href="${logo}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}"
         preserveAspectRatio="xMidYMid slice"
         clip-path="url(#logoClip)" opacity="0.6" />` : ''}

  <text x="${size / 2 + 2}" y="${size * 0.87 + 2}" font-family="DejaVu Sans, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="rgba(0,0,0,0.45)" text-anchor="middle" letter-spacing="2">${formatted}</text>
  <text x="${size / 2}" y="${size * 0.87}" font-family="DejaVu Sans, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="#ffffff" text-anchor="middle" letter-spacing="2">${formatted}</text>
</svg>`.trim();
}

async function renderCardPng(number) {
    const svg = buildCardSvg(number);
    return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { renderCardPng };