import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      loginAdmin(data.user)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌙</div>
          <h1 className="text-2xl font-bold text-indigo-400">Night Credit</h1>
          <p className="text-gray-500 text-sm mt-1">Espace comptabilité</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/client/login" className="text-sm text-gray-500 hover:text-indigo-400">
            → Espace client
          </a>
        </div>
      </div>
    </div>
  )
}
