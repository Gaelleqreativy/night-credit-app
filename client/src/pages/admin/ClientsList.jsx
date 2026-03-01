import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'

export default function ClientsList() {
  const { adminUser } = useAuth()
  const isManager = adminUser?.role === 'MANAGER'
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', pin: '', creditLimit: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  async function fetchClients() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const { data } = await api.get(`/clients?${params}`)
      setClients(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClients() }, [search, status])

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

  function fmt(n) {
    return Number(n || 0).toLocaleString('fr-FR') + ' FCFA'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        {!isManager && <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Nouveau client</button>}
      </div>

      {/* Filtres */}
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
      </div>

      {/* Tableau */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-night-800">
            <tr className="text-gray-500">
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Téléphone</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-right px-4 py-3">Solde dû</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">Chargement...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">Aucun client trouvé</td></tr>
            ) : clients.map((c) => (
              <tr
                key={c.id}
                className="border-b border-night-800/50 hover:bg-night-800/30 cursor-pointer"
                onClick={() => navigate(`/admin/clients/${c.id}`)}
              >
                <td className="px-4 py-3 font-medium">{c.lastName} {c.firstName}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{c.phone}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-right font-semibold text-red-300">
                  {c.solde > 0 ? fmt(c.solde) : <span className="text-emerald-400">Soldé</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
