const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin, requireAdmin } = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /api/audit — journal d'audit (ADMIN seulement)
router.get('/', authAdmin, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })
    const total = await prisma.auditLog.count()
    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
