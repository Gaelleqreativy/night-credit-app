/**
 * Génère les icônes PNG pour la PWA SpiritTab
 * Utilise Jimp (pur JS, pas de dépendances natives)
 * Usage : node generate-icons.cjs
 */
const Jimp = require('jimp')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, 'public')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

// Couleurs SpiritTab
const BG    = 0x1e1b4bff  // indigo foncé
const LIGHT = 0xe0e7ffff  // bleu clair (lune)
const ACCT  = 0x818cf8ff  // violet accent
const BG2   = 0x1e1b4bff  // masque lune

function drawCircle(img, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r ** 2) {
        img.setPixelColor(color, x, y)
      }
    }
  }
}

function drawRect(img, x1, y1, w, h, color) {
  for (let y = y1; y < y1 + h; y++)
    for (let x = x1; x < x1 + w; x++)
      img.setPixelColor(color, x, y)
}

function roundRect(img, w, h, r, color) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Coins arrondis
      const inCorner = (
        (x < r && y < r && (x - r) ** 2 + (y - r) ** 2 > r ** 2) ||
        (x > w - r && y < r && (x - (w - r)) ** 2 + (y - r) ** 2 > r ** 2) ||
        (x < r && y > h - r && (x - r) ** 2 + (y - (h - r)) ** 2 > r ** 2) ||
        (x > w - r && y > h - r && (x - (w - r)) ** 2 + (y - (h - r)) ** 2 > r ** 2)
      )
      if (!inCorner) img.setPixelColor(color, x, y)
    }
  }
}

async function generateIcon(size) {
  const img = new Jimp(size, size, 0x00000000)
  const s = size / 512  // scale factor

  // Fond arrondi
  roundRect(img, size, size, Math.round(112 * s), BG)

  // Lune (cercle clair)
  drawCircle(img, Math.round(256 * s), Math.round(210 * s), Math.round(120 * s), LIGHT)
  // Masque lune (crée le croissant)
  drawCircle(img, Math.round(306 * s), Math.round(175 * s), Math.round(105 * s), BG2)

  // Ligne décorative
  drawRect(img, Math.round(130 * s), Math.round(355 * s), Math.round(252 * s), Math.round(14 * s), ACCT)

  // Petites étoiles
  drawCircle(img, Math.round(148 * s), Math.round(210 * s), Math.round(10 * s), ACCT)
  drawCircle(img, Math.round(388 * s), Math.round(155 * s), Math.round(7 * s), 0xa5b4fcff)
  drawCircle(img, Math.round(370 * s), Math.round(290 * s), Math.round(5 * s), 0xc7d2feff)

  const file = path.join(OUT, `pwa-${size}x${size}.png`)
  await img.writeAsync(file)
  console.log(`✓ ${file}`)
}

async function generateAppleIcon() {
  // Apple touch icon 180x180 (fond plein, pas arrondi — iOS gère les coins)
  const size = 180
  const img = new Jimp(size, size, BG)
  const s = size / 512

  drawCircle(img, Math.round(256 * s), Math.round(210 * s), Math.round(120 * s), LIGHT)
  drawCircle(img, Math.round(306 * s), Math.round(175 * s), Math.round(105 * s), BG)
  drawRect(img, Math.round(130 * s), Math.round(355 * s), Math.round(252 * s), Math.round(14 * s), ACCT)
  drawCircle(img, Math.round(148 * s), Math.round(210 * s), Math.round(10 * s), ACCT)

  const file = path.join(OUT, 'apple-touch-icon.png')
  await img.writeAsync(file)
  console.log(`✓ ${file}`)
}

;(async () => {
  console.log('Génération des icônes PWA SpiritTab...')
  await generateIcon(192)
  await generateIcon(512)
  await generateAppleIcon()

  // Copie icon.svg → favicon.svg
  const svgSrc = path.join(__dirname, 'public', 'icon.svg')
  const svgDst = path.join(__dirname, 'public', 'favicon.svg')
  if (fs.existsSync(svgSrc)) { fs.copyFileSync(svgSrc, svgDst); console.log(`✓ ${svgDst}`) }

  console.log('\nToutes les icônes générées dans client/public/')
})()
