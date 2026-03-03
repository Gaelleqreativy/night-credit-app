import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { ArrowRight } from 'lucide-react'

export default function ClientLogin() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginClient } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (pin.length !== 4) return setError('Le PIN doit comporter 4 chiffres')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/client-login', { phone, pin })
      loginClient(data.client)
      // Si le PIN doit être changé, rediriger vers la page PIN
      if (data.client.pinMustChange) {
        navigate('/client/pin')
      } else {
        navigate('/client/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Numéro ou PIN incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/Spirit-Group.png" alt="SpiritTab" className="h-16 mx-auto mb-2 object-contain" />
          <h1 className="text-2xl font-bold text-gray-800">SpiritTab</h1>
          <p className="text-gray-500 text-sm mt-1">Mon espace client</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Numéro de téléphone</label>
            <input
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 0600000000"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Code PIN (4 chiffres)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              className="input tracking-widest text-center text-xl"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Accéder à mon compte'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/admin/login" className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
            Espace comptabilité <ArrowRight size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}
