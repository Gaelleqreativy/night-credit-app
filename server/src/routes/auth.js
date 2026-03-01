const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 12 * 60 * 60 * 1000, // 12h
  path: '/',
}

const CLIENT_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000, // 24h
  path: '/',
}

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 10 * 60 * 1000 // 10 minutes

// POST /api/auth/login — Comptabilité
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Champs manquants' })

  const user = await prisma.user.findUnique({
    where: { email },
    include: { establishments: { include: { establishment: true } } },
  })
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

  // Vérifier le lockout
  if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
    const remaining = Math.ceil((user.loginLockedUntil - new Date()) / 60000)
    return res.status(429).json({ error: `Compte bloqué. Réessayez dans ${remaining} minute(s).` })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    const attempts = user.loginAttempts + 1
    const lockData = attempts >= MAX_ATTEMPTS
      ? { loginAttempts: 0, loginLockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }
      : { loginAttempts: attempts }
    await prisma.user.update({ where: { id: user.id }, data: lockData })
    const remaining = MAX_ATTEMPTS - attempts
    return res.status(401).json({
      error: remaining > 0
        ? `Email ou mot de passe incorrect. ${remaining} tentative(s) restante(s).`
        : 'Trop de tentatives. Compte bloqué 10 minutes.',
    })
  }

  // Succès : reset attempts
  await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, loginLockedUntil: null } })

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, establishmentIds: user.establishments.map((ue) => ue.establishmentId) },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  )

  res.cookie('adminToken', token, COOKIE_OPTS)
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      establishments: user.establishments.map((ue) => ue.establishment),
    },
  })
})

// POST /api/auth/client-login — Espace client
router.post('/client-login', async (req, res) => {
  const { phone, pin } = req.body
  if (!phone || !pin) return res.status(400).json({ error: 'Champs manquants' })

  const client = await prisma.client.findUnique({ where: { phone } })
  if (!client) return res.status(401).json({ error: 'Numéro ou PIN incorrect' })

  // Vérifier le lockout
  if (client.loginLockedUntil && client.loginLockedUntil > new Date()) {
    const remaining = Math.ceil((client.loginLockedUntil - new Date()) / 60000)
    return res.status(429).json({ error: `Compte bloqué. Réessayez dans ${remaining} minute(s).` })
  }

  const valid = await bcrypt.compare(pin, client.pin)
  if (!valid) {
    const attempts = client.loginAttempts + 1
    const lockData = attempts >= MAX_ATTEMPTS
      ? { loginAttempts: 0, loginLockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }
      : { loginAttempts: attempts }
    await prisma.client.update({ where: { id: client.id }, data: lockData })
    const remaining = MAX_ATTEMPTS - attempts
    return res.status(401).json({
      error: remaining > 0
        ? `Numéro ou PIN incorrect. ${remaining} tentative(s) restante(s).`
        : 'Trop de tentatives. Compte bloqué 10 minutes.',
    })
  }

  // Succès : reset attempts
  await prisma.client.update({ where: { id: client.id }, data: { loginAttempts: 0, loginLockedUntil: null } })

  const token = jwt.sign(
    { id: client.id, phone: client.phone, firstName: client.firstName, lastName: client.lastName },
    process.env.JWT_CLIENT_SECRET,
    { expiresIn: '24h' }
  )

  res.cookie('clientToken', token, CLIENT_COOKIE_OPTS)
  res.json({
    client: {
      id: client.id,
      phone: client.phone,
      firstName: client.firstName,
      lastName: client.lastName,
      status: client.status,
      pinMustChange: client.pinMustChange,
    },
  })
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('adminToken', { path: '/' })
  res.json({ ok: true })
})

// POST /api/auth/client-logout
router.post('/client-logout', (req, res) => {
  res.clearCookie('clientToken', { path: '/' })
  res.json({ ok: true })
})

// GET /api/auth/me — vérifier session admin depuis cookie
router.get('/me', (req, res) => {
  const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Non connecté' })
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)
    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Session expirée' })
  }
})

// GET /api/auth/client-me — vérifier session client depuis cookie
router.get('/client-me', (req, res) => {
  const token = req.cookies.clientToken || req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Non connecté' })
  try {
    const client = jwt.verify(token, process.env.JWT_CLIENT_SECRET)
    res.json({ client })
  } catch {
    res.status(401).json({ error: 'Session expirée' })
  }
})

module.exports = router
