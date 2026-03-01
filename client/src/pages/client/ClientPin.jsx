import { useState } from 'react'
import ClientLayout from '../../components/ClientLayout'
import api from '../../api/axios'

export default function ClientPin() {
  const [form, setForm] = useState({ currentPin: '', newPin: '', confirmPin: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!/^\d{4}$/.test(form.newPin)) return setError('Le nouveau PIN doit être exactement 4 chiffres')
    if (form.newPin !== form.confirmPin) return setError('Les deux PIN ne correspondent pas')
    setLoading(true)
    try {
      await api.put('/clients/me/pin', { currentPin: form.currentPin, newPin: form.newPin })
      setSuccess('Votre PIN a été modifié avec succès !')
      setForm({ currentPin: '', newPin: '', confirmPin: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ClientLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Modifier mon PIN</h1>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">PIN actuel</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input tracking-widest text-center text-xl"
                value={form.currentPin}
                onChange={(e) => setForm({ ...form, currentPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="••••"
                required
              />
            </div>
            <div>
              <label className="label">Nouveau PIN (4 chiffres)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input tracking-widest text-center text-xl"
                value={form.newPin}
                onChange={(e) => setForm({ ...form, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="••••"
                required
              />
            </div>
            <div>
              <label className="label">Confirmer le nouveau PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input tracking-widest text-center text-xl"
                value={form.confirmPin}
                onChange={(e) => setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="••••"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {success && <p className="text-emerald-400 text-sm text-center">{success}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Modification...' : 'Modifier mon PIN'}
            </button>
          </form>
        </div>
        <p className="text-xs text-gray-600 text-center">
          Si vous avez oublié votre PIN, contactez la comptabilité pour le réinitialiser.
        </p>
      </div>
    </ClientLayout>
  )
}
