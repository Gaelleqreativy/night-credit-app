const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin } = require('../middleware/auth')

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

    // Clients dépassant leur plafond
    const clientWhere = isManager && managerIds.length
      ? { creditLimit: { not: null }, transactions: { some: { establishmentId: { in: managerIds } } } }
      : { creditLimit: { not: null } }

    const clients = await prisma.client.findMany({
      where: clientWhere,
      include: { transactions: true },
    })

    const overLimit = clients
      .map((c) => {
        const conso = c.transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
        const paid = c.transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
        return { ...c, solde: Math.max(0, conso - paid) }
      })
      .filter((c) => c.solde > c.creditLimit)
      .map((c) => ({
        type: 'OVER_LIMIT',
        clientId: c.id,
        clientName: `${c.lastName} ${c.firstName}`,
        solde: c.solde,
        creditLimit: c.creditLimit,
      }))

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
      ...overLimit,
    ]

    res.json({ notifications, count: notifications.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
