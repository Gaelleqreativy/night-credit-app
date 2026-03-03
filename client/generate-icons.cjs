/**
 * Génère les icônes PNG pour la PWA SpiritTab
 * Utilise Jimp (pur JS, pas de dépendances natives)
 * Usage : node generate-icons.cjs
 */
const Jimp = require('jimp')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, 'public')
const SRC = path.join(__dirname, 'public', 'Spirit-Group.png')

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

// Fond blanc pour les icônes PWA
const BG_COLOR = 0xffffffff

async function makeIcon(size, outFile) {
  const logo = await Jimp.read(SRC)

  // Padding 12% pour que le logo ne soit pas collé aux bords
  const padding = Math.round(size * 0.12)
  const maxLogoSize = size - padding * 2

  // Redimensionner proportionnellement pour tenir dans maxLogoSize x maxLogoSize
  const lw = logo.getWidth()
  const lh = logo.getHeight()
  const scale = Math.min(maxLogoSize / lw, maxLogoSize / lh)
  logo.resize(Math.round(lw * scale), Math.round(lh * scale))

  // Fond blanc carré
  const img = new Jimp(size, size, BG_COLOR)

  // Centrer le logo
  const x = Math.round((size - logo.getWidth()) / 2)
  const y = Math.round((size - logo.getHeight()) / 2)
  img.composite(logo, x, y)

  await img.writeAsync(outFile)
  console.log(`✓ ${outFile}`)
}

;(async () => {
  console.log('Génération des icônes PWA SpiritTab...')
  await makeIcon(192,  path.join(OUT, 'pwa-192x192.png'))
  await makeIcon(512,  path.join(OUT, 'pwa-512x512.png'))
  await makeIcon(180,  path.join(OUT, 'apple-touch-icon.png'))
  await makeIcon(32,   path.join(OUT, 'favicon-32.png'))
  console.log('\nToutes les icônes générées dans client/public/')
})()
