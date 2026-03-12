const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin, authClient } = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /api/notifications — alertes dérivées des données (contestations + plafonds)
router.get('/', authAdmin, async (req, res) => {
  try {
    const isManager = req.user.role === 'MANAGER'
    const managerIds = req.user.establishmentIds || []

    // Contestations ouvertes
    const disputeWhere = { disputeStatus: 'OUVERTE' }
    if (isManager && managerIds.length) {
      disputeWhere.establishmentId = { in: managerIds }
    }
    const disputes = await prisma.transaction.findMany({
      where: disputeWhere,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        establishment: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 20,
    })

    // Clients avec solde > 0
    const clientWhere = isManager && managerIds.length
      ? { transactions: { some: { establishmentId: { in: managerIds } } } }
      : {}

    const clients = await prisma.client.findMany({
      where: clientWhere,
      include: { transactions: true },
    })

    const overLimit = []
    const enRetard = []

    for (const c of clients) {
      const conso = c.transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
      const paid = c.transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
      const solde = Math.max(0, conso - paid)

      if (solde <= 0) continue

      // Plafond dépassé
      if (c.creditLimit && solde > c.creditLimit) {
        overLimit.push({
          type: 'OVER_LIMIT',
          clientId: c.id,
          clientName: `${c.lastName} ${c.firstName}`,
          solde,
          creditLimit: c.creditLimit,
        })
        continue
      }

      // En retard : solde > 0 et dernière conso date de plus de 30 jours
      const lastConso = c.transactions
        .filter((t) => t.type === 'CONSOMMATION')
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0]

      if (lastConso) {
        const daysSince = (Date.now() - new Date(lastConso.date).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince > 30) {
          enRetard.push({
            type: 'EN_RETARD',
            clientId: c.id,
            clientName: `${c.lastName} ${c.firstName}`,
            solde,
          })
        }
      }
    }

    // Demandes de récapitulatif en attente
    const recapWhere = { status: 'PENDING' }
    const recapRequests = await prisma.recapRequest.findMany({
      where: recapWhere,
      include: { client: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const notifications = [
      ...disputes.map((d) => ({
        type: 'DISPUTE',
        txId: d.id,
        clientId: d.clientId,
        clientName: `${d.client.lastName} ${d.client.firstName}`,
        establishment: d.establishment.name,
        date: d.date,
        note: d.disputeNote,
      })),
      ...recapRequests.map((r) => ({
        type: 'RECAP_REQUEST',
        recapId: r.id,
        clientId: r.client.id,
        clientName: `${r.client.lastName} ${r.client.firstName}`,
        clientPhone: r.client.phone,
        message: r.message,
        date: r.createdAt,
      })),
      ...overLimit,
      ...enRetard,
    ]

    res.json({ notifications, count: notifications.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/notifications/recap-request — client demande un récapitulatif
router.post('/recap-request', authClient, async (req, res) => {
  try {
    const clientId = req.client.id
    const { message } = req.body

    // Éviter les doublons : une seule demande PENDING à la fois
    const existing = await prisma.recapRequest.findFirst({
      where: { clientId, status: 'PENDING' },
    })
    if (existing) return res.status(409).json({ error: 'Une demande est déjà en attente' })

    await prisma.recapRequest.create({ data: { clientId, message: message || null } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/notifications/recap-request/:id/done — marquer comme traité
router.patch('/recap-request/:id/done', authAdmin, async (req, res) => {
  try {
    await prisma.recapRequest.update({
      where: { id: Number(req.params.id) },
      data: { status: 'DONE' },
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/notifications/client — alertes pour l'espace client connecté
router.get('/client', authClient, async (req, res) => {
  try {
    const clientId = req.client.id

    // Contestations résolues récentes (7 derniers jours)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const resolvedDisputes = await prisma.transaction.findMany({
      where: {
        clientId,
        disputeStatus: 'RESOLUE',
        updatedAt: { gte: sevenDaysAgo },
      },
      include: { establishment: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    })

    // Paiements récents (7 derniers jours)
    const recentPayments = await prisma.transaction.findMany({
      where: {
        clientId,
        type: 'PAIEMENT',
        date: { gte: sevenDaysAgo },
      },
      include: { establishment: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 10,
    })

    const notifications = [
      ...resolvedDisputes.map((d) => ({
        type: 'DISPUTE_RESOLUE',
        txId: d.id,
        establishment: d.establishment.name,
        date: d.updatedAt,
        note: d.disputeNote,
      })),
      ...recentPayments.map((p) => ({
        type: 'PAIEMENT',
        txId: p.id,
        establishment: p.establishment.name,
        date: p.date,
        montant: p.paiement,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    res.json({ notifications, count: notifications.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
