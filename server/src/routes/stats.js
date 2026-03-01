const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin } = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /api/stats — statistiques globales
router.get('/', authAdmin, async (req, res) => {
  try {
    const { year } = req.query
    const dateFilter = year
      ? { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59`) }
      : undefined

    const where = dateFilter ? { date: dateFilter } : {}

    // Filtrage par établissements pour MANAGER
    const isManager = req.user.role === 'MANAGER'
    const managerEtabIds = req.user.establishmentIds || []
    if (isManager && managerEtabIds.length) {
      where.establishmentId = { in: managerEtabIds }
    }

    // Totaux globaux
    const allTx = await prisma.transaction.findMany({ where })
    const totalConso = allTx.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
    const totalPaiement = allTx.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
    const totalDu = Math.max(0, totalConso - totalPaiement)

    // Clients actifs (solde > 0)
    const clientsFilter = isManager && managerEtabIds.length
      ? { transactions: { some: { establishmentId: { in: managerEtabIds } } } }
      : {}
    const allClients = await prisma.client.findMany({ where: clientsFilter, include: { transactions: true } })
    const clientsActifs = allClients.filter((c) => {
      const conso = c.transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
      const paid = c.transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
      return conso - paid > 0
    }).length

    // Par établissement
    const establishments = await prisma.establishment.findMany(
      isManager && managerEtabIds.length ? { where: { id: { in: managerEtabIds } } } : {}
    )
    const byEstablishment = await Promise.all(
      establishments.map(async (e) => {
        const txs = await prisma.transaction.findMany({ where: { ...where, establishmentId: e.id } })
        const conso = txs.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
        const paid = txs.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
        return { id: e.id, name: e.name, totalConso: conso, totalPaiement: paid, solde: Math.max(0, conso - paid) }
      })
    )

    // Évolution mensuelle (12 mois)
    const targetYear = year || new Date().getFullYear()
    const monthly = []
    for (let m = 1; m <= 12; m++) {
      const start = new Date(`${targetYear}-${String(m).padStart(2, '0')}-01`)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)
      const monthWhere = { date: { gte: start, lt: end } }
      if (isManager && managerEtabIds.length) monthWhere.establishmentId = { in: managerEtabIds }
      const txs = await prisma.transaction.findMany({ where: monthWhere })
      const conso = txs.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
      const paid = txs.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
      monthly.push({ month: m, label: start.toLocaleString('fr-FR', { month: 'short' }), conso, paiement: paid })
    }

    // Top 10 débiteurs
    const top10 = allClients
      .map((c) => {
        const conso = c.transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
        const paid = c.transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
        return { id: c.id, firstName: c.firstName, lastName: c.lastName, solde: Math.max(0, conso - paid) }
      })
      .filter((c) => c.solde > 0)
      .sort((a, b) => b.solde - a.solde)
      .slice(0, 10)

    // Répartition par moyen de paiement
    const paiements = allTx.filter((t) => t.type === 'PAIEMENT')
    const moyensPaiement = {}
    paiements.forEach((t) => {
      const k = t.moyenPaiement || 'INCONNU'
      moyensPaiement[k] = (moyensPaiement[k] || 0) + (t.paiement || 0)
    })

    // Contestations ouvertes
    const contestationsOuvertes = await prisma.transaction.count({ where: { disputeStatus: 'OUVERTE' } })

    res.json({
      totalConso,
      totalPaiement,
      totalDu,
      clientsActifs,
      byEstablishment,
      monthly,
      top10,
      moyensPaiement,
      contestationsOuvertes,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
