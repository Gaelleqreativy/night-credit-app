const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin } = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /api/stats
router.get('/', authAdmin, async (req, res) => {
  try {
    const { year, month, dateFrom, dateTo, establishmentId } = req.query

    // Plage de dates (priorité : dateFrom/dateTo > year+month > year)
    let dateRange = undefined
    if (dateFrom || dateTo) {
      dateRange = {}
      if (dateFrom) dateRange.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        dateRange.lte = end
      }
    } else if (year && month) {
      const y = Number(year), m = Number(month)
      dateRange = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) }
    } else if (year) {
      dateRange = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31T23:59:59`),
      }
    }

    const isManager = req.user.role === 'MANAGER'
    const managerEtabIds = req.user.establishmentIds || []

    // Filtre de base (date + établissement) — utilisé pour toutes les requêtes
    const where = dateRange ? { date: dateRange } : {}
    if (isManager && managerEtabIds.length) {
      where.establishmentId = { in: managerEtabIds }
    } else if (!isManager && establishmentId) {
      where.establishmentId = Number(establishmentId)
    }

    // ── Totaux globaux ────────────────────────────────────────────────────────
    const allTx = await prisma.transaction.findMany({ where })
    const totalConso = allTx.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
    const totalPaiement = allTx.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
    const totalDu = Math.max(0, totalConso - totalPaiement)

    // ── Clients — scoped au filtre courant (date + établissement) ─────────────
    // On ne charge que les clients qui ont au moins une transaction dans le périmètre,
    // et on inclut uniquement leurs transactions filtrées pour calculer les soldes.
    const clientEstabFilter = isManager && managerEtabIds.length
      ? { transactions: { some: { establishmentId: { in: managerEtabIds } } } }
      : !isManager && establishmentId
      ? { transactions: { some: { establishmentId: Number(establishmentId) } } }
      : {}

    const allClients = await prisma.client.findMany({
      where: clientEstabFilter,
      include: { transactions: { where } },
    })

    const clientsActifs = allClients.filter((c) => {
      const conso = c.transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
      const paid = c.transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
      return conso - paid > 0
    }).length

    // ── Par établissement — restreint à l'établissement sélectionné ──────────
    const etabsQuery = isManager && managerEtabIds.length
      ? { where: { id: { in: managerEtabIds } } }
      : !isManager && establishmentId
      ? { where: { id: Number(establishmentId) } }
      : {}

    const etabs = await prisma.establishment.findMany(etabsQuery)
    const byEstablishment = await Promise.all(
      etabs.map(async (e) => {
        const txs = await prisma.transaction.findMany({ where: { ...where, establishmentId: e.id } })
        const conso = txs.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
        const paid = txs.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
        return { id: e.id, name: e.name, totalConso: conso, totalPaiement: paid, solde: Math.max(0, conso - paid) }
      })
    )

    // ── Évolution mensuelle — uniquement en mode "année complète" ─────────────
    let monthly = []
    const isYearMode = year && !month && !dateFrom && !dateTo
    if (isYearMode) {
      const targetYear = Number(year)
      for (let m = 1; m <= 12; m++) {
        const start = new Date(targetYear, m - 1, 1)
        const end = new Date(targetYear, m, 0, 23, 59, 59)
        const monthWhere = { date: { gte: start, lte: end } }
        if (isManager && managerEtabIds.length) monthWhere.establishmentId = { in: managerEtabIds }
        else if (!isManager && establishmentId) monthWhere.establishmentId = Number(establishmentId)
        const txs = await prisma.transaction.findMany({ where: monthWhere })
        const conso = txs.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
        const paid = txs.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
        monthly.push({ month: m, label: start.toLocaleString('fr-FR', { month: 'short' }), conso, paiement: paid })
      }
    }

    // ── Top 10 débiteurs — scoped au filtre courant ───────────────────────────
    const top10 = allClients
      .map((c) => {
        const conso = c.transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
        const paid = c.transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
        return { id: c.id, firstName: c.firstName, lastName: c.lastName, solde: Math.max(0, conso - paid) }
      })
      .filter((c) => c.solde > 0)
      .sort((a, b) => b.solde - a.solde)
      .slice(0, 10)

    // ── Répartition par moyen de paiement ────────────────────────────────────
    const moyensPaiement = {}
    allTx.filter((t) => t.type === 'PAIEMENT').forEach((t) => {
      const k = t.moyenPaiement || 'INCONNU'
      moyensPaiement[k] = (moyensPaiement[k] || 0) + (t.paiement || 0)
    })

    // ── Contestations ouvertes (globales — alerte indépendante des filtres) ───
    const contestationsOuvertes = await prisma.transaction.count({ where: { disputeStatus: 'OUVERTE' } })

    res.json({
      totalConso, totalPaiement, totalDu, clientsActifs,
      byEstablishment, monthly, top10, moyensPaiement, contestationsOuvertes,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
