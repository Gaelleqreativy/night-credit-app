import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'
import Filters from '../../components/Filters'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, Download, CreditCard, AlertTriangle, X, Camera, Pencil, ClipboardList, ChevronDown, ChevronUp, UtensilsCrossed, Merge } from 'lucide-react'

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

  // Édition du nom client
  const [editName, setEditName] = useState(false)
  const [nameForm, setNameForm] = useState({ firstName: '', lastName: '' })
  const [nameLoading, setNameLoading] = useState(false)

  // Édition téléphone
  const [editPhone, setEditPhone] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)

  // Édition plafond
  const [editLimit, setEditLimit] = useState(false)
  const [newLimit, setNewLimit] = useState('')
  const [limitLoading, setLimitLoading] = useState(false)

  // Modal fusion
  const [showMerge, setShowMerge] = useState(false)
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeResults, setMergeResults] = useState([])
  const [mergeTarget, setMergeTarget] = useState(null)
  const [mergeLoading, setMergeLoading] = useState(false)
  const [mergeError, setMergeError] = useState('')

  // Modal édition transaction
  const [editTx, setEditTx] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Historique des modifications
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    api.get('/establishments').then((r) => setEstablishments(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    api.get(`/clients/${id}`).then((r) => { setClient(r.data); setNewStatus(r.data.status) }).finally(() => setLoading(false))
  }, [id])

  function openEditName() {
    setNameForm({ firstName: client.firstName, lastName: client.lastName })
    setEditName(true)
  }

  async function handleNameSubmit(e) {
    e.preventDefault()
    setNameLoading(true)
    try {
      await api.put(`/clients/${id}`, nameForm)
      setClient((c) => ({ ...c, ...nameForm }))
      setEditName(false)
    } finally {
      setNameLoading(false)
    }
  }

  async function handleStatusUpdate() {
    await api.put(`/clients/${id}`, { status: newStatus })
    setClient((c) => ({ ...c, status: newStatus }))
    setEditStatus(false)
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault()
    setPhoneLoading(true)
    try {
      await api.put(`/clients/${id}`, { phone: newPhone })
      setClient((c) => ({ ...c, phone: newPhone }))
      setEditPhone(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la mise à jour')
    } finally {
      setPhoneLoading(false)
    }
  }

  async function handleLimitSubmit(e) {
    e.preventDefault()
    setLimitLoading(true)
    const val = newLimit === '' ? null : Number(newLimit)
    try {
      await api.put(`/clients/${id}`, { creditLimit: val })
      setClient((c) => ({ ...c, creditLimit: val }))
      setEditLimit(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la mise à jour')
    } finally {
      setLimitLoading(false)
    }
  }

  async function searchMerge(q) {
    setMergeSearch(q)
    setMergeTarget(null)
    if (q.length < 2) { setMergeResults([]); return }
    const { data } = await api.get(`/clients?search=${encodeURIComponent(q)}`)
    setMergeResults(data.filter((c) => c.id !== Number(id)))
  }

  async function handleMerge() {
    if (!mergeTarget) return
    if (!confirm(`Fusionner "${mergeTarget.lastName} ${mergeTarget.firstName}" dans "${client.lastName} ${client.firstName}" ?\n\nToutes les transactions de ${mergeTarget.lastName} ${mergeTarget.firstName} seront déplacées ici, puis ce client sera supprimé. Cette action est irréversible.`)) return
    setMergeLoading(true)
    setMergeError('')
    try {
      await api.post(`/clients/${id}/merge`, { sourceId: mergeTarget.id })
      // Recharger le client pour voir les nouvelles transactions
      const { data } = await api.get(`/clients/${id}`)
      setClient(data)
      setShowMerge(false)
      setMergeSearch('')
      setMergeResults([])
      setMergeTarget(null)
    } catch (err) {
      setMergeError(err.response?.data?.error || 'Erreur lors de la fusion')
    } finally {
      setMergeLoading(false)
    }
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

  async function loadHistory() {
    if (showHistory) { setShowHistory(false); return }
    setShowHistory(true)
    if (history.length > 0) return
    setHistoryLoading(true)
    try {
      const { data } = await api.get(`/audit?clientId=${id}&limit=50`)
      setHistory(data.logs)
    } finally {
      setHistoryLoading(false)
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
  if (!client) return <div className="text-red-600 text-center py-20">Client introuvable</div>

  const overLimit = client.creditLimit && client.solde > client.creditLimit

  return (
    <div className="space-y-6 max-w-5xl">
      {/* En-tête */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link to="/admin/clients" className="text-gray-500 text-sm hover:text-gray-900 flex items-center gap-1"><ArrowLeft size={14} /> Retour</Link>
          {editName ? (
            <form onSubmit={handleNameSubmit} className="flex items-center gap-2 mt-1 flex-wrap">
              <input
                className="input text-lg font-bold py-1 w-36"
                value={nameForm.lastName}
                onChange={(e) => setNameForm({ ...nameForm, lastName: e.target.value })}
                placeholder="Nom"
                required
                autoFocus
              />
              <input
                className="input text-lg font-bold py-1 w-36"
                value={nameForm.firstName}
                onChange={(e) => setNameForm({ ...nameForm, firstName: e.target.value })}
                placeholder="Prénom"
                required
              />
              <button type="submit" className="btn-primary text-sm py-1 px-3" disabled={nameLoading}>
                {nameLoading ? '...' : 'OK'}
              </button>
              <button type="button" className="btn-secondary text-sm py-1 px-3" onClick={() => setEditName(false)}>Annuler</button>
            </form>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl font-bold">{client.lastName} {client.firstName}</h1>
              {!isManager && (
                <button onClick={openEditName} className="text-gray-400 hover:text-blue-600 transition-colors" title="Modifier le nom">
                  <Pencil size={15} />
                </button>
              )}
            </div>
          )}
          {editPhone ? (
            <form onSubmit={handlePhoneSubmit} className="flex items-center gap-2 mt-1">
              <input
                className="input py-1 w-40"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Téléphone"
                required
                autoFocus
              />
              <button type="submit" className="btn-primary text-sm py-1 px-3" disabled={phoneLoading}>{phoneLoading ? '...' : 'OK'}</button>
              <button type="button" className="btn-secondary text-sm py-1 px-3" onClick={() => setEditPhone(false)}>Annuler</button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-gray-500">{client.phone}</p>
              {!isManager && (
                <button onClick={() => { setNewPhone(client.phone); setEditPhone(true) }} className="text-xs text-blue-600 hover:underline">
                  Modifier
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportClient('xlsx')} className="btn-secondary text-sm flex items-center gap-1.5"><Download size={13} /> Excel</button>
          <button onClick={() => exportClient('pdf')} className="btn-secondary text-sm flex items-center gap-1.5"><Download size={13} /> PDF</button>
          {isAdmin && <button onClick={() => { setShowMerge(true); setMergeSearch(''); setMergeResults([]); setMergeTarget(null); setMergeError('') }} className="btn-secondary text-sm flex items-center gap-1.5"><Merge size={13} /> Fusionner</button>}
          {!isManager && <Link to={`/admin/consommation?clientId=${id}`} className="btn-primary text-sm">+ Consommation</Link>}
          {!isManager && <Link to={`/admin/paiement?clientId=${id}`} className="btn-success text-sm flex items-center gap-1.5"><CreditCard size={13} /> Paiement</Link>}
        </div>
      </div>

      {/* Solde + statut */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`card ${overLimit ? 'border-red-300' : ''}`}>
          <p className="text-sm text-gray-500">Solde dû</p>
          <p className="text-2xl font-bold text-red-600">{fmt(client.solde)}</p>
          {overLimit && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> Plafond dépassé !</p>}
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total consommé</p>
          <p className="text-xl font-semibold text-blue-600">{fmt(client.totalConso)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total encaissé</p>
          <p className="text-xl font-semibold text-emerald-600">{fmt(client.totalPaiement)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-1">Statut</p>
          <StatusBadge status={client.status} />
          {editLimit ? (
            <form onSubmit={handleLimitSubmit} className="flex items-center gap-2 mt-1">
              <input
                type="number"
                className="input text-xs py-1 w-28"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="Plafond FCFA"
                min="0"
                autoFocus
              />
              <button type="submit" className="btn-primary text-xs px-2 py-1" disabled={limitLoading}>{limitLoading ? '...' : 'OK'}</button>
              <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => setEditLimit(false)}>✕</button>
            </form>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500">Plafond : {client.creditLimit ? fmt(client.creditLimit) : 'Aucun'}</p>
              {!isManager && (
                <button onClick={() => { setNewLimit(client.creditLimit || ''); setEditLimit(true) }} className="text-xs text-blue-600 hover:underline">
                  Modifier
                </button>
              )}
            </div>
          )}
          {!isManager && <button onClick={() => setEditStatus(true)} className="text-xs text-blue-600 mt-2 hover:underline">Modifier statut</button>}
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
            <span className="text-sm text-red-600">Contestées seulement</span>
          </label>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-500 ml-auto flex items-center gap-1">
              <X size={11} /> Réinitialiser
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
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
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
                <tr key={t.id} className={`border-b border-gray-50 hover:bg-gray-50 ${t.disputed ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-2">{fmtDate(t.date)}</td>
                  <td className="px-4 py-2 text-gray-700">{t.establishment.name}</td>
                  <td className="px-4 py-2 text-gray-500 hidden md:table-cell">
                    {t.ticketRef || '-'}
                    {t.ticketPhotoUrl && (
                      <a href={t.ticketPhotoUrl} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 text-xs"><Camera size={13} /></a>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-blue-600">{t.consommation ? fmt(t.consommation) : '-'}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{t.paiement ? fmt(t.paiement) : '-'}</td>
                  <td className="px-4 py-2 hidden lg:table-cell text-gray-500">{t.moyenPaiement || '-'}</td>
                  <td className="px-4 py-2 hidden lg:table-cell text-gray-500 max-w-xs truncate">{t.notes || '-'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {t.disputed && <span className="badge-red badge text-xs mr-1">Contesté</span>}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditModal(t)}
                          className="text-blue-600 hover:text-blue-800 text-xs mr-2"
                          title="Modifier"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                          title="Supprimer"
                        >
                          <X size={13} />
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

      {/* Historique des modifications */}
      {isAdmin && (
        <div className="card p-0 overflow-hidden">
          <button
            onClick={loadHistory}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2"><ClipboardList size={15} /> Historique des modifications</span>
            {showHistory ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </button>
          {showHistory && (
            <div className="border-t border-gray-100">
              {historyLoading ? (
                <p className="text-center py-6 text-gray-500 text-sm">Chargement...</p>
              ) : history.length === 0 ? (
                <p className="text-center py-6 text-gray-500 text-sm">Aucune modification enregistrée</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-gray-100">
                      <tr className="text-gray-500">
                        <th className="text-left px-4 py-2">Date</th>
                        <th className="text-left px-4 py-2">Utilisateur</th>
                        <th className="text-left px-4 py-2">Action</th>
                        <th className="text-left px-4 py-2">Entité</th>
                        <th className="text-left px-4 py-2">Détails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                            {new Date(log.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-2 text-gray-700">{log.user?.name}</td>
                          <td className="px-4 py-2">
                            <span className={`badge ${log.action === 'CREATE' ? 'badge-green' : log.action === 'DELETE' ? 'badge-red' : 'badge-blue'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-500">{log.entity} #{log.entityId}</td>
                          <td className="px-4 py-2 text-gray-500 font-mono max-w-xs truncate">{log.detail || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal fusion */}
      {showMerge && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Merge size={18} /> Fusionner un doublon</h2>
              <button onClick={() => setShowMerge(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Recherchez le client doublon à fusionner <strong>dans</strong> <span className="text-gray-900 font-medium">{client.lastName} {client.firstName}</span>.
              Ses transactions seront déplacées ici, puis il sera supprimé.
            </p>

            <input
              className="input mb-3"
              placeholder="Rechercher par nom ou téléphone..."
              value={mergeSearch}
              onChange={(e) => searchMerge(e.target.value)}
              autoFocus
            />

            {mergeResults.length > 0 && !mergeTarget && (
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 max-h-48 overflow-y-auto">
                {mergeResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setMergeTarget(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium">{c.lastName} {c.firstName}</span>
                    <span className="text-gray-500 text-xs ml-2">{c.phone}</span>
                    <span className="text-red-600 text-xs ml-2">{Number(c.solde || 0).toLocaleString('fr-FR')} FCFA dû</span>
                  </button>
                ))}
              </div>
            )}

            {mergeSearch.length >= 2 && mergeResults.length === 0 && !mergeTarget && (
              <p className="text-sm text-gray-400 mb-3">Aucun client trouvé</p>
            )}

            {mergeTarget && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm font-medium text-amber-800">Client sélectionné :</p>
                <p className="text-sm text-amber-900 mt-0.5">{mergeTarget.lastName} {mergeTarget.firstName} — {mergeTarget.phone}</p>
                <p className="text-xs text-amber-700 mt-1">Solde dû : {Number(mergeTarget.solde || 0).toLocaleString('fr-FR')} FCFA</p>
                <button onClick={() => { setMergeTarget(null) }} className="text-xs text-amber-600 hover:underline mt-1">Changer</button>
              </div>
            )}

            {mergeError && <p className="text-red-600 text-sm mb-3">{mergeError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={!mergeTarget || mergeLoading}
                onClick={handleMerge}
              >
                <Merge size={14} />
                {mergeLoading ? 'Fusion en cours...' : 'Fusionner'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowMerge(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition transaction */}
      {editTx && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-1">Modifier la transaction</h2>
            <p className="text-xs text-gray-500 mb-4">
              <span className="flex items-center gap-2">{editTx.type === 'CONSOMMATION' ? <UtensilsCrossed size={16} /> : <CreditCard size={16} />}{editTx.type === 'CONSOMMATION' ? 'Consommation' : 'Paiement'} — ID #{editTx.id}</span>
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

              {editError && <p className="text-red-600 text-sm">{editError}</p>}

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
