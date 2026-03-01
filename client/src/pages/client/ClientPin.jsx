import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ClientLayout from '../../components/ClientLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

export default function ClientPin() {
  const { clientData, updateClientData } = useAuth()
  const navigate = useNavigate()
  const forced = clientData?.pinMustChange === true

  const [form, setForm] = useState({ currentPin: '', newPin: '', confirmPin: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(form.newPin)) return setError('Le nouveau PIN doit être exactement 4 chiffres')
    if (form.newPin === (forced ? '0000' : null) && forced) return setError('Vous ne pouvez pas garder le PIN par défaut')
    if (form.newPin !== form.confirmPin) return setError('Les deux PIN ne correspondent pas')
    setLoading(true)
    try {
      await api.put('/clients/me/pin', { currentPin: form.currentPin, newPin: form.newPin })
      updateClientData({ pinMustChange: false })
      if (forced) {
        navigate('/client/dashboard')
      } else {
        setForm({ currentPin: '', newPin: '', confirmPin: '' })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ClientLayout>
      <div className="space-y-4">
        {forced && (
          <div className="bg-amber-900/40 border border-amber-600 rounded-xl p-4">
            <p className="text-amber-300 font-semibold text-sm">🔐 Changement de PIN requis</p>
            <p className="text-amber-200/70 text-xs mt-1">
              Pour sécuriser votre compte, vous devez choisir un nouveau PIN personnel avant de continuer.
            </p>
          </div>
        )}

        <h1 className="text-xl font-bold">{forced ? 'Choisir mon PIN' : 'Modifier mon PIN'}</h1>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">PIN actuel {forced && <span className="text-gray-500">(PIN temporaire reçu)</span>}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input tracking-widest text-center text-xl"
                value={form.currentPin}
                onChange={(e) => setForm({ ...form, currentPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="••••"
                required
                autoFocus
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
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Modification...' : forced ? 'Confirmer mon PIN' : 'Modifier mon PIN'}
            </button>
            {forced && (
              <p className="text-xs text-gray-600 text-center">
                Vous ne pouvez pas accéder à votre compte sans changer ce PIN.
              </p>
            )}
          </form>
        </div>

        {!forced && (
          <p className="text-xs text-gray-600 text-center">
            Si vous avez oublié votre PIN, contactez la comptabilité pour le réinitialiser.
          </p>
        )}
      </div>
    </ClientLayout>
  )
}
