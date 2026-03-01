import { useEffect, useState } from 'react'
import ClientLayout from '../../components/ClientLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'

// Retourne uniquement les transactions qui composent le solde actuel
// (tout ce qui s'est passé depuis la dernière fois que le solde était à 0)
function getOpenTransactions(transactions) {
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
  let balance = 0
  let lastZeroIndex = -1
  sorted.forEach((t, i) => {
    if (t.type === 'CONSOMMATION') balance += t.consommation || 0
    else balance -= t.paiement || 0
    if (balance <= 0) lastZeroIndex = i
  })
  return lastZeroIndex === -1 ? sorted : sorted.slice(lastZeroIndex + 1)
}

export default function ClientDashboard() {
  const { clientData } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoModal, setPhotoModal] = useState(null)
  const [disputeModal, setDisputeModal] = useState(null)
  const [disputeNote, setDisputeNote] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [showRecapRequest, setShowRecapRequest] = useState(false)

  useEffect(() => {
    api.get('/transactions/me').then((r) => setTransactions(r.data)).finally(() => setLoading(false))
  }, [])

  const totalConso = transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
  const totalPaid = transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
  const solde = Math.max(0, totalConso - totalPaid)

  const openTransactions = getOpenTransactions(transactions)
  const openConso = openTransactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
  const openPaid = openTransactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)

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

        {loading ? (
          <p className="text-gray-500 text-center py-12">Chargement...</p>
        ) : solde === 0 ? (

          /* ── CAS 1 : Solde à zéro ── */
          <div className="space-y-4">
            <div className="rounded-2xl p-6 text-center bg-emerald-900/30 border border-emerald-700">
              <p className="text-4xl mb-2">✓</p>
              <p className="text-emerald-400 font-semibold text-lg">Votre compte est à jour</p>
              <p className="text-gray-400 text-sm mt-1">Aucune dette en cours</p>
              <div className="mt-3">
                <StatusBadge status={clientData?.status || 'SOLDE'} />
              </div>
            </div>

            <button
              onClick={() => setShowRecapRequest(true)}
              className="btn-secondary w-full"
            >
              📋 Demander un récapitulatif
            </button>
          </div>

        ) : (

          /* ── CAS 2 : Solde positif ── */
          <div className="space-y-5">

            {/* Solde principal */}
            <div className="rounded-2xl p-5 text-center bg-red-900/30 border border-red-700">
              <p className="text-sm text-gray-400">Solde dû</p>
              <p className="text-4xl font-bold mt-1 text-red-300">{fmt(solde)}</p>
              <div className="mt-2">
                <StatusBadge status={clientData?.status || 'EN_COURS'} />
              </div>
            </div>

            {/* Transactions en cours */}
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Transactions en cours</p>
              <div className="space-y-0">
                {openTransactions.map((t, i) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-3 py-3 ${i < openTransactions.length - 1 ? 'border-b border-gray-700/50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-xs ${t.type === 'CONSOMMATION' ? 'badge-blue' : 'badge-green'}`}>
                          {t.type === 'CONSOMMATION' ? 'Conso' : 'Paiement'}
                        </span>
                        <span className="text-xs text-gray-500">{fmtDate(t.date)}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1 truncate">{t.establishment?.name}</p>
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
                      {t.type === 'CONSOMMATION' ? (
                        <p className="text-indigo-300 font-semibold">{fmt(t.consommation)}</p>
                      ) : (
                        <p className="text-emerald-400 font-semibold">− {fmt(t.paiement)}</p>
                      )}
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
                        {t.type === 'CONSOMMATION' && !t.disputed && (
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

                {/* Récapitulatif */}
                <div className="pt-3 border-t border-gray-600 space-y-1 mt-1">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Consommations</span>
                    <span>{fmt(openConso)}</span>
                  </div>
                  {openPaid > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Paiements reçus</span>
                      <span>− {fmt(openPaid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-700">
                    <span className="text-gray-200">Solde dû</span>
                    <span className="text-red-300">{fmt(solde)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Modal demande récapitulatif */}
      {showRecapRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center p-4 z-50">
          <div className="card w-full max-w-sm">
            <h2 className="font-semibold mb-2">Demander un récapitulatif</h2>
            <p className="text-sm text-gray-400 mb-4">
              Pour obtenir le détail de vos transactions, contactez directement la comptabilité de l'établissement.
            </p>
            <button className="btn-secondary w-full" onClick={() => setShowRecapRequest(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}

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
            <h2 className="font-semibold mb-3">Contester cette transaction</h2>
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
