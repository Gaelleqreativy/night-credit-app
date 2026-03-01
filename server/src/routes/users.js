const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { authAdmin, requireAdmin } = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /api/users — liste des utilisateurs (ADMIN)
router.get('/', authAdmin, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        establishments: { include: { establishment: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    })
    res.json(users.map((u) => ({ ...u, establishments: u.establishments.map((ue) => ue.establishment) })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/users — créer un comptable (ADMIN)
router.post('/', authAdmin, requireAdmin, async (req, res) => {
  const { email, password, name, role = 'COMPTABLE', establishmentIds = [] } = req.body
  if (!email || !password || !name) return res.status(400).json({ error: 'email, password et name requis' })
  if (!['ADMIN', 'COMPTABLE', 'MANAGER'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' })

  try {
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email, password: hashed, name, role,
        establishments: {
          create: establishmentIds.map((id) => ({ establishmentId: Number(id) })),
        },
      },
      include: { establishments: { include: { establishment: true } } },
    })
    const { password: _, ...result } = user
    res.status(201).json({ ...result, establishments: result.establishments.map((ue) => ue.establishment) })
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Cet email est déjà utilisé' })
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/users/:id — modifier un utilisateur (ADMIN)
router.put('/:id', authAdmin, requireAdmin, async (req, res) => {
  const { name, email, password, role, establishmentIds } = req.body
  try {
    const data = {}
    if (name) data.name = name
    if (email) data.email = email
    if (password) data.password = await bcrypt.hash(password, 10)
    if (role) data.role = role

    if (establishmentIds !== undefined) {
      await prisma.userEstablishment.deleteMany({ where: { userId: Number(req.params.id) } })
      data.establishments = { create: establishmentIds.map((id) => ({ establishmentId: Number(id) })) }
    }

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      include: { establishments: { include: { establishment: true } } },
    })
    const { password: _, ...result } = user
    res.json({ ...result, establishments: result.establishments.map((ue) => ue.establishment) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/users/:id (ADMIN, ne peut pas se supprimer lui-même)
router.delete('/:id', authAdmin, requireAdmin, async (req, res) => {
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' })
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Utilisateur supprimé' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
