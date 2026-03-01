import { useState } from 'react'
import api from '../../api/axios'
import { Download } from 'lucide-react'

export default function ImportPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleImport(e) {
    e.preventDefault()
    if (!file) return setError('Veuillez sélectionner un fichier Excel')
    setLoading(true); setError(''); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'import')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Import Excel</h1>

      {/* Instructions */}
      <div className="card space-y-3">
        <h2 className="font-semibold">Format attendu</h2>
        <p className="text-sm text-gray-500">Le fichier Excel doit contenir ces colonnes dans l'ordre :</p>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                {['date', 'prenom', 'nom', 'telephone', 'etablissement', 'ref_ticket', 'consommation', 'paiement', 'moyen_paiement', 'notes'].map((h) => (
                  <th key={h} className="px-2 py-1 text-left font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-gray-600 border-b border-gray-100">
                <td className="px-2 py-1">2024-01-15</td>
                <td className="px-2 py-1">Jean</td>
                <td className="px-2 py-1">Dupont</td>
                <td className="px-2 py-1">0600000001</td>
                <td className="px-2 py-1">Club Étoile</td>
                <td className="px-2 py-1">T-001</td>
                <td className="px-2 py-1">150</td>
                <td className="px-2 py-1"></td>
                <td className="px-2 py-1"></td>
                <td className="px-2 py-1">Table VIP</td>
              </tr>
              <tr className="text-gray-600">
                <td className="px-2 py-1">2024-01-20</td>
                <td className="px-2 py-1">Jean</td>
                <td className="px-2 py-1">Dupont</td>
                <td className="px-2 py-1">0600000001</td>
                <td className="px-2 py-1">Club Étoile</td>
                <td className="px-2 py-1"></td>
                <td className="px-2 py-1"></td>
                <td className="px-2 py-1">50</td>
                <td className="px-2 py-1">ESPECES</td>
                <td className="px-2 py-1"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <p>• <strong>consommation</strong> OU <strong>paiement</strong> : remplir l'un ou l'autre (pas les deux)</p>
          <p>• <strong>moyen_paiement</strong> : ESPECES, CB, VIREMENT, CHEQUE ou MOBILE_MONEY</p>
          <p>• Les clients non trouvés seront créés automatiquement avec le PIN <strong>0000</strong></p>
          <p>• Les établissements non trouvés seront créés automatiquement</p>
        </div>
        <button
          onClick={async () => {
            const { data } = await api.get('/import/template', { responseType: 'blob' })
            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = 'template_import.xlsx'
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="btn-secondary text-sm"
        >
          <Download size={14} className="inline mr-1.5" />Télécharger le template Excel
        </button>
      </div>

      {/* Formulaire import */}
      <form onSubmit={handleImport} className="card space-y-4">
        <h2 className="font-semibold">Importer un fichier</h2>
        <div>
          <label className="label">Fichier Excel (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx"
            className="input"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading || !file}>
          {loading ? 'Import en cours...' : 'Lancer l\'import'}
        </button>
      </form>

      {/* Résultat */}
      {result && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Résultat de l'import</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
              <p className="text-xs text-gray-500">Lignes importées</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{result.clientsCreated}</p>
              <p className="text-xs text-gray-500">Nouveaux clients</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{result.errors?.length || 0}</p>
              <p className="text-xs text-gray-500">Erreurs</p>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-600 mb-2">Lignes en erreur :</p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs bg-red-50 border border-red-100 rounded px-3 py-1 text-red-700">
                    Ligne {e.ligne} : {e.erreur}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
