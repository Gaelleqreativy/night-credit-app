import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/axios'

const MOYENS = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CB', label: 'Carte bancaire' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
]

export default function AddPaiement() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [form, setForm] = useState({
    clientId: searchParams.get('clientId') || '',
    establishmentId: '',
    paiement: '',
    moyenPaiement: 'ESPECES',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get('/clients').then((r) => setClients(r.data))
    api.get('/establishments').then((r) => setEstablishments(r.data))
  }, [])

  useEffect(() => {
    if (form.clientId) {
      const c = clients.find((c) => c.id === Number(form.clientId))
      setSelectedClient(c || null)
    }
  }, [form.clientId, clients])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      const { data } = await api.post('/transactions/paiement', form)
      setSuccess(`Paiement enregistré ! Nouveau solde : ${Number(data.newSolde).toLocaleString('fr-FR')} FCFA`)
      if (form.clientId) setTimeout(() => navigate(`/admin/clients/${form.clientId}`), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Enregistrer un paiement</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Client *</label>
          <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
            <option value="">Sélectionner un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.lastName} {c.firstName} — {c.phone}</option>
            ))}
          </select>
          {selectedClient && (
            <p className="text-sm mt-1 text-red-300">
              Solde actuel : {Number(selectedClient.solde || 0).toLocaleString('fr-FR')} FCFA
            </p>
          )}
        </div>
        <div>
          <label className="label">Établissement *</label>
          <select className="input" value={form.establishmentId} onChange={(e) => setForm({ ...form, establishmentId: e.target.value })} required>
            <option value="">Sélectionner un établissement</option>
            {establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant payé (FCFA) *</label>
            <input type="number" className="input" value={form.paiement} onChange={(e) => setForm({ ...form, paiement: e.target.value })} min="1" required />
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="label">Moyen de paiement *</label>
          <div className="grid grid-cols-3 gap-2">
            {MOYENS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setForm({ ...form, moyenPaiement: m.value })}
                className={`py-2 px-3 rounded-lg text-sm border transition-colors ${
                  form.moyenPaiement === m.value
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'border-night-700 text-gray-400 hover:border-indigo-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Notes (visible comptabilité uniquement)</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-emerald-400 text-sm">{success}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn-success flex-1" disabled={loading}>
            {loading ? 'Enregistrement...' : '💳 Enregistrer le paiement'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
