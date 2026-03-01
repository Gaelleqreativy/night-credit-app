import { useEffect, useState } from 'react'
import api from '../../api/axios'

const ACTION_COLORS = { CREATE: 'badge-green', UPDATE: 'badge-blue', DELETE: 'badge-red' }

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/audit?page=${page}&limit=50`)
      .then((r) => { setLogs(r.data.logs); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [page])

  function fmtDate(d) {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journal d'audit</h1>
        <span className="text-sm text-gray-500">{total} entrées</span>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-night-800">
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
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-night-800/50 hover:bg-night-800/20">
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-2">{log.user?.name}</td>
                  <td className="px-4 py-2">
                    <span className={`badge ${ACTION_COLORS[log.action] || 'badge-blue'}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-300">{log.entity}</td>
                  <td className="px-4 py-2 text-gray-500">{log.entityId}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs font-mono max-w-xs truncate">
                    {log.detail || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 50 && (
          <div className="px-4 py-3 border-t border-night-800 flex gap-2 justify-center">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm">← Préc.</button>
            <span className="text-gray-500 text-sm py-2">Page {page} / {Math.ceil(total / 50)}</span>
            <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm">Suiv. →</button>
          </div>
        )}
      </div>
    </div>
  )
}
