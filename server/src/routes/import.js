const router = require('express').Router()
const XLSX = require('xlsx')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { authAdmin } = require('../middleware/auth')
const { uploadExcel } = require('../middleware/upload')
const { updateClientStatus } = require('../services/clientStatus')
const { logAudit } = require('../services/audit')

const prisma = new PrismaClient()

/**
 * Colonnes attendues dans le fichier Excel :
 * date | prenom | nom | telephone | etablissement | ref_ticket | consommation | paiement | moyen_paiement | notes
 */

// GET /api/import/template — télécharger le template Excel
router.get('/template', authAdmin, (req, res) => {
  const wb = XLSX.utils.book_new()
  const headers = ['date', 'prenom', 'nom', 'telephone', 'etablissement', 'ref_ticket', 'consommation', 'paiement', 'moyen_paiement', 'notes']
  const example = ['2024-01-15', 'Jean', 'Dupont', '0600000001', 'Club Étoile', 'T-001', 150, '', '', 'Table VIP']
  const example2 = ['2024-01-20', 'Jean', 'Dupont', '0600000001', 'Club Étoile', '', '', 50, 'ESPECES', '']
  const ws = XLSX.utils.aoa_to_sheet([headers, example, example2])
  ws['!cols'] = headers.map(() => ({ wch: 18 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Import')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', 'attachment; filename=template_import.xlsx')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
})

// POST /api/import — importer les anciennes entrées
router.post('/', authAdmin, uploadExcel.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier Excel requis' })

  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const results = { created: 0, errors: [], clientsCreated: 0 }
    const PIN_DEFAULT = '0000'

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      try {
        const { date, prenom, nom, telephone, etablissement, ref_ticket, consommation, paiement, moyen_paiement, notes } = row

        // Ignorer les lignes vraiment vides
        if (!date && !nom && !telephone && !etablissement && !consommation && !paiement) continue

        // Valeurs par défaut pour les champs manquants
        const dateVal = date || new Date()
        const nomVal = nom || 'Inconnu'
        const telVal = telephone || `IMPORT-${Date.now()}-${rowNum}`
        const etablissementVal = etablissement || 'Non spécifié'

        if (!consommation && !paiement)
          throw new Error('La ligne doit avoir au moins une consommation ou un paiement')

        // Trouver ou créer l'établissement
        let etab = await prisma.establishment.findFirst({ where: { name: { equals: String(etablissementVal) } } })
        if (!etab) {
          etab = await prisma.establishment.create({ data: { name: String(etablissementVal) } })
        }

        // Trouver ou créer le client
        let client = null
        if (telephone) {
          client = await prisma.client.findUnique({ where: { phone: String(telVal) } })
        } else {
          // Sans téléphone : chercher par nom pour éviter les doublons
          client = await prisma.client.findFirst({
            where: { lastName: String(nomVal), firstName: String(prenom || '') }
          })
        }
        if (!client) {
          const hashedPin = await bcrypt.hash(PIN_DEFAULT, 10)
          client = await prisma.client.create({
            data: { phone: String(telVal), firstName: String(prenom || ''), lastName: String(nomVal), pin: hashedPin },
          })
          results.clientsCreated++
        }

        const txDate = dateVal instanceof Date ? dateVal : new Date(String(dateVal))
        if (isNaN(txDate)) throw new Error(`Date invalide : ${dateVal}`)

        const type = consommation ? 'CONSOMMATION' : 'PAIEMENT'

        const validMoyens = ['ESPECES', 'CB', 'VIREMENT', 'CHEQUE', 'MOBILE_MONEY']
        const moyenNormalized = String(moyen_paiement || '').toUpperCase().trim()
        const moyenFinal = validMoyens.includes(moyenNormalized) ? moyenNormalized : null

        await prisma.transaction.create({
          data: {
            type,
            date: txDate,
            clientId: client.id,
            establishmentId: etab.id,
            ticketRef: ref_ticket ? String(ref_ticket) : null,
            consommation: consommation ? Number(consommation) : null,
            paiement: paiement ? Number(paiement) : null,
            moyenPaiement: paiement ? moyenFinal : null,
            notes: notes ? String(notes) : null,
            createdById: req.user.id,
          },
        })

        await updateClientStatus(client.id)
        results.created++
      } catch (e) {
        results.errors.push({ ligne: rowNum, erreur: e.message })
      }
    }

    await logAudit(req.user.id, 'CREATE', 'Import', 0, { created: results.created, errors: results.errors.length })
    res.json({ ...results, total: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
