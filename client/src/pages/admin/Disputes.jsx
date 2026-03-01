import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchDisputes() {
    setLoading(true)
    const { data } = await api.get('/transactions?disputed=true')
    setDisputes(data)
    setLoading(false)
  }

  useEffect(() => { fetchDisputes() }, [])

  async function resolve(id) {
    await api.put(`/transactions/${id}/resolve-dispute`)
    fetchDisputes()
  }

  const open = disputes.filter((d) => d.disputeStatus === 'OUVERTE')
  const resolved = disputes.filter((d) => d.disputeStatus === 'RESOLUE')

  function fmtDate(d) { return new Date(d).toLocaleDateString('fr-FR') }
  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA' }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Contestations</h1>

      {/* Ouvertes */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-night-800 flex items-center gap-2">
          <h2 className="font-semibold">Contestations ouvertes</h2>
          {open.length > 0 && <span className="badge badge-red">{open.length}</span>}
        </div>
        {loading ? (
          <p className="text-center py-6 text-gray-500">Chargement...</p>
        ) : open.length === 0 ? (
          <p className="text-center py-6 text-gray-500">Aucune contestation ouverte</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-night-800">
              <tr className="text-gray-500">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Client</th>
                <th className="text-left px-4 py-2">Établissement</th>
                <th className="text-right px-4 py-2">Montant</th>
                <th className="text-left px-4 py-2">Motif</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {open.map((d) => (
                <tr key={d.id} className="border-b border-night-800/50 hover:bg-night-800/20">
                  <td className="px-4 py-3">{fmtDate(d.date)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/clients/${d.clientId}`} className="text-indigo-400 hover:underline">
                      {d.client?.lastName} {d.client?.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{d.establishment?.name}</td>
                  <td className="px-4 py-3 text-right">{d.consommation ? fmt(d.consommation) : fmt(d.paiement)}</td>
                  <td className="px-4 py-3 text-yellow-300 text-sm">{d.disputeNote}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => resolve(d.id)} className="btn-success text-xs px-3 py-1">
                      Résoudre
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Résolues */}
      {resolved.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-night-800">
            <h2 className="font-semibold text-gray-400">Contestations résolues ({resolved.length})</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {resolved.map((d) => (
                <tr key={d.id} className="border-b border-night-800/50 opacity-60">
                  <td className="px-4 py-2">{fmtDate(d.date)}</td>
                  <td className="px-4 py-2">{d.client?.lastName} {d.client?.firstName}</td>
                  <td className="px-4 py-2 text-gray-500">{d.disputeNote}</td>
                  <td className="px-4 py-2"><span className="badge badge-green">Résolu</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
