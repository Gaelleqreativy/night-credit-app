const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// ── Stockage disque local (logos) ─────────────────────────────────────────────

const uploadDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`)
  },
})

// ── Tickets : mémoire → storage.js décide (local ou Cloudinary) ──────────────

const ticketFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) cb(null, true)
  else cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP ou PDF'))
}

const uploadTicket = multer({
  storage: multer.memoryStorage(),
  fileFilter: ticketFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
})

// ── Logos ─────────────────────────────────────────────────────────────────────

const logoFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) cb(null, true)
  else cb(new Error('Format non supporté. Utilisez JPG, PNG ou WEBP'))
}

const uploadLogo = multer({
  storage: diskStorage,
  fileFilter: logoFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
})

// ── Excel ─────────────────────────────────────────────────────────────────────

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.xlsx') cb(null, true)
    else cb(new Error('Seuls les fichiers .xlsx sont acceptés'))
  },
  limits: { fileSize: 20 * 1024 * 1024 },
})

module.exports = { uploadTicket, uploadExcel, uploadLogo }
