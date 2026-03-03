const router = require('express').Router()
const XLSX = require('xlsx')
const PDFDocument = require('pdfkit')
const { PrismaClient } = require('@prisma/client')
const { authAdmin } = require('../middleware/auth')

const prisma = new PrismaClient()

// ─── Utilitaires communs ──────────────────────────────────────────────────────

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR')
}

function fmtMoney(n) {
  // toLocaleString('fr-FR') uses U+00A0 (non-breaking space) as thousands separator
  // PDFKit renders it as a slash — replace with regular space
  return Number(n || 0).toLocaleString('fr-FR').replace(/\u00a0/g, ' ') + ' FCFA'
}

function periodLabel(year, dateFrom, dateTo) {
  if (dateFrom && dateTo) {
    const from = new Date(dateFrom + 'T00:00:00').toLocaleDateString('fr-FR')
    const to = new Date(dateTo + 'T00:00:00').toLocaleDateString('fr-FR')
    return `du ${from} au ${to}`
  }
  if (year) return `Année ${year}`
  return 'Toutes périodes'
}

function buildDateRange(year, dateFrom, dateTo) {
  if (dateFrom || dateTo) {
    const r = {}
    if (dateFrom) r.gte = new Date(dateFrom)
    if (dateTo) { const e = new Date(dateTo); e.setHours(23, 59, 59, 999); r.lte = e }
    return r
  }
  if (year) return { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59`) }
  return undefined
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

// Convertit les cellules de montant en vrais nombres avec format #,##0
function fixNumberCells(ws, rows, startRow, cols) {
  rows.forEach((_, i) => {
    cols.forEach((c) => {
      const ref = XLSX.utils.encode_cell({ r: startRow + i, c })
      if (ws[ref] && ws[ref].v !== '' && ws[ref].v != null && typeof ws[ref].v === 'number') {
        ws[ref].t = 'n'
        ws[ref].z = '#,##0'
      }
    })
  })
}

function buildClientXlsx(client, transactions, totalConso, totalPaiement, solde, period) {
  const wb = XLSX.utils.book_new()

  // ── Feuille Transactions ──────────────────────────────────────────────────
  const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const infoBlock = [
    ['Client',       `${client.lastName} ${client.firstName}`],
    ['Téléphone',    client.phone],
    ['Période',      period],
    ['Généré le',    genDate],
    [],
  ]

  const headers = ['Date', 'Établissement', 'Réf. Ticket', 'Type', 'Consommation (FCFA)', 'Paiement (FCFA)', 'Moyen de paiement', 'Notes']

  const dataRows = transactions.map((t) => [
    fmtDate(t.date),
    t.establishment.name,
    t.ticketRef || '',
    t.type === 'CONSOMMATION' ? 'Consommation' : 'Paiement',
    t.type === 'CONSOMMATION' ? (t.consommation || 0) : '',
    t.type === 'PAIEMENT'     ? (t.paiement || 0)     : '',
    t.moyenPaiement || '',
    t.notes || '',
  ])

  const totalRow = dataRows.length + infoBlock.length
  const summaryRows = [
    [],
    ['', '', '', 'TOTAL CONSOMMATIONS', totalConso, '', '', ''],
    ['', '', '', 'TOTAL PAIEMENTS',     '', totalPaiement, '', ''],
    ['', '', '', 'SOLDE DÛ',            Math.max(0, totalConso - totalPaiement), '', '', ''],
  ]

  const ws = XLSX.utils.aoa_to_sheet([...infoBlock, headers, ...dataRows, ...summaryRows])

  ws['!cols'] = [
    { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 14 },
    { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 30 },
  ]
  ws['!freeze'] = { xSplit: 0, ySplit: infoBlock.length + 1 }

  // Convertir les colonnes de montant en nombres
  fixNumberCells(ws, dataRows, infoBlock.length + 1, [4, 5])

  // Totaux aussi en nombres
  const tsBase = infoBlock.length + 1 + dataRows.length + 1
  ;['E', 'F'].forEach((col, ci) => {
    const rows = ci === 0
      ? [{ r: tsBase, c: 4 }, { r: tsBase + 2, c: 4 }]
      : [{ r: tsBase + 1, c: 5 }]
    rows.forEach(({ r, c }) => {
      const ref = XLSX.utils.encode_cell({ r, c })
      if (ws[ref] && typeof ws[ref].v === 'number') {
        ws[ref].t = 'n'; ws[ref].z = '#,##0'
      }
    })
  })

  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
  return wb
}

function buildGlobalXlsx(transactions, period) {
  const wb = XLSX.utils.book_new()

  const totalConso = transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
  const totalPaiement = transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)

  const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const infoBlock = [
    ['Période',               period],
    ['Nombre de transactions', transactions.length],
    ['Généré le',             genDate],
    [],
  ]

  const headers = ['Date', 'Client', 'Téléphone', 'Établissement', 'Type', 'Réf. Ticket', 'Consommation (FCFA)', 'Paiement (FCFA)', 'Moyen de paiement', 'Notes']

  const dataRows = transactions.map((t) => [
    fmtDate(t.date),
    `${t.client.lastName} ${t.client.firstName}`,
    t.client.phone,
    t.establishment.name,
    t.type === 'CONSOMMATION' ? 'Consommation' : 'Paiement',
    t.ticketRef || '',
    t.type === 'CONSOMMATION' ? (t.consommation || 0) : '',
    t.type === 'PAIEMENT'     ? (t.paiement || 0)     : '',
    t.moyenPaiement || '',
    t.notes || '',
  ])

  const summaryRows = [
    [],
    ['', '', '', '', 'TOTAL CONSOMMATIONS', '', totalConso, '', '', ''],
    ['', '', '', '', 'TOTAL PAIEMENTS',     '', '', totalPaiement, '', ''],
    ['', '', '', '', 'SOLDE DÛ',            '', Math.max(0, totalConso - totalPaiement), '', '', ''],
  ]

  const ws = XLSX.utils.aoa_to_sheet([...infoBlock, headers, ...dataRows, ...summaryRows])
  ws['!cols'] = [
    { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
    { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 30 },
  ]
  ws['!freeze'] = { xSplit: 0, ySplit: infoBlock.length + 1 }
  fixNumberCells(ws, dataRows, infoBlock.length + 1, [6, 7])

  const tsBase = infoBlock.length + 1 + dataRows.length + 1
  ;[
    { r: tsBase,     c: 6 }, // total conso
    { r: tsBase + 1, c: 7 }, // total paiement
    { r: tsBase + 2, c: 6 }, // solde
  ].forEach(({ r, c }) => {
    const ref = XLSX.utils.encode_cell({ r, c })
    if (ws[ref] && typeof ws[ref].v === 'number') { ws[ref].t = 'n'; ws[ref].z = '#,##0' }
  })

  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

  // ── Feuille Résumé par établissement ─────────────────────────────────────
  const etabMap = new Map()
  transactions.forEach((t) => {
    const name = t.establishment.name
    if (!etabMap.has(name)) etabMap.set(name, { conso: 0, paiement: 0, count: 0 })
    const e = etabMap.get(name)
    if (t.type === 'CONSOMMATION') e.conso += t.consommation || 0
    else e.paiement += t.paiement || 0
    e.count++
  })

  const resumeHeaders = ['Établissement', 'Nb transactions', 'Consommations (FCFA)', 'Paiements (FCFA)', 'Solde dû (FCFA)']
  const resumeRows = Array.from(etabMap.entries())
    .sort((a, b) => b[1].conso - a[1].conso)
    .map(([name, { conso, paiement, count }]) => [name, count, conso, paiement, Math.max(0, conso - paiement)])

  resumeRows.push([])
  resumeRows.push(['TOTAL', transactions.length, totalConso, totalPaiement, Math.max(0, totalConso - totalPaiement)])

  const wsR = XLSX.utils.aoa_to_sheet([resumeHeaders, ...resumeRows])
  wsR['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 18 }]
  fixNumberCells(wsR, resumeRows, 1, [1, 2, 3, 4])

  XLSX.utils.book_append_sheet(wb, wsR, 'Résumé par établissement')
  return wb
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

const PW = 595.28
const PH = 841.89
const ML = 40
const MR = 40
const CW = PW - ML - MR
const MAX_Y = PH - 55

const C = {
  bg:     '#1e3a5f',
  accent: '#2563eb',
  green:  '#059669',
  red:    '#dc2626',
  gray:   '#6b7280',
  light:  '#f9fafb',
  border: '#e5e7eb',
  text:   '#111827',
}

function pdfHeader(doc, subtitle) {
  doc.rect(0, 0, PW, 50).fill(C.bg)
  doc.fill('white').font('Helvetica-Bold').fontSize(14)
     .text('NIGHT CREDIT', ML, 14, { lineBreak: false })
  if (subtitle) {
    doc.fill('rgba(255,255,255,0.75)').font('Helvetica').fontSize(8)
       .text(subtitle, ML, 32, { lineBreak: false })
  }
  const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  doc.fill('rgba(255,255,255,0.55)').font('Helvetica').fontSize(7)
     .text(`Généré le ${genDate}`, 0, 36, { align: 'right', width: PW - MR, lineBreak: false })
}

function pdfFooter(doc, pageNum) {
  const fy = PH - 26
  doc.rect(0, fy - 5, PW, 31).fill('#f3f4f6')
  doc.fill(C.gray).font('Helvetica').fontSize(7)
     .text(`Page ${pageNum}`, ML, fy + 3, { lineBreak: false })
  doc.fill(C.gray).fontSize(7)
     .text('Night Credit — Document confidentiel', 0, fy + 3, { align: 'right', width: PW - MR })
}

function buildClientPdf(res, client, transactions, totalConso, totalPaiement, solde, period) {
  const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true })
  doc.pipe(res)

  let y = 0
  let pageNum = 1

  pdfHeader(doc, `Fiche client — ${period}`)
  y = 64

  // ── Infos client ───────────────────────────────────────────────────────────
  doc.fill(C.text).font('Helvetica-Bold').fontSize(14)
     .text(`${client.lastName.toUpperCase()} ${client.firstName}`, ML, y)
  y += 19
  doc.fill(C.gray).font('Helvetica').fontSize(8.5)
     .text(`Téléphone : ${client.phone}   ·   Période : ${period}`, ML, y)
  y += 22

  // ── KPI boxes ─────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Consommations',  value: fmtMoney(totalConso),   color: C.accent },
    { label: 'Paiements',      value: fmtMoney(totalPaiement), color: C.green },
    { label: 'Solde dû',       value: fmtMoney(solde),         color: solde > 0 ? C.red : C.green },
  ]
  const boxW = (CW - 14) / 3
  const boxH = 50
  kpis.forEach(({ label, value, color }, i) => {
    const bx = ML + i * (boxW + 7)
    doc.roundedRect(bx, y, boxW, boxH, 5).fill('#f0f5ff')
    doc.rect(bx, y, 3, boxH).fill(color)
    doc.fill(C.gray).font('Helvetica').fontSize(7)
       .text(label, bx + 10, y + 11, { width: boxW - 14, lineBreak: false })
    doc.fill(color).font('Helvetica-Bold').fontSize(10)
       .text(value, bx + 10, y + 26, { width: boxW - 14, lineBreak: false })
  })
  y += boxH + 16

  // ── En-tête tableau ────────────────────────────────────────────────────────
  // Colonnes : Date, Établissement, Réf., Type, Montant, Moyen
  const COLS = [60, 130, 65, 76, 100, 84]
  const COL_HDR = ['Date', 'Établissement', 'Réf.', 'Type', 'Montant (FCFA)', 'Moyen']
  const COL_ALN = ['left', 'left', 'left', 'left', 'right', 'left']

  function drawTableHeader() {
    doc.rect(ML, y, CW, 20).fill(C.bg)
    doc.fill('white').font('Helvetica-Bold').fontSize(7.5)
    let x = ML + 5
    COL_HDR.forEach((h, i) => {
      doc.text(h, x, y + 6, { width: COLS[i] - 5, align: COL_ALN[i], lineBreak: false })
      x += COLS[i]
    })
    y += 20
  }
  drawTableHeader()

  // ── Lignes ─────────────────────────────────────────────────────────────────
  const ROW_H = 16
  transactions.forEach((t, idx) => {
    if (y + ROW_H > MAX_Y) {
      pdfFooter(doc, pageNum)
      doc.addPage(); pageNum++
      pdfHeader(doc, `Fiche client — ${period} (suite)`)
      y = 58
      drawTableHeader()
    }
    if (idx % 2 === 0) doc.rect(ML, y, CW, ROW_H).fill('#f9fafb')

    const isConso = t.type === 'CONSOMMATION'
    const montant = isConso ? (t.consommation || 0) : (t.paiement || 0)
    const amtColor = isConso ? C.accent : C.green

    const cells = [
      fmtDate(t.date),
      t.establishment.name,
      t.ticketRef || '—',
      isConso ? 'Consommation' : 'Paiement',
      fmtMoney(montant),
      t.moyenPaiement || '—',
    ]

    let x = ML + 5
    cells.forEach((val, i) => {
      const isAmt = i === 4
      doc.fill(isAmt ? amtColor : C.text)
         .font(isAmt ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
         .text(String(val), x, y + 4, { width: COLS[i] - 5, align: COL_ALN[i], lineBreak: false })
      x += COLS[i]
    })

    doc.moveTo(ML, y + ROW_H).lineTo(ML + CW, y + ROW_H)
       .strokeColor('#f0f0f0').lineWidth(0.5).stroke()
    y += ROW_H
  })

  if (transactions.length === 0) {
    doc.fill(C.gray).font('Helvetica').fontSize(9)
       .text('Aucune transaction pour cette période.', ML, y + 12, { align: 'center', width: CW })
    y += 32
  }

  // ── Totaux ─────────────────────────────────────────────────────────────────
  if (y + 80 > MAX_Y) {
    pdfFooter(doc, pageNum)
    doc.addPage(); pageNum++
    pdfHeader(doc, '')
    y = 60
  }

  y += 10
  doc.rect(ML, y, CW, 1.5).fill(C.bg)
  y += 14

  const totalsRows = [
    { label: 'Total consommations', value: fmtMoney(totalConso),    color: C.accent },
    { label: 'Total paiements',     value: fmtMoney(totalPaiement), color: C.green },
    { label: 'Solde dû',            value: fmtMoney(solde),         color: solde > 0 ? C.red : C.green },
  ]
  totalsRows.forEach(({ label, value, color }) => {
    doc.fill(C.gray).font('Helvetica').fontSize(8).text(label, ML, y, { lineBreak: false })
    doc.fill(color).font('Helvetica-Bold').fontSize(10)
       .text(value, 0, y, { align: 'right', width: PW - MR, lineBreak: false })
    y += 20
  })

  // ── Footers sur toutes les pages ───────────────────────────────────────────
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    pdfFooter(doc, i + 1)
  }

  doc.flushPages()
  doc.end()
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/export/client/:id?format=xlsx|pdf&year=&dateFrom=&dateTo=
router.get('/client/:id', authAdmin, async (req, res) => {
  const { format = 'xlsx', year, dateFrom, dateTo } = req.query
  try {
    const client = await prisma.client.findUnique({ where: { id: Number(req.params.id) } })
    if (!client) return res.status(404).json({ error: 'Client introuvable' })

    const dateRange = buildDateRange(year, dateFrom, dateTo)
    const where = { clientId: client.id, ...(dateRange ? { date: dateRange } : {}) }
    if (req.user.role === 'MANAGER' && req.user.establishmentIds?.length) {
      where.establishmentId = { in: req.user.establishmentIds }
    }

    const transactions = await prisma.transaction.findMany({
      where, include: { establishment: true }, orderBy: { date: 'asc' },
    })

    const totalConso = transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
    const totalPaiement = transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
    const solde = Math.max(0, totalConso - totalPaiement)
    const period = periodLabel(year, dateFrom, dateTo)
    const suffix = dateFrom ? `_${dateFrom}_${dateTo || ''}` : year ? `_${year}` : ''
    const filename = `client_${client.lastName}_${client.firstName}${suffix}`

    if (format === 'xlsx') {
      const wb = buildClientXlsx(client, transactions, totalConso, totalPaiement, solde, period)
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      return res.send(buf)
    }

    if (format === 'pdf') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
      res.setHeader('Content-Type', 'application/pdf')
      buildClientPdf(res, client, transactions, totalConso, totalPaiement, solde, period)
      return
    }

    res.status(400).json({ error: 'format doit être xlsx ou pdf' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/export/global?format=xlsx&year=&dateFrom=&dateTo=&establishmentId=
router.get('/global', authAdmin, async (req, res) => {
  const { format = 'xlsx', year, dateFrom, dateTo, establishmentId } = req.query
  try {
    const dateRange = buildDateRange(year, dateFrom, dateTo)
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

    const period = periodLabel(year, dateFrom, dateTo)
    const suffix = dateFrom ? `_${dateFrom}_${dateTo || ''}` : year ? `_${year}` : ''

    if (format === 'xlsx') {
      const wb = buildGlobalXlsx(transactions, period)
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      res.setHeader('Content-Disposition', `attachment; filename="rapport_global${suffix}.xlsx"`)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      return res.send(buf)
    }

    res.status(400).json({ error: 'format doit être xlsx ou pdf' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
