/**
 * Service de stockage de fichiers.
 * - Si CLOUDINARY_URL est défini → upload vers Cloudinary (prod)
 * - Sinon → sauvegarde sur disque local (dev)
 */
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

let cloudinary = null

if (process.env.CLOUDINARY_URL) {
  cloudinary = require('cloudinary').v2
  // cloudinary.config() lit automatiquement CLOUDINARY_URL
}

const uploadDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '../../uploads')

if (!cloudinary && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

/**
 * Sauvegarde un fichier et retourne son URL publique.
 * @param {Buffer} buffer  Contenu du fichier
 * @param {string} originalName  Nom d'origine (pour déduire l'extension)
 * @param {string} mimetype
 * @returns {Promise<string>} URL publique
 */
async function saveFile(buffer, originalName, mimetype) {
  const ext = path.extname(originalName).toLowerCase()

  if (cloudinary) {
    // Upload vers Cloudinary
    const resourceType = ext === '.pdf' ? 'raw' : 'image'
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'spirittab/tickets', resource_type: resourceType },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      stream.end(buffer)
    })
    return result.secure_url
  }

  // Stockage local
  const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`
  const filepath = path.join(uploadDir, filename)
  await fs.promises.writeFile(filepath, buffer)
  return `/uploads/${filename}`
}

module.exports = { saveFile }
