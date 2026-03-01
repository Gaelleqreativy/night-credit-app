const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function logAudit(userId, action, entity, entityId, detail = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        detail: detail ? JSON.stringify(detail) : null,
      },
    })
  } catch (e) {
    console.error('Audit log error:', e.message)
  }
}

module.exports = { logAudit }
