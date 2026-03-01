import { useEffect, useState } from 'react'
import ClientLayout from '../../components/ClientLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'

export default function ClientDashboard() {
  const { clientData } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoModal, setPhotoModal] = useState(null)
  const [disputeModal, setDisputeModal] = useState(null)
  const [disputeNote, setDisputeNote] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)

  useEffect(() => {
    api.get('/transactions/me').then((r) => setTransactions(r.data)).finally(() => setLoading(false))
  }, [])

  const consommations = transactions.filter((t) => t.type === 'CONSOMMATION')
  const totalConso = consommations.reduce((s, t) => s + (t.consommation || 0), 0)
  const totalPaid = transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
  const solde = Math.max(0, totalConso - totalPaid)

  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA' }
  function fmtDate(d) { return new Date(d).toLocaleDateString('fr-FR') }

  async function handleDispute(e) {
    e.preventDefault()
    setDisputeLoading(true)
    try {
      await api.post(`/transactions/${disputeModal}/dispute`, { disputeNote })
      setTransactions((txs) =>
        txs.map((t) => t.id === disputeModal ? { ...t, disputed: true, disputeStatus: 'OUVERTE' } : t)
      )
      setDisputeModal(null)
      setDisputeNote('')
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    } finally {
      setDisputeLoading(false)
    }
  }

  return (
    <ClientLayout>
      <div className="space-y-5">

        {/* Greeting */}
        <div>
          <p className="text-gray-400 text-sm">Bonjour,</p>
          <h1 className="text-xl font-bold">{clientData?.firstName} {clientData?.lastName}</h1>
        </div>

        {/* Solde principal */}
        <div className={`rounded-2xl p-5 text-center ${solde > 0 ? 'bg-red-900/30 border border-red-700' : 'bg-emerald-900/30 border border-emerald-700'}`}>
          <p className="text-sm text-gray-400">Solde dû</p>
          <p className={`text-4xl font-bold mt-1 ${solde > 0 ? 'text-red-300' : 'text-emerald-400'}`}>
            {fmt(solde)}
          </p>
          <div className="mt-2">
            <StatusBadge status={clientData?.status || (solde === 0 ? 'SOLDE' : 'EN_COURS')} />
          </div>
        </div>

        {/* Liste des consommations */}
        {loading ? (
          <p className="text-gray-500 text-center py-8">Chargement...</p>
        ) : consommations.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-emerald-400 text-lg">✓</p>
            <p className="text-gray-300 mt-1">Aucune dette en cours</p>
          </div>
        ) : (
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Détail des consommations</p>
            <div className="space-y-0">
              {consommations.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between gap-3 py-3 ${i < consommations.length - 1 ? 'border-b border-gray-700/50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{t.establishment?.name}</p>
                    <p className="text-xs text-gray-500">{fmtDate(t.date)}</p>
                    {t.ticketRef && (
                      <p className="text-xs text-gray-600">Réf : {t.ticketRef}</p>
                    )}
                    {t.disputed && (
                      <span className={`text-xs ${t.disputeStatus === 'RESOLUE' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {t.disputeStatus === 'RESOLUE' ? '✓ Contestation résolue' : '⚠️ En cours de contestation'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="text-indigo-300 font-semibold">{fmt(t.consommation)}</p>
                    <div className="flex gap-2 items-center">
                      {t.ticketPhotoUrl && (
                        <button
                          onClick={() => setPhotoModal(t.ticketPhotoUrl)}
                          className="text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
                          title="Voir le ticket"
                        >
                          📷
                        </button>
                      )}
                      {!t.disputed && (
                        <button
                          onClick={() => setDisputeModal(t.id)}
                          className="text-xs text-yellow-500 hover:text-yellow-300 transition-colors"
                          title="Contester"
                        >
                          ⚠️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Ligne déduction paiements */}
              {totalPaid > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                  <p className="text-sm text-emerald-400">Paiements reçus</p>
                  <p className="text-sm text-emerald-400 font-semibold">− {fmt(totalPaid)}</p>
                </div>
              )}

              {/* Solde final */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-600 mt-1">
                <p className="font-semibold text-gray-200">Solde restant dû</p>
                <p className={`font-bold text-lg ${solde > 0 ? 'text-red-300' : 'text-emerald-400'}`}>
                  {fmt(solde)}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal photo ticket */}
      {photoModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPhotoModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-10 right-0 text-white text-2xl leading-none"
              onClick={() => setPhotoModal(null)}
            >
              ✕
            </button>
            <img
              src={photoModal}
              alt="Photo du ticket"
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Modal contestation */}
      {disputeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center p-4 z-50">
          <div className="card w-full max-w-sm">
            <h2 className="font-semibold mb-3">Contester cette consommation</h2>
            <form onSubmit={handleDispute} className="space-y-3">
              <div>
                <label className="label">Motif de la contestation</label>
                <textarea
                  className="input"
                  rows={3}
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  placeholder="Expliquez pourquoi vous contestez..."
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={disputeLoading}>
                  {disputeLoading ? 'Envoi...' : 'Envoyer'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setDisputeModal(null); setDisputeNote('') }}
                >
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
