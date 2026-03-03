const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin, requireAdmin } = require('../middleware/auth')
const { uploadLogo } = require('../middleware/upload')

const prisma = new PrismaClient()

// Inclure le comptage des transactions dans toutes les réponses
const include = { _count: { select: { transactions: true } } }

// GET /api/establishments — liste selon le rôle
router.get('/', authAdmin, async (req, res) => {
  try {
    let establishments
    if (req.user.role === 'ADMIN') {
      establishments = await prisma.establishment.findMany({ orderBy: { name: 'asc' }, include })
    } else {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { establishments: { include: { establishment: { include } } } },
      })
      establishments = user.establishments.map((ue) => ue.establishment)
    }
    res.json(establishments)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/establishments — créer (ADMIN seulement)
router.post('/', authAdmin, requireAdmin, uploadLogo.single('logo'), async (req, res) => {
  const { name, address } = req.body
  if (!name) return res.status(400).json({ error: 'Nom requis' })
  try {
    const logoUrl = req.file ? `/uploads/${req.file.filename}` : null
    const etab = await prisma.establishment.create({
      data: { name, address: address || null, logoUrl },
      include,
    })
    res.status(201).json(etab)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/establishments/:id — modifier (ADMIN seulement)
router.put('/:id', authAdmin, requireAdmin, uploadLogo.single('logo'), async (req, res) => {
  const { name, address } = req.body
  try {
    const data = {}
    if (name) data.name = name
    if (address !== undefined) data.address = address || null
    if (req.file) data.logoUrl = `/uploads/${req.file.filename}`
    const etab = await prisma.establishment.update({
      where: { id: Number(req.params.id) },
      data,
      include,
    })
    res.json(etab)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/establishments/:id — supprimer (ADMIN seulement)
router.delete('/:id', authAdmin, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const txCount = await prisma.transaction.count({ where: { establishmentId: id } })
    if (txCount > 0) {
      return res.status(400).json({ error: `Impossible de supprimer : ${txCount} transaction(s) liée(s) à cet établissement` })
    }
    await prisma.userEstablishment.deleteMany({ where: { establishmentId: id } })
    await prisma.establishment.delete({ where: { id } })
    res.json({ message: 'Établissement supprimé' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
