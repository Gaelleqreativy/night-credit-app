import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/axios'
import { useToast } from '../../context/ToastContext'
import { AlertTriangle, Camera, Upload, X } from 'lucide-react'

export default function AddConsommation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
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
  const [photoPreview, setPhotoPreview] = useState(null)

  function handlePhotoChange(file) {
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(file)
    setPhotoPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(null)
    setPhotoPreview(null)
  }
  const selectedClient = clients.find((c) => String(c.id) === String(form.clientId))
  const creditAlert = selectedClient?.creditLimit && form.consommation
    ? (selectedClient.solde + Number(form.consommation)) > selectedClient.creditLimit
    : false
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/clients').then((r) => setClients(r.data))
    api.get('/establishments').then((r) => setEstablishments(r.data))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.clientId || !form.establishmentId || !form.consommation || !form.date)
      return addToast('Veuillez remplir tous les champs obligatoires', 'error')
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (photo) fd.append('ticketPhoto', photo)
      await api.post('/transactions/consommation', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      addToast('Consommation enregistrée avec succès !', 'success')
      if (form.clientId) setTimeout(() => navigate(`/admin/clients/${form.clientId}`), 1000)
      else { setForm((f) => ({ ...f, ticketRef: '', consommation: '', notes: '' })); clearPhoto() }
    } catch (err) {
      addToast(err.response?.data?.error || "Erreur lors de l'enregistrement", 'error')
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
          {photo ? (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
              {photoPreview ? (
                <img src={photoPreview} alt="ticket" className="w-14 h-14 object-cover rounded-lg shrink-0 border border-gray-200" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 text-xs text-gray-500 text-center leading-tight px-1">PDF</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{photo.name}</p>
                <p className="text-xs text-gray-400">{(photo.size / 1024).toFixed(0)} Ko</p>
              </div>
              <button type="button" onClick={clearPhoto} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Bouton caméra — ouvre directement l'appareil photo sur mobile */}
              <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors py-4 text-sm font-medium">
                <Camera size={20} />
                Prendre une photo
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoChange(e.target.files[0])} />
              </label>
              {/* Bouton fichier — ouvre la galerie ou l'explorateur */}
              <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors py-4 text-sm font-medium">
                <Upload size={20} />
                Choisir un fichier
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handlePhotoChange(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>
        <div>
          <label className="label">Notes (visible comptabilité uniquement)</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Table VIP, client régulier..." />
        </div>
        {creditAlert && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-amber-700 text-sm font-medium flex items-center gap-1.5"><AlertTriangle size={14} />Dépassement du plafond de crédit</p>
            <p className="text-amber-600 text-xs mt-0.5">
              Solde actuel: {Number(selectedClient.solde).toLocaleString('fr-FR')} FCFA + {Number(form.consommation).toLocaleString('fr-FR')} FCFA = {(selectedClient.solde + Number(form.consommation)).toLocaleString('fr-FR')} FCFA
              (plafond: {Number(selectedClient.creditLimit).toLocaleString('fr-FR')} FCFA)
            </p>
          </div>
        )}
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
