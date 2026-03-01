const jwt = require('jsonwebtoken')

// Middleware pour les utilisateurs comptabilité (admin/comptable)
function authAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token manquant' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

// Middleware pour les clients
function authClient(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token manquant' })
  try {
    req.client = jwt.verify(token, process.env.JWT_CLIENT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

// Middleware admin uniquement (rôle ADMIN)
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé à l\'administrateur' })
  }
  next()
}

// Middleware refus MANAGER (routes en écriture)
function requireNotManager(req, res, next) {
  if (req.user?.role === 'MANAGER') {
    return res.status(403).json({ error: 'Accès refusé : lecture seule' })
  }
  next()
}

module.exports = { authAdmin, authClient, requireAdmin, requireNotManager }
