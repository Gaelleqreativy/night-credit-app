const router = require('express').Router()
const XLSX = require('xlsx')
const PDFDocument = require('pdfkit')
const { PrismaClient } = require('@prisma/client')
const { authAdmin } = require('../middleware/auth')

const prisma = new PrismaClient()

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR')
}

function formatAmount(n) {
  return n != null ? Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '-'
}

// GET /api/export/client/:id?format=xlsx|pdf&year=2024&dateFrom=&dateTo=
router.get('/client/:id', authAdmin, async (req, res) => {
  const { format = 'xlsx', year, dateFrom, dateTo } = req.query
  try {
    const client = await prisma.client.findUnique({ where: { id: Number(req.params.id) } })
    if (!client) return res.status(404).json({ error: 'Client introuvable' })

    let dateRange = undefined
    if (dateFrom || dateTo) {
      dateRange = {}
      if (dateFrom) dateRange.gte = new Date(dateFrom)
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); dateRange.lte = end }
    } else if (year) {
      dateRange = { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59`) }
    }

    const where = { clientId: client.id, ...(dateRange ? { date: dateRange } : {}) }
    if (req.user.role === 'MANAGER' && req.user.establishmentIds?.length) {
      where.establishmentId = { in: req.user.establishmentIds }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { establishment: true },
      orderBy: { date: 'asc' },
    })

    const totalConso = transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
    const totalPaiement = transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
    const solde = Math.max(0, totalConso - totalPaiement)

    const periodSuffix = dateFrom ? `_${dateFrom}_${dateTo || ''}` : year ? `_${year}` : ''
    const filename = `client_${client.lastName}_${client.firstName}${periodSuffix}`

    if (format === 'xlsx') {
      const headers = ['Date', 'Établissement', 'Réf. Ticket', 'Consommation', 'Paiement', 'Moyen de paiement', 'Notes']
      const rows = transactions.map((t) => [
        formatDate(t.date),
        t.establishment.name,
        t.ticketRef || '-',
        t.consommation || '',
        t.paiement || '',
        t.moyenPaiement || '-',
        t.notes || '',
      ])
      rows.push([])
      rows.push(['', '', 'TOTAL CONSO', totalConso, '', '', ''])
      rows.push(['', '', 'TOTAL PAIEMENTS', '', totalPaiement, '', ''])
      rows.push(['', '', 'SOLDE DÛ', solde, '', '', ''])

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      return res.send(buf)
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4' })
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`)
      res.setHeader('Content-Type', 'application/pdf')
      doc.pipe(res)

      doc.fontSize(18).text(`Fiche client : ${client.firstName} ${client.lastName}`, { align: 'center' })
      doc.fontSize(11).text(`Téléphone : ${client.phone}`, { align: 'center' })
      const periodLabel = dateFrom && dateTo ? `${dateFrom} – ${dateTo}` : year ? String(year) : null
    if (periodLabel) doc.text(`Période : ${periodLabel}`, { align: 'center' })
      doc.moveDown()
      doc.fontSize(12).text(`Solde dû : ${formatAmount(solde)} €`, { underline: true })
      doc.moveDown()

      const cols = [60, 120, 80, 80, 80, 90]
      const headers = ['Date', 'Établissement', 'Réf.', 'Conso', 'Paiement', 'Moyen']
      let y = doc.y

      // En-têtes
      doc.font('Helvetica-Bold').fontSize(9)
      headers.forEach((h, i) => {
        const x = 40 + cols.slice(0, i).reduce((a, b) => a + b, 0)
        doc.text(h, x, y, { width: cols[i], align: 'left' })
      })
      y += 16
      doc.moveTo(40, y).lineTo(555, y).stroke()
      y += 4

      doc.font('Helvetica').fontSize(8)
      transactions.forEach((t) => {
        if (y > 720) { doc.addPage(); y = 40 }
        const row = [
          formatDate(t.date),
          t.establishment.name.substring(0, 16),
          t.ticketRef || '-',
          t.consommation ? formatAmount(t.consommation) : '-',
          t.paiement ? formatAmount(t.paiement) : '-',
          t.moyenPaiement || '-',
        ]
        row.forEach((val, i) => {
          const x = 40 + cols.slice(0, i).reduce((a, b) => a + b, 0)
          doc.text(String(val), x, y, { width: cols[i], align: 'left' })
        })
        y += 14
      })

      doc.moveDown(2)
      doc.font('Helvetica-Bold').fontSize(10)
      doc.text(`Total consommations : ${formatAmount(totalConso)} €`)
      doc.text(`Total paiements : ${formatAmount(totalPaiement)} €`)
      doc.text(`Solde dû : ${formatAmount(solde)} €`)

      doc.end()
      return
    }

    res.status(400).json({ error: 'format doit être xlsx ou pdf' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/export/global?format=xlsx|pdf&year=2024&dateFrom=&dateTo=&establishmentId=
router.get('/global', authAdmin, async (req, res) => {
  const { format = 'xlsx', year, dateFrom, dateTo, establishmentId } = req.query
  try {
    let dateRange = undefined
    if (dateFrom || dateTo) {
      dateRange = {}
      if (dateFrom) dateRange.gte = new Date(dateFrom)
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); dateRange.lte = end }
    } else if (year) {
      dateRange = { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59`) }
    }

    const where = dateRange ? { date: dateRange } : {}
    if (req.user.role === 'MANAGER' && req.user.establishmentIds?.length) {
      where.establishmentId = { in: req.user.establishmentIds }
    } else if (req.user.role !== 'MANAGER' && establishmentId) {
      where.establishmentId = Number(establishmentId)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        client: { select: { firstName: true, lastName: true, phone: true } },
        establishment: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })

    if (format === 'xlsx') {
      const headers = ['Date', 'Client', 'Téléphone', 'Établissement', 'Type', 'Réf. Ticket', 'Consommation', 'Paiement', 'Moyen de paiement', 'Notes']
      const rows = transactions.map((t) => [
        formatDate(t.date),
        `${t.client.lastName} ${t.client.firstName}`,
        t.client.phone,
        t.establishment.name,
        t.type,
        t.ticketRef || '',
        t.consommation || '',
        t.paiement || '',
        t.moyenPaiement || '',
        t.notes || '',
      ])

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      XLSX.utils.book_append_sheet(wb, ws, 'Global')
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const periodSuffix = dateFrom ? `_${dateFrom}_${dateTo || ''}` : year ? `_${year}` : ''
      const filename = `rapport_global${periodSuffix}.xlsx`
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      return res.send(buf)
    }

    res.status(400).json({ error: 'format doit être xlsx ou pdf' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
