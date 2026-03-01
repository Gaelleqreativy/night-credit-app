const jwt = require('jsonwebtoken')

function authAdmin(req, res, next) {
  const token = req.cookies?.adminToken || req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token manquant' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

function authClient(req, res, next) {
  const token = req.cookies?.clientToken || req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token manquant' })
  try {
    req.client = jwt.verify(token, process.env.JWT_CLIENT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: "Accès réservé à l'administrateur" })
  }
  next()
}

function requireNotManager(req, res, next) {
  if (req.user?.role === 'MANAGER') {
    return res.status(403).json({ error: 'Accès refusé : lecture seule' })
  }
  next()
}

module.exports = { authAdmin, authClient, requireAdmin, requireNotManager }
