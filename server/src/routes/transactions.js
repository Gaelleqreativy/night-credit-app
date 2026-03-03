const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin, authClient, requireNotManager, requireAdmin } = require('../middleware/auth')
const { uploadTicket } = require('../middleware/upload')
const { logAudit } = require('../services/audit')
const { updateClientStatus } = require('../services/clientStatus')

const prisma = new PrismaClient()

function buildFilters(query, forAdmin = true) {
  const where = {}
  if (query.clientId) where.clientId = Number(query.clientId)
  if (query.establishmentId) where.establishmentId = Number(query.establishmentId)
  if (query.type) where.type = query.type
  if (query.dateFrom || query.dateTo) {
    where.date = {}
    if (query.dateFrom) where.date.gte = new Date(query.dateFrom)
    if (query.dateTo) {
      const end = new Date(query.dateTo)
      end.setHours(23, 59, 59, 999)
      where.date.lte = end
    }
  } else if (query.year) {
    where.date = {
      gte: new Date(`${query.year}-01-01`),
      lte: new Date(`${query.year}-12-31T23:59:59`),
    }
  }
  if (query.disputed === 'true') where.disputed = true
  return where
}

// GET /api/transactions — admin
router.get('/', authAdmin, async (req, res) => {
  try {
    const where = buildFilters(req.query)
    if (req.user.role === 'MANAGER' && req.user.establishmentIds?.length) {
      where.establishmentId = { in: req.user.establishmentIds }
    }
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true } },
        establishment: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })
    res.json(transactions)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/transactions/me — client (sans les notes)
