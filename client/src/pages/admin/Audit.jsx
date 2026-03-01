import { useEffect, useState } from 'react'
import api from '../../api/axios'

const ACTION_COLORS = { CREATE: 'badge-green', UPDATE: 'badge-blue', DELETE: 'badge-red' }
const ENTITIES = ['Client', 'Transaction', 'User']

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])

  // Filtres
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [userId, setUserId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const LIMIT = 50

  useEffect(() => {
    api.get('/users').then((r) => setUsers(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: LIMIT })
    if (action) params.set('action', action)
    if (entity) params.set('entity', entity)
    if (userId) params.set('userId', userId)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    api.get(`/audit?${params}`)
      .then((r) => { setLogs(r.data.logs); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [page, action, entity, userId, dateFrom, dateTo])

  const hasActiveFilters = action || entity || userId || dateFrom || dateTo
  function resetFilters() {
    setAction(''); setEntity(''); setUserId(''); setDateFrom(''); setDateTo('')
    setPage(1)
  }
  function applyFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  const pages = Math.ceil(total / LIMIT)

  function fmtDate(d) {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journal d'audit</h1>
      </div>

      {/* Filtres */}
      <div className="card space-y-3">
        <div className="flex gap-3 flex-wrap">
          <select className="input w-auto" value={action} onChange={applyFilter(setAction)}>
            <option value="">Toutes les actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select className="input w-auto" value={entity} onChange={applyFilter(setEntity)}>
            <option value="">Toutes les entités</option>
            {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select className="input w-auto" value={userId} onChange={applyFilter(setUserId)}>
            <option value="">Tous les utilisateurs</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Du</label>
            <input type="date" className="input w-auto text-sm" value={dateFrom} onChange={applyFilter(setDateFrom)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Au</label>
            <input type="date" className="input w-auto text-sm" value={dateTo} onChange={applyFilter(setDateTo)} />
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-500 ml-auto">
              ✕ Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Compteur */}
      {!loading && (
        <p className="text-sm text-gray-500">
          {total} entrée{total !== 1 ? 's' : ''}
          {pages > 1 && ` — page ${page}/${pages}`}
        </p>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-gray-500">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Utilisateur</th>
                <th className="text-left px-4 py-2">Action</th>
                <th className="text-left px-4 py-2">Entité</th>
                <th className="text-left px-4 py-2">ID</th>
                <th className="text-left px-4 py-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Chargement...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Aucune entrée</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-2 text-gray-700">{log.user?.name}</td>
                  <td className="px-4 py-2">
                    <span className={`badge ${ACTION_COLORS[log.action] || 'badge-blue'}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{log.entity}</td>
                  <td className="px-4 py-2 text-gray-500">{log.entityId}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs font-mono max-w-xs truncate">
                    {log.detail || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2 justify-center">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm">← Préc.</button>
            <span className="text-gray-500 text-sm py-2">Page {page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm">Suiv. →</button>
          </div>
        )}
      </div>
    </div>
  )
}
