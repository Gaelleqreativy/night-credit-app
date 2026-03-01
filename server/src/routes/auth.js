const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// POST /api/auth/login — Comptabilité
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Champs manquants' })

  const user = await prisma.user.findUnique({
    where: { email },
    include: { establishments: { include: { establishment: true } } },
  })
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, establishmentIds: user.establishments.map((ue) => ue.establishmentId) },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  )

  res.json({
    token,
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

  const valid = await bcrypt.compare(pin, client.pin)
  if (!valid) return res.status(401).json({ error: 'Numéro ou PIN incorrect' })

  const token = jwt.sign(
    { id: client.id, phone: client.phone, firstName: client.firstName, lastName: client.lastName },
    process.env.JWT_CLIENT_SECRET,
    { expiresIn: '24h' }
  )

  res.json({
    token,
    client: {
      id: client.id,
      phone: client.phone,
      firstName: client.firstName,
      lastName: client.lastName,
      status: client.status,
    },
  })
})

module.exports = router