router.get('/me', authClient, async (req, res) => {
  try {
    const where = { clientId: req.client.id }
    if (req.query.establishmentId) where.establishmentId = Number(req.query.establishmentId)
    if (req.query.type) where.type = req.query.type
    // Limite stricte : 15 jours maximum (appliquée côté serveur)
    const limit15 = new Date()
    limit15.setDate(limit15.getDate() - 15)
    limit15.setHours(0, 0, 0, 0)

    // Si le client envoie un dateFrom plus ancien que 15 jours, on le plafonne
    if (where.date?.gte && where.date.gte < limit15) where.date.gte = limit15
    // Si aucun filtre de date, on impose la limite de 15 jours
    if (!where.date) where.date = { gte: limit15 }
    else if (!where.date.gte) where.date.gte = limit15

    const transactions = await prisma.transaction.findMany({
      where,
      include: { establishment: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    })

    // Retirer les notes pour les clients
    const sanitized = transactions.map(({ notes, ...t }) => t)
    res.json(sanitized)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/transactions/consommation — ajouter une consommation
router.post('/consommation', authAdmin, requireNotManager, uploadTicket.single('ticketPhoto'), async (req, res) => {
  const { clientId, establishmentId, ticketRef, consommation, date, notes } = req.body
  if (!clientId || !establishmentId || !consommation || !date)
    return res.status(400).json({ error: 'Champs requis manquants' })

  try {
    const ticketPhotoUrl = req.file ? `/uploads/${req.file.filename}` : null
    const tx = await prisma.transaction.create({
      data: {
        type: 'CONSOMMATION',
        date: new Date(date),
        clientId: Number(clientId),
        establishmentId: Number(establishmentId),
        ticketRef,
        ticketPhotoUrl,
        consommation: Number(consommation),
        notes,
        createdById: req.user.id,
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        establishment: { select: { name: true } },
      },
    })
    await updateClientStatus(Number(clientId))
    await logAudit(req.user.id, 'CREATE', 'Transaction', tx.id, { type: 'CONSOMMATION', consommation, clientId })
    res.status(201).json(tx)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/transactions/paiement — enregistrer un paiement
router.post('/paiement', authAdmin, requireNotManager, async (req, res) => {
  const { clientId, establishmentId, paiement, moyenPaiement, date, notes } = req.body
  if (!clientId || !establishmentId || !paiement || !moyenPaiement || !date)
    return res.status(400).json({ error: 'Champs requis manquants' })

  const validMoyens = ['ESPECES', 'CB', 'VIREMENT', 'CHEQUE', 'MOBILE_MONEY']
  if (!validMoyens.includes(moyenPaiement))
    return res.status(400).json({ error: `Moyen de paiement invalide. Valeurs: ${validMoyens.join(', ')}` })

  try {
    const tx = await prisma.transaction.create({
      data: {
        type: 'PAIEMENT',
        date: new Date(date),
        clientId: Number(clientId),
        establishmentId: Number(establishmentId),
        paiement: Number(paiement),
        moyenPaiement,
        notes,
        createdById: req.user.id,
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        establishment: { select: { name: true } },
      },
    })
    const { solde, status } = await updateClientStatus(Number(clientId))
    await logAudit(req.user.id, 'CREATE', 'Transaction', tx.id, { type: 'PAIEMENT', paiement, clientId })
    res.status(201).json({ ...tx, newSolde: solde, newStatus: status })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/transactions/:id — modifier une transaction (ADMIN seulement)
router.put('/:id', authAdmin, requireAdmin, async (req, res) => {
  const { date, consommation, paiement, moyenPaiement, ticketRef, notes, establishmentId } = req.body
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: Number(req.params.id) } })
    if (!tx) return res.status(404).json({ error: 'Transaction introuvable' })

    const data = {}
    if (date) data.date = new Date(date)
    if (establishmentId) data.establishmentId = Number(establishmentId)
    if (ticketRef !== undefined) data.ticketRef = ticketRef
    if (notes !== undefined) data.notes = notes
    if (tx.type === 'CONSOMMATION' && consommation !== undefined) data.consommation = Number(consommation)
    if (tx.type === 'PAIEMENT' && paiement !== undefined) data.paiement = Number(paiement)
    if (tx.type === 'PAIEMENT' && moyenPaiement) data.moyenPaiement = moyenPaiement

    const updated = await prisma.transaction.update({ where: { id: tx.id }, data })
    await updateClientStatus(tx.clientId)
    await logAudit(req.user.id, 'UPDATE', 'Transaction', tx.id, req.body)
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/transactions/:id — supprimer (ADMIN seulement)
router.delete('/:id', authAdmin, requireAdmin, async (req, res) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: Number(req.params.id) } })
    if (!tx) return res.status(404).json({ error: 'Transaction introuvable' })
    await prisma.transaction.delete({ where: { id: Number(req.params.id) } })
    await updateClientStatus(tx.clientId)
    await logAudit(req.user.id, 'DELETE', 'Transaction', tx.id, tx)
    res.json({ message: 'Transaction supprimée' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/transactions/:id/dispute — client conteste
router.post('/:id/dispute', authClient, async (req, res) => {
  const { disputeNote } = req.body
  if (!disputeNote) return res.status(400).json({ error: 'Motif de contestation requis' })

  try {
    const tx = await prisma.transaction.findUnique({ where: { id: Number(req.params.id) } })
    if (!tx || tx.clientId !== req.client.id) return res.status(404).json({ error: 'Transaction introuvable' })
    if (tx.disputed) return res.status(400).json({ error: 'Transaction déjà contestée' })

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: { disputed: true, disputeNote, disputeStatus: 'OUVERTE' },
    })
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/transactions/:id/resolve-dispute — résoudre contestation (admin)
router.put('/:id/resolve-dispute', authAdmin, requireNotManager, async (req, res) => {
  const { resolveType, resolveNote } = req.body
  if (!resolveType || !['ACCEPTEE', 'REJETEE'].includes(resolveType))
    return res.status(400).json({ error: 'resolveType doit être ACCEPTEE ou REJETEE' })

  try {
    const tx = await prisma.transaction.update({
      where: { id: Number(req.params.id) },
      data: { disputeStatus: resolveType, resolveNote: resolveNote || null },
    })
    await logAudit(req.user.id, 'UPDATE', 'Transaction', tx.id, { action: 'resolve_dispute', resolveType, resolveNote })
    res.json(tx)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
