const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { authAdmin, authClient, requireNotManager } = require('../middleware/auth')
const { logAudit } = require('../services/audit')

const prisma = new PrismaClient()

// Calcule le solde d'un client
async function getClientBalance(clientId) {
  const txs = await prisma.transaction.findMany({ where: { clientId } })
  const conso = txs.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
  const paid = txs.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
  return Math.max(0, conso - paid)
}

// GET /api/clients — liste avec solde
router.get('/', authAdmin, async (req, res) => {
  try {
    const { search, status, establishmentId } = req.query
    const where = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const estabId = establishmentId ? Number(establishmentId) : null
    if (req.user.role === 'MANAGER' && req.user.establishmentIds?.length) {
      const allowed = req.user.establishmentIds
      const ids = estabId && allowed.includes(estabId) ? [estabId] : allowed
      where.transactions = { some: { establishmentId: { in: ids } } }
    } else if (estabId) {
      where.transactions = { some: { establishmentId: estabId } }
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { lastName: 'asc' },
      include: { transactions: true },
    })

    const result = clients.map((c) => {
      const conso = c.transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
      const paid = c.transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
      const { transactions, pin, ...rest } = c
      return { ...rest, solde: Math.max(0, conso - paid) }
    })

    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/clients/:id — détail avec solde
router.get('/:id', authAdmin, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        transactions: {
          include: { establishment: true, createdBy: { select: { name: true } } },
          orderBy: { date: 'desc' },
        },
      },
    })
    if (!client) return res.status(404).json({ error: 'Client introuvable' })

    const conso = client.transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
    const paid = client.transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)

    const { pin, ...rest } = client
    res.json({ ...rest, solde: Math.max(0, conso - paid), totalConso: conso, totalPaiement: paid })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/clients — créer client
router.post('/', authAdmin, requireNotManager, async (req, res) => {
  const { firstName, lastName, phone, pin, creditLimit } = req.body
  if (!firstName || !lastName || !phone || !pin)
    return res.status(400).json({ error: 'firstName, lastName, phone et pin sont requis' })
  if (pin.length !== 4 || !/^\d{4}$/.test(pin))
    return res.status(400).json({ error: 'Le PIN doit être exactement 4 chiffres' })

  try {
    const hashedPin = await bcrypt.hash(pin, 10)
    const client = await prisma.client.create({
      data: { firstName, lastName, phone, pin: hashedPin, creditLimit: creditLimit ? Number(creditLimit) : null, pinMustChange: true },
    })
    await logAudit(req.user.id, 'CREATE', 'Client', client.id, { firstName, lastName, phone })
    const { pin: _, ...result } = client
    res.status(201).json(result)
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Ce numéro de téléphone existe déjà' })
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/clients/:id — modifier client
router.put('/:id', authAdmin, requireNotManager, async (req, res) => {
  const { firstName, lastName, phone, creditLimit, status } = req.body
  try {
    const client = await prisma.client.update({
      where: { id: Number(req.params.id) },
      data: { firstName, lastName, phone, creditLimit: creditLimit !== undefined ? Number(creditLimit) : undefined, status },
    })
    await logAudit(req.user.id, 'UPDATE', 'Client', client.id, req.body)
    const { pin, ...result } = client
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/clients/:id/reset-pin — reset PIN par la comptabilité
router.put('/:id/reset-pin', authAdmin, requireNotManager, async (req, res) => {
  const { newPin } = req.body
  if (!newPin || !/^\d{4}$/.test(newPin))
    return res.status(400).json({ error: 'PIN doit être 4 chiffres' })
  try {
    const hashedPin = await bcrypt.hash(newPin, 10)
    await prisma.client.update({ where: { id: Number(req.params.id) }, data: { pin: hashedPin, pinMustChange: true } })
    await logAudit(req.user.id, 'UPDATE', 'Client', Number(req.params.id), { action: 'reset_pin' })
    res.json({ message: 'PIN réinitialisé' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/clients/me/pin — client change son propre PIN
router.put('/me/pin', authClient, async (req, res) => {
  const { currentPin, newPin } = req.body
  if (!currentPin || !newPin || !/^\d{4}$/.test(newPin))
    return res.status(400).json({ error: 'Champs invalides' })

  const client = await prisma.client.findUnique({ where: { id: req.client.id } })
  const valid = await bcrypt.compare(currentPin, client.pin)
  if (!valid) return res.status(400).json({ error: 'PIN actuel incorrect' })

  const hashedPin = await bcrypt.hash(newPin, 10)
  await prisma.client.update({ where: { id: req.client.id }, data: { pin: hashedPin, pinMustChange: false } })
  res.json({ message: 'PIN modifié avec succès' })
})

module.exports = router
