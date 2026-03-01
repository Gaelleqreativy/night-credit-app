const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authAdmin, requireAdmin } = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /api/audit — journal d'audit (ADMIN seulement)
router.get('/', authAdmin, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity, userId, dateFrom, dateTo } = req.query

    const where = {}
    if (action) where.action = action
    if (entity) where.entity = entity
    if (userId) where.userId = Number(userId)
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59')
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
