import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Building2, Pencil, Trash2, Plus, X, ImagePlus } from 'lucide-react'

export default function EstablishmentsPage() {
  const [establishments, setEstablishments] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal create / edit
  const [modal, setModal] = useState(null) // null | 'create' | establishment object
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Confirmation suppression
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function fetchEstablishments() {
    setLoading(true)
    const { data } = await api.get('/establishments')
    setEstablishments(data)
    setLoading(false)
  }

  useEffect(() => { fetchEstablishments() }, [])

  function openCreate() {
    setModal('create')
    setName('')
    setAddress('')
    setLogoFile(null)
    setLogoPreview(null)
    setError('')
  }

  function openEdit(e) {
    setModal(e)
    setName(e.name)
    setAddress(e.address || '')
    setLogoFile(null)
    setLogoPreview(null)
    setError('')
  }

  function closeModal() {
    setModal(null)
    setLogoFile(null)
    if (logoPreview) { URL.revokeObjectURL(logoPreview); setLogoPreview(null) }
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Le nom est requis'); return }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('address', address.trim())
      if (logoFile) fd.append('logo', logoFile)
      if (modal === 'create') {
        await api.post('/establishments', fd)
      } else {
        await api.put(`/establishments/${modal.id}`, fd)
      }
      closeModal()
      fetchEstablishments()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/establishments/${id}`)
      setDeleteConfirm(null)
      fetchEstablishments()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const isEditing = modal && modal !== 'create'
  const currentLogoUrl = isEditing ? modal.logoUrl : null
  const previewSrc = logoPreview || currentLogoUrl

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Établissements</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {establishments.length} établissement{establishments.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}
        </div>
      ) : establishments.length === 0 ? (
        <div className="card text-center py-14 text-gray-400">
          <Building2 size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun établissement</p>
          <p className="text-sm mt-1">Cliquez sur « Ajouter » pour en créer un.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {establishments.map((e) => {
            const txCount = e._count?.transactions ?? 0
            return (
              <div key={e.id} className="card flex items-start gap-4">
                {/* Logo */}
                <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                  {e.logoUrl ? (
                    <img src={e.logoUrl} alt={e.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={22} className="text-gray-300" />
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">{e.name}</h2>
                  {e.address && <p className="text-sm text-gray-500 truncate mt-0.5">{e.address}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {txCount} transaction{txCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(e)}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Modifier"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(e.id)}
                    disabled={txCount > 0}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={txCount > 0 ? `Impossible : ${txCount} transaction(s) liée(s)` : 'Supprimer'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal create / edit */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">
                {modal === 'create' ? 'Nouvel établissement' : "Modifier l'établissement"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Logo */}
              <div>
                <label className="label">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    {previewSrc ? (
                      <img src={previewSrc} alt="aperçu" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={24} className="text-gray-300" />
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      <ImagePlus size={15} />
                      {previewSrc ? 'Changer le logo' : 'Ajouter un logo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG ou WEBP — max 2 Mo</p>
                  </div>
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className="label">Nom *</label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Le Caméléon"
                  required
                />
              </div>

              {/* Adresse */}
              <div>
                <label className="label">Adresse (optionnel)</label>
                <input
                  type="text"
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex : 12 rue de la Paix"
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-1">Supprimer l'établissement ?</h2>
            <p className="text-sm text-gray-500 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">
                Supprimer
              </button>
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
