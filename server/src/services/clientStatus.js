const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Recalcule et met à jour le statut d'un client après chaque transaction
 * - SOLDE    : solde = 0
 * - EN_RETARD: solde > 0 ET au moins une conso datant de + de 60 jours
 * - EN_COURS : solde > 0 (par défaut)
 * Le statut est entièrement recalculé depuis les données (non-sticky).
 */
async function updateClientStatus(clientId) {
  const transactions = await prisma.transaction.findMany({ where: { clientId } })

  const totalConso = transactions
    .filter((t) => t.type === 'CONSOMMATION')
    .reduce((s, t) => s + (t.consommation || 0), 0)

  const totalPaiement = transactions
    .filter((t) => t.type === 'PAIEMENT')
    .reduce((s, t) => s + (t.paiement || 0), 0)

  const solde = totalConso - totalPaiement

  let status = 'EN_COURS'
  if (solde <= 0) {
    status = 'SOLDE'
  } else {
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const hasOldUnpaid = transactions.some(
      (t) => t.type === 'CONSOMMATION' && new Date(t.date) < sixtyDaysAgo
    )
    if (hasOldUnpaid) status = 'EN_RETARD'
  }

  await prisma.client.update({ where: { id: clientId }, data: { status } })
  return { solde, status }
}

module.exports = { updateClientStatus }
