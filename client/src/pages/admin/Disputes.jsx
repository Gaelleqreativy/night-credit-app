import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { X, Check, XCircle } from 'lucide-react'

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtres
  const [search, setSearch] = useState('')
  const [establishmentId, setEstablishmentId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('OUVERTE')

  // Modal résolution
  const [resolveTx, setResolveTx] = useState(null)
  const [resolveNote, setResolveNote] = useState('')
  const [resolveLoading, setResolveLoading] = useState(false)
  const [resolveError, setResolveError] = useState('')

  async function fetchDisputes() {
    setLoading(true)
    const { data } = await api.get('/transactions?disputed=true')
    setDisputes(data)
    setLoading(false)
  }

  useEffect(() => { fetchDisputes() }, [])

  function openResolveModal(tx) {
    setResolveTx(tx)
    setResolveNote('')
    setResolveError('')
  }

  async function handleResolve(resolveType) {
    setResolveLoading(true)
    setResolveError('')
    try {
      await api.put(`/transactions/${resolveTx.id}/resolve-dispute`, { resolveType, resolveNote })
      setResolveTx(null)
      fetchDisputes()
    } catch (err) {
      setResolveError(err.response?.data?.error || 'Erreur')
    } finally {
      setResolveLoading(false)
    }
  }

  // Etablissements distincts
  const establishments = useMemo(() => {
    const map = new Map()
    disputes.forEach((d) => { if (d.establishment) map.set(d.establishment.id, d.establishment) })
    return Array.from(map.values())
  }, [disputes])

  // Filtrage
  const filtered = useMemo(() => {
    return disputes.filter((d) => {
      if (statusFilter === 'OUVERTE' && d.disputeStatus !== 'OUVERTE') return false
      if (statusFilter === 'RESOLUES' && d.disputeStatus !== 'ACCEPTEE' && d.disputeStatus !== 'REJETEE') return false
      if (statusFilter === 'ACCEPTEE' && d.disputeStatus !== 'ACCEPTEE') return false
      if (statusFilter === 'REJETEE' && d.disputeStatus !== 'REJETEE') return false
      if (search) {
        const q = search.toLowerCase()
        const name = `${d.client?.lastName} ${d.client?.firstName}`.toLowerCase()
        if (!name.includes(q)) return false
      }
      if (establishmentId && String(d.establishment?.id) !== String(establishmentId)) return false
      if (dateFrom && new Date(d.date) < new Date(dateFrom)) return false
      if (dateTo && new Date(d.date) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [disputes, search, establishmentId, dateFrom, dateTo, statusFilter])

  const open = filtered.filter((d) => d.disputeStatus === 'OUVERTE')
  const resolved = filtered.filter((d) => d.disputeStatus === 'ACCEPTEE' || d.disputeStatus === 'REJETEE')
  const totalOpen = disputes.filter((d) => d.disputeStatus === 'OUVERTE').length

  function fmtDate(d) { return new Date(d).toLocaleDateString('fr-FR') }
  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA' }
  function resetFilters() { setSearch(''); setEstablishmentId(''); setDateFrom(''); setDateTo(''); setStatusFilter('OUVERTE') }
  const hasActiveFilters = search || establishmentId || dateFrom || dateTo || statusFilter !== 'OUVERTE'

  const showOpen = statusFilter === 'OUVERTE' || statusFilter === 'TOUTES'
  const showResolved = statusFilter === 'RESOLUES' || statusFilter === 'ACCEPTEE' || statusFilter === 'REJETEE' || statusFilter === 'TOUTES'

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contestations</h1>
        {totalOpen > 0 && <span className="badge badge-red text-sm">{totalOpen} ouverte{totalOpen > 1 ? 's' : ''}</span>}
      </div>

      {/* Filtres */}
      <div className="card space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher un client..."
            className="input flex-1 min-w-40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input w-auto" value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)}>
            <option value="">Tous les établissements</option>
            {establishments.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="OUVERTE">Ouvertes</option>
            <option value="RESOLUES">Résolues</option>
            <option value="ACCEPTEE">Acceptées</option>
            <option value="REJETEE">Rejetées</option>
            <option value="TOUTES">Toutes</option>
          </select>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Du</label>
            <input type="date" className="input w-auto text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Au</label>
            <input type="date" className="input w-auto text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-500 ml-auto">
              <X size={11} className="inline mr-1" />Réinitialiser
            </button>
          )}
        </div>
      </div>

      {!loading && (
        <p className="text-sm text-gray-500">
          {filtered.length} contestation{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== disputes.length && ` (sur ${disputes.length})`}
        </p>
      )}

      {/* Ouvertes */}
      {showOpen && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <h2 className="font-semibold">Contestations ouvertes</h2>
            {open.length > 0 && <span className="badge badge-red">{open.length}</span>}
          </div>
          {loading ? (
            <p className="text-center py-6 text-gray-500">Chargement...</p>
          ) : open.length === 0 ? (
            <p className="text-center py-6 text-gray-500">Aucune contestation ouverte</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-gray-500">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Client</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Établissement</th>
                  <th className="text-right px-4 py-2">Montant</th>
                  <th className="text-left px-4 py-2">Motif client</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {open.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(d.date)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/clients/${d.clientId}`} className="text-blue-600 hover:underline">
                        {d.client?.lastName} {d.client?.firstName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{d.establishment?.name}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{fmt(d.consommation || d.paiement)}</td>
                    <td className="px-4 py-3 text-amber-700 text-sm max-w-xs truncate">{d.disputeNote}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openResolveModal(d)} className="btn-primary text-xs px-3 py-1 whitespace-nowrap">
                        Traiter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* Résolues */}
      {showResolved && resolved.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-500">Contestations traitées ({resolved.length})</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-gray-500">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Client</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Établissement</th>
                <th className="text-right px-4 py-2">Montant</th>
                <th className="text-left px-4 py-2">Motif client</th>
                <th className="text-left px-4 py-2">Réponse admin</th>
                <th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 opacity-70">
                  <td className="px-4 py-2 whitespace-nowrap">{fmtDate(d.date)}</td>
                  <td className="px-4 py-2">
                    <Link to={`/admin/clients/${d.clientId}`} className="text-blue-600 hover:underline">
                      {d.client?.lastName} {d.client?.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{d.establishment?.name}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">{fmt(d.consommation || d.paiement)}</td>
                  <td className="px-4 py-2 text-gray-500 text-sm max-w-[160px] truncate">{d.disputeNote}</td>
                  <td className="px-4 py-2 text-gray-500 text-sm max-w-[160px] truncate">{d.resolveNote || '-'}</td>
                  <td className="px-4 py-2">
                    {d.disputeStatus === 'ACCEPTEE'
                      ? <span className="badge badge-green">Acceptée</span>
                      : <span className="badge badge-red">Rejetée</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal résolution */}
      {resolveTx && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-1">Traiter la contestation</h2>
            <div className="mb-4 space-y-1">
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Client :</span> {resolveTx.client?.lastName} {resolveTx.client?.firstName}
              </p>
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Montant :</span> {fmt(resolveTx.consommation || resolveTx.paiement)}
              </p>
              <p className="text-sm text-amber-700 mt-2">
                <span className="text-gray-500">Motif client :</span> {resolveTx.disputeNote}
              </p>
            </div>

            <div className="mb-4">
              <label className="label">Réponse / Note admin (optionnel)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Explication de la décision..."
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
              />
            </div>

            {resolveError && <p className="text-red-600 text-sm mb-3">{resolveError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => handleResolve('ACCEPTEE')}
                disabled={resolveLoading}
                className="btn-success flex-1 text-sm"
              >
                <Check size={13} className="inline mr-1" />Accepter
              </button>
              <button
                onClick={() => handleResolve('REJETEE')}
                disabled={resolveLoading}
                className="btn-danger flex-1 text-sm"
              >
                <XCircle size={13} className="inline mr-1" />Rejeter
              </button>
              <button
                type="button"
                onClick={() => setResolveTx(null)}
                className="btn-secondary text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
