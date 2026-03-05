require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')

const app = express()

app.use(cors({
  origin: (origin, cb) => {
    const allowed = process.env.CLIENT_URL || 'http://localhost:5173'
    // En dev : accepter aussi les IPs locales (test mobile sur WiFi)
    const localNet = process.env.NODE_ENV !== 'production' && /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)
    if (!origin || origin === allowed || localNet)
      return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '../uploads')
app.use('/uploads', express.static(uploadsDir))

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/establishments', require('./routes/establishments'))
app.use('/api/clients', require('./routes/clients'))
app.use('/api/transactions', require('./routes/transactions'))
app.use('/api/stats', require('./routes/stats'))
app.use('/api/import', require('./routes/import'))
app.use('/api/export', require('./routes/export'))
app.use('/api/audit', require('./routes/audit'))
app.use('/api/users', require('./routes/users'))
app.use('/api/notifications', require('./routes/notifications'))

app.get('/api/health', (req, res) => res.json({ ok: true }))

// En production : servir le frontend React buildé
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  // SPA fallback — toutes les routes non-API renvoient index.html
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
