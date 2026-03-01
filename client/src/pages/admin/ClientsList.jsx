import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { SkeletonRow } from '../../components/Skeleton'

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <span className="text-night-700 ml-1">↕</span>
  return <span className="text-indigo-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

export default function ClientsList() {
  const { adminUser } = useAuth()
  const isManager = adminUser?.role === 'MANAGER'
  const [clients, setClients] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [establishmentId, setEstablishmentId] = useState('')
  const [withDebt, setWithDebt] = useState(false)
  const [overLimit, setOverLimit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('lastName')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', pin: '', creditLimit: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    api.get('/establishments').then((r) => setEstablishments(r.data))
  }, [])

  async function fetchClients() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (establishmentId) params.set('establishmentId', establishmentId)
      const { data } = await api.get(`/clients?${params}`)
      setClients(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients(); setPage(1) }, [search, status, establishmentId])

  function toggleSort(f) {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(f); setSortDir('asc') }
    setPage(1)
  }

  // Filtres + tri + pagination client-side
  const filtered = useMemo(() => {
    const base = clients.filter((c) => {
      if (withDebt && c.solde <= 0) return false
      if (overLimit && (!c.creditLimit || c.solde <= c.creditLimit)) return false
      return true
    })
    return [...base].sort((a, b) => {
      let va, vb
      if (sortField === 'solde') { va = a.solde || 0; vb = b.solde || 0 }
      else if (sortField === 'status') { va = a.status; vb = b.status }
      else { va = `${a.lastName} ${a.firstName}`.toLowerCase(); vb = `${b.lastName} ${b.firstName}`.toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [clients, withDebt, overLimit, sortField, sortDir])

  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      const { data } = await api.post('/clients', {
        ...form,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
      })
      setShowCreate(false)
      setForm({ firstName: '', lastName: '', phone: '', pin: '', creditLimit: '' })
      navigate(`/admin/clients/${data.id}`)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erreur')
    } finally {
      setFormLoading(false)
    }
  }

  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA' }
  function resetFilters() { setSearch(''); setStatus(''); setEstablishmentId(''); setWithDebt(false); setOverLimit(false); setPage(1) }
  const hasActiveFilters = search || status || establishmentId || withDebt || overLimit

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        {!isManager && <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Nouveau client</button>}
      </div>

      {/* Filtres */}
      <div className="card space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher (nom, téléphone)..."
            className="input flex-1 min-w-48"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="EN_COURS">En cours</option>
            <option value="EN_RETARD">En retard</option>
            <option value="SOLDE">Soldé</option>
          </select>
          <select className="input w-auto" value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)}>
            <option value="">Tous les établissements</option>
            {establishments.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withDebt}
              onChange={(e) => setWithDebt(e.target.checked)}
              className="w-4 h-4 accent-indigo-500"
            />
            <span className="text-sm text-gray-300">Avec dette uniquement</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overLimit}
              onChange={(e) => setOverLimit(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-sm text-amber-300/80">Plafond dépassé</span>
          </label>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-400 ml-auto">
              ✕ Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Compteur résultats */}
      {!loading && (
        <p className="text-sm text-gray-500">
          {filtered.length} client{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== clients.length && ` (sur ${clients.length})`}
          {pages > 1 && ` — page ${page}/${pages}`}
        </p>
      )}

      {/* Tableau */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-night-800">
            <tr className="text-gray-500 select-none">
              <th className="text-left px-4 py-3 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('lastName')}>
                Client <SortIcon field="lastName" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Téléphone</th>
              <th className="text-left px-4 py-3 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('status')}>
                Statut <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="text-right px-4 py-3 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('solde')}>
                Solde dû <SortIcon field="solde" sortField={sortField} sortDir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">Aucun client trouvé</td></tr>
            ) : paginated.map((c) => (
              <tr
                key={c.id}
                className="border-b border-night-800/50 hover:bg-night-800/30 cursor-pointer"
                onClick={() => navigate(`/admin/clients/${c.id}`)}
              >
                <td className="px-4 py-3 font-medium">
                  {c.lastName} {c.firstName}
                  {c.creditLimit && c.solde > c.creditLimit && (
                    <span className="ml-2 text-xs text-amber-400">⚠️ plafond</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{c.phone}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-right font-semibold">
                  {c.solde > 0
                    ? <span className="text-red-300">{fmt(c.solde)}</span>
                    : <span className="text-emerald-400">Soldé</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-night-800 flex items-center justify-between gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              ← Préc.
            </button>
            <span className="text-sm text-gray-500">Page {page} / {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Suiv. →
            </button>
          </div>
        )}
      </div>

      {/* Modal création */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nouveau client</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prénom</label>
                  <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div>
                <label className="label">PIN initial (4 chiffres — à communiquer au client)</label>
                <input className="input" maxLength={4} pattern="\d{4}" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} placeholder="Ex: 1234" required />
              </div>
              <div>
                <label className="label">Plafond de crédit (optionnel)</label>
                <input type="number" className="input" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} placeholder="Laisser vide = pas de limite" />
              </div>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={formLoading}>
                  {formLoading ? 'Création...' : 'Créer'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
