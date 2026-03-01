import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'
import Filters from '../../components/Filters'
import { useAuth } from '../../context/AuthContext'

const MOYENS = ['ESPECES', 'CB', 'VIREMENT', 'CHEQUE', 'MOBILE_MONEY']

export default function ClientDetail() {
  const { adminUser } = useAuth()
  const isManager = adminUser?.role === 'MANAGER'
  const isAdmin = adminUser?.role === 'ADMIN'
  const { id } = useParams()
  const [client, setClient] = useState(null)
  const [establishments, setEstablishments] = useState([])
  const [year, setYear] = useState('')
  const [establishmentId, setEstablishmentId] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [disputedOnly, setDisputedOnly] = useState(false)
  const [editStatus, setEditStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  // Modal édition transaction
  const [editTx, setEditTx] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    api.get('/establishments').then((r) => setEstablishments(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    api.get(`/clients/${id}`).then((r) => { setClient(r.data); setNewStatus(r.data.status) }).finally(() => setLoading(false))
  }, [id])

  async function handleStatusUpdate() {
    await api.put(`/clients/${id}`, { status: newStatus })
    setClient((c) => ({ ...c, status: newStatus }))
    setEditStatus(false)
  }

  async function deleteTransaction(txId) {
    if (!confirm('Supprimer cette transaction ?')) return
    await api.delete(`/transactions/${txId}`)
    const { data } = await api.get(`/clients/${id}`)
    setClient(data)
  }

  function openEditModal(t) {
    setEditTx(t)
    setEditError('')
    setEditForm({
      date: new Date(t.date).toISOString().split('T')[0],
      establishmentId: String(t.establishmentId),
      ticketRef: t.ticketRef || '',
      notes: t.notes || '',
      consommation: t.consommation || '',
      paiement: t.paiement || '',
      moyenPaiement: t.moyenPaiement || '',
    })
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditError('')
    setEditLoading(true)
    try {
      await api.put(`/transactions/${editTx.id}`, editForm)
      const { data } = await api.get(`/clients/${id}`)
      setClient(data)
      setEditTx(null)
    } catch (err) {
      setEditError(err.response?.data?.error || 'Erreur')
    } finally {
      setEditLoading(false)
    }
  }

  function exportClient(format) {
    const params = new URLSearchParams({ format })
    if (year) params.set('year', year)
    window.open(`/api/export/client/${id}?${params}`, '_blank')
  }

  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA' }
  function fmtDate(d) { return new Date(d).toLocaleDateString('fr-FR') }

  const filtered = client?.transactions?.filter((t) => {
    if (establishmentId && t.establishmentId !== Number(establishmentId)) return false
    if (type && t.type !== type) return false
    if (year && new Date(t.date).getFullYear() !== Number(year)) return false
    if (disputedOnly && !t.disputed) return false
    return true
  }) || []

  const total = client?.transactions?.length || 0
  const hasActiveFilters = year || establishmentId || type || disputedOnly
  function resetFilters() { setYear(''); setEstablishmentId(''); setType(''); setDisputedOnly(false) }

  if (loading) return <div className="text-gray-500 text-center py-20">Chargement...</div>
  if (!client) return <div className="text-red-400 text-center py-20">Client introuvable</div>

  const overLimit = client.creditLimit && client.solde > client.creditLimit

  return (
    <div className="space-y-6 max-w-5xl">
      {/* En-tête */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link to="/admin/clients" className="text-gray-500 text-sm hover:text-gray-300">← Retour</Link>
          <h1 className="text-2xl font-bold mt-1">{client.lastName} {client.firstName}</h1>
          <p className="text-gray-400">{client.phone}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportClient('xlsx')} className="btn-secondary text-sm">⬇️ Excel</button>
          <button onClick={() => exportClient('pdf')} className="btn-secondary text-sm">⬇️ PDF</button>
          {!isManager && <Link to={`/admin/consommation?clientId=${id}`} className="btn-primary text-sm">+ Consommation</Link>}
          {!isManager && <Link to={`/admin/paiement?clientId=${id}`} className="btn-success text-sm">💳 Paiement</Link>}
        </div>
      </div>

      {/* Solde + statut */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`card ${overLimit ? 'border-red-500' : ''}`}>
          <p className="text-sm text-gray-500">Solde dû</p>
          <p className="text-2xl font-bold text-red-400">{fmt(client.solde)}</p>
          {overLimit && <p className="text-xs text-red-400 mt-1">⚠️ Plafond dépassé !</p>}
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total consommé</p>
          <p className="text-xl font-semibold text-indigo-300">{fmt(client.totalConso)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total encaissé</p>
          <p className="text-xl font-semibold text-emerald-300">{fmt(client.totalPaiement)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Statut</p>
          <StatusBadge status={client.status} />
          {client.creditLimit && <p className="text-xs text-gray-500 mt-1">Plafond : {fmt(client.creditLimit)}</p>}
          {!isManager && <button onClick={() => setEditStatus(true)} className="text-xs text-indigo-400 mt-2 hover:underline">Modifier</button>}
          {editStatus && (
            <div className="mt-2 flex gap-2">
              <select className="input text-xs" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="EN_COURS">En cours</option>
                <option value="EN_RETARD">En retard</option>
                <option value="SOLDE">Soldé</option>
              </select>
              <button onClick={handleStatusUpdate} className="btn-primary text-xs px-2">OK</button>
            </div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="card space-y-3">
        <Filters year={year} setYear={setYear} establishmentId={establishmentId} setEstablishmentId={setEstablishmentId} establishments={establishments} type={type} setType={setType} />
        <div className="flex items-center gap-5 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={disputedOnly}
              onChange={(e) => setDisputedOnly(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-sm text-red-300/80">Contestées seulement</span>
          </label>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-400 ml-auto">
              ✕ Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Compteur */}
      <p className="text-sm text-gray-500">
        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== total && ` (sur ${total})`}
      </p>

      {/* Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-night-800 flex items-center justify-between">
          <h2 className="font-semibold">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-night-800">
              <tr className="text-gray-500">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Établissement</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Réf. Ticket</th>
                <th className="text-right px-4 py-2">Conso</th>
                <th className="text-right px-4 py-2">Paiement</th>
                <th className="text-left px-4 py-2 hidden lg:table-cell">Moyen</th>
                <th className="text-left px-4 py-2 hidden lg:table-cell">Notes</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-gray-500">Aucune transaction</td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className={`border-b border-night-800/50 hover:bg-night-800/20 ${t.disputed ? 'bg-red-900/10' : ''}`}>
                  <td className="px-4 py-2">{fmtDate(t.date)}</td>
                  <td className="px-4 py-2 text-gray-300">{t.establishment.name}</td>
                  <td className="px-4 py-2 text-gray-400 hidden md:table-cell">
                    {t.ticketRef || '-'}
                    {t.ticketPhotoUrl && (
                      <a href={t.ticketPhotoUrl} target="_blank" rel="noreferrer" className="ml-2 text-indigo-400 text-xs">📷</a>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-indigo-300">{t.consommation ? fmt(t.consommation) : '-'}</td>
                  <td className="px-4 py-2 text-right text-emerald-300">{t.paiement ? fmt(t.paiement) : '-'}</td>
                  <td className="px-4 py-2 hidden lg:table-cell text-gray-400">{t.moyenPaiement || '-'}</td>
                  <td className="px-4 py-2 hidden lg:table-cell text-gray-400 max-w-xs truncate">{t.notes || '-'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {t.disputed && <span className="badge-red badge text-xs mr-1">Contesté</span>}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditModal(t)}
                          className="text-indigo-400 hover:text-indigo-200 text-xs mr-2"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          className="text-red-500 hover:text-red-300 text-xs"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal édition transaction */}
      {editTx && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-1">Modifier la transaction</h2>
            <p className="text-xs text-gray-500 mb-4">
              {editTx.type === 'CONSOMMATION' ? '🍾 Consommation' : '💳 Paiement'} — ID #{editTx.id}
            </p>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Établissement</label>
                  <select
                    className="input"
                    value={editForm.establishmentId}
                    onChange={(e) => setEditForm({ ...editForm, establishmentId: e.target.value })}
                  >
                    {establishments.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editTx.type === 'CONSOMMATION' && (
                <div>
                  <label className="label">Montant consommation (FCFA)</label>
                  <input
                    type="number"
                    className="input"
                    value={editForm.consommation}
                    onChange={(e) => setEditForm({ ...editForm, consommation: e.target.value })}
                    required
                  />
                </div>
              )}

              {editTx.type === 'PAIEMENT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Montant paiement (FCFA)</label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.paiement}
                      onChange={(e) => setEditForm({ ...editForm, paiement: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Moyen de paiement</label>
                    <select
                      className="input"
                      value={editForm.moyenPaiement}
                      onChange={(e) => setEditForm({ ...editForm, moyenPaiement: e.target.value })}
                    >
                      {MOYENS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Réf. ticket</label>
                <input
                  className="input"
                  value={editForm.ticketRef}
                  onChange={(e) => setEditForm({ ...editForm, ticketRef: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <input
                  className="input"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>

              {editError && <p className="text-red-400 text-sm">{editError}</p>}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={editLoading}>
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditTx(null)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
