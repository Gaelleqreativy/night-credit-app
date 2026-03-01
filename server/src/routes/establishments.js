const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin, requireAdmin } = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /api/establishments — liste selon le rôle
router.get('/', authAdmin, async (req, res) => {
  try {
    let establishments
    if (req.user.role === 'ADMIN') {
      establishments = await prisma.establishment.findMany({ orderBy: { name: 'asc' } })
    } else {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { establishments: { include: { establishment: true } } },
      })
      establishments = user.establishments.map((ue) => ue.establishment)
    }
    res.json(establishments)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/establishments — créer (ADMIN seulement)
router.post('/', authAdmin, requireAdmin, async (req, res) => {
  const { name, address } = req.body
  if (!name) return res.status(400).json({ error: 'Nom requis' })
  try {
    const etab = await prisma.establishment.create({ data: { name, address } })
    res.status(201).json(etab)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/establishments/:id
router.put('/:id', authAdmin, requireAdmin, async (req, res) => {
  const { name, address } = req.body
  try {
    const etab = await prisma.establishment.update({
      where: { id: Number(req.params.id) },
      data: { name, address },
    })
    res.json(etab)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
