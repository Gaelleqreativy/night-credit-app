import { useEffect, useState } from 'react'
import api from '../../api/axios'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'COMPTABLE', establishmentIds: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/users').then((r) => setUsers(r.data))
    api.get('/establishments').then((r) => setEstablishments(r.data))
  }, [])

  function toggleEtab(id) {
    setForm((f) => ({
      ...f,
      establishmentIds: f.establishmentIds.includes(id)
        ? f.establishmentIds.filter((e) => e !== id)
        : [...f.establishmentIds, id],
    }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/users', form)
      setUsers((u) => [...u, data])
      setShowModal(false)
      setForm({ name: '', email: '', password: '', role: 'COMPTABLE', establishmentIds: [] })
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  async function deleteUser(id) {
    if (!confirm('Supprimer cet utilisateur ?')) return
    await api.delete(`/users/${id}`)
    setUsers((u) => u.filter((x) => x.id !== id))
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Nouveau</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-night-800">
            <tr className="text-gray-500">
              <th className="text-left px-4 py-2">Nom</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Rôle</th>
              <th className="text-left px-4 py-2">Établissements</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-night-800/50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'ADMIN' ? 'badge-red' : u.role === 'MANAGER' ? 'badge-purple' : 'badge-blue'}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.establishments?.map((e) => e.name).join(', ') || 'Tous'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteUser(u.id)} className="text-red-500 hover:text-red-300 text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nouvel utilisateur</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">Nom</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div>
                <label className="label">Rôle</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="COMPTABLE">Comptable</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {(form.role === 'COMPTABLE' || form.role === 'MANAGER') && (
                <div>
                  <label className="label">Accès établissements</label>
                  <div className="space-y-1">
                    {establishments.map((e) => (
                      <label key={e.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.establishmentIds.includes(e.id)}
                          onChange={() => toggleEtab(e.id)}
                          className="accent-indigo-500"
                        />
                        {e.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? 'Création...' : 'Créer'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
