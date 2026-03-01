import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/axios'

export default function AddConsommation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [form, setForm] = useState({
    clientId: searchParams.get('clientId') || '',
    establishmentId: '',
    ticketRef: '',
    consommation: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get('/clients').then((r) => setClients(r.data))
    api.get('/establishments').then((r) => setEstablishments(r.data))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.clientId || !form.establishmentId || !form.consommation || !form.date)
      return setError('Veuillez remplir tous les champs obligatoires')
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (photo) fd.append('ticketPhoto', photo)
      await api.post('/transactions/consommation', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess('Consommation enregistrée avec succès !')
      if (form.clientId) setTimeout(() => navigate(`/admin/clients/${form.clientId}`), 1200)
      else setForm((f) => ({ ...f, ticketRef: '', consommation: '', notes: '' }))
      setPhoto(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Ajouter une consommation</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Client *</label>
          <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
            <option value="">Sélectionner un client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.lastName} {c.firstName} — {c.phone}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Établissement *</label>
          <select className="input" value={form.establishmentId} onChange={(e) => setForm({ ...form, establishmentId: e.target.value })} required>
            <option value="">Sélectionner un établissement</option>
            {establishments.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant (FCFA) *</label>
            <input type="number" className="input" value={form.consommation} onChange={(e) => setForm({ ...form, consommation: e.target.value })} min="1" required />
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="label">Référence ticket</label>
          <input className="input" value={form.ticketRef} onChange={(e) => setForm({ ...form, ticketRef: e.target.value })} placeholder="Ex: T-2024-001" />
        </div>
        <div>
          <label className="label">Photo du ticket</label>
          <input type="file" accept="image/*,.pdf" className="input" onChange={(e) => setPhoto(e.target.files[0])} />
          {photo && <p className="text-xs text-gray-400 mt-1">Fichier sélectionné : {photo.name}</p>}
        </div>
        <div>
          <label className="label">Notes (visible comptabilité uniquement)</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Table VIP, client régulier..." />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-emerald-400 text-sm">{success}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
