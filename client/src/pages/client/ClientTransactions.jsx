import { useEffect, useState } from 'react'
import ClientLayout from '../../components/ClientLayout'
import { Camera, AlertTriangle } from 'lucide-react'
import Filters from '../../components/Filters'
import api from '../../api/axios'

export default function ClientTransactions() {
  const [transactions, setTransactions] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [establishmentId, setEstablishmentId] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [disputeModal, setDisputeModal] = useState(null)
  const [disputeNote, setDisputeNote] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)

  useEffect(() => {
    // Récupérer les établissements visités
    api.get('/transactions/me').then((r) => {
      const etabs = [...new Map(r.data.map((t) => [t.establishment.id, t.establishment])).values()]
      setEstablishments(etabs)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (year) params.set('year', year)
    if (establishmentId) params.set('establishmentId', establishmentId)
    if (type) params.set('type', type)
    api.get(`/transactions/me?${params}`)
      .then((r) => setTransactions(r.data))
      .finally(() => setLoading(false))
  }, [year, establishmentId, type])

  async function handleDispute(e) {
    e.preventDefault()
    setDisputeLoading(true)
    try {
      await api.post(`/transactions/${disputeModal}/dispute`, { disputeNote })
      setTransactions((txs) => txs.map((t) => t.id === disputeModal ? { ...t, disputed: true, disputeStatus: 'OUVERTE' } : t))
      setDisputeModal(null)
      setDisputeNote('')
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    } finally {
      setDisputeLoading(false)
    }
  }

  const totalConso = transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
  const totalPaid = transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)

  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA' }
  function fmtDate(d) { return new Date(d).toLocaleDateString('fr-FR') }

  return (
    <ClientLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Mes transactions</h1>

        <Filters
          year={year} setYear={setYear}
          establishmentId={establishmentId} setEstablishmentId={setEstablishmentId}
          establishments={establishments}
          type={type} setType={setType}
        />

        {/* Résumé période */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="card py-2">
            <p className="text-xs text-gray-500">Conso</p>
            <p className="font-semibold text-blue-600">{fmt(totalConso)}</p>
          </div>
          <div className="card py-2">
            <p className="text-xs text-gray-500">Payé</p>
            <p className="font-semibold text-emerald-600">{fmt(totalPaid)}</p>
          </div>
          <div className="card py-2">
            <p className="text-xs text-gray-500">Solde</p>
            <p className="font-semibold text-red-600">{fmt(Math.max(0, totalConso - totalPaid))}</p>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <p className="text-gray-500 text-center py-8">Chargement...</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune transaction pour cette période</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className={`card ${t.disputed ? 'border-amber-300' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge text-xs ${t.type === 'CONSOMMATION' ? 'badge-blue' : 'badge-green'}`}>
                        {t.type === 'CONSOMMATION' ? 'Conso' : 'Paiement'}
                      </span>
                      <span className="text-xs text-gray-500">{fmtDate(t.date)}</span>
                      {t.disputed && (
                        <span className={`badge text-xs ${t.disputeStatus === 'RESOLUE' ? 'badge-green' : 'badge-yellow'}`}>
                          {t.disputeStatus === 'RESOLUE' ? 'Contestation résolue' : 'Contesté'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{t.establishment?.name}</p>
                    {t.ticketRef && <p className="text-xs text-gray-500">Réf: {t.ticketRef}</p>}
                    {t.moyenPaiement && <p className="text-xs text-gray-500">{t.moyenPaiement}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {t.type === 'CONSOMMATION' ? (
                      <p className="text-blue-600 font-semibold">{fmt(t.consommation)}</p>
                    ) : (
                      <p className="text-emerald-600 font-semibold">-{fmt(t.paiement)}</p>
                    )}
                    <div className="flex gap-2 mt-1 justify-end items-center">
                      {t.ticketPhotoUrl && (
                        <a href={t.ticketPhotoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1">
                          <Camera size={13} />Ticket
                        </a>
                      )}
                      {!t.disputed && t.type === 'CONSOMMATION' && (
                        <button
                          onClick={() => setDisputeModal(t.id)}
                          className="text-xs text-amber-600 hover:text-amber-800"
                        >
                          <AlertTriangle size={13} className="inline mr-1" />Contester
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal contestation */}
      {disputeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center p-4 z-50">
          <div className="card w-full max-w-sm">
            <h2 className="font-semibold mb-3">Contester cette transaction</h2>
            <form onSubmit={handleDispute} className="space-y-3">
              <div>
                <label className="label">Motif de la contestation</label>
                <textarea
                  className="input"
                  rows={3}
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  placeholder="Expliquez pourquoi vous contestez cette transaction..."
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={disputeLoading}>
                  {disputeLoading ? 'Envoi...' : 'Envoyer'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setDisputeModal(null); setDisputeNote('') }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ClientLayout>
  )
}
