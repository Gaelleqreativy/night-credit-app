require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
