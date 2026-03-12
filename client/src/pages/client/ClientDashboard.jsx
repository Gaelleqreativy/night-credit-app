import { useEffect, useState } from 'react'
import ClientLayout from '../../components/ClientLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'
import { CheckCircle2, ClipboardList, CheckCircle, XCircle, Clock, Camera, AlertTriangle, X } from 'lucide-react'

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
  const [recapSent, setRecapSent] = useState(false)
  const [recapLoading, setRecapLoading] = useState(false)
  const [recapError, setRecapError] = useState('')

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
          <p className="text-gray-500 text-sm">Bonjour,</p>
          <h1 className="text-xl font-bold">{clientData?.firstName} {clientData?.lastName}</h1>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-12">Chargement...</p>
        ) : solde === 0 ? (

          /* ── CAS 1 : Solde à zéro ── */
          <div className="space-y-4">
            <div className="rounded-2xl p-6 text-center bg-emerald-50 border border-emerald-200">
              <div className="flex justify-center mb-2"><CheckCircle2 size={40} className="text-emerald-600" /></div>
              <p className="text-emerald-700 font-semibold text-lg">Votre compte est à jour</p>
              <p className="text-gray-500 text-sm mt-1">Aucune dette en cours</p>
              <div className="mt-3">
                <StatusBadge status={clientData?.status || 'SOLDE'} />
              </div>
            </div>

            <button
              onClick={() => setShowRecapRequest(true)}
              className="btn-secondary w-full"
            >
              <ClipboardList size={15} className="inline mr-1.5" />Demander un récapitulatif
            </button>
          </div>

        ) : (

          /* ── CAS 2 : Solde positif ── */
          <div className="space-y-5">

            {/* Solde principal */}
            <div className="rounded-2xl p-5 text-center bg-red-50 border border-red-200">
              <p className="text-sm text-gray-500">Solde dû</p>
              <p className="text-4xl font-bold mt-1 text-red-600">{fmt(solde)}</p>
              <div className="mt-2">
                <StatusBadge status={clientData?.status || 'EN_COURS'} />
              </div>
            </div>

            {/* Transactions en cours */}
            <div className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Transactions en cours</p>
              <div className="space-y-0">
                {openTransactions.map((t, i) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-3 py-3 ${i < openTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-xs ${t.type === 'CONSOMMATION' ? 'badge-blue' : 'badge-green'}`}>
                          {t.type === 'CONSOMMATION' ? 'Conso' : 'Paiement'}
                        </span>
                        <span className="text-xs text-gray-500">{fmtDate(t.date)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">{t.establishment?.name}</p>
                      {t.ticketRef && (
                        <p className="text-xs text-gray-400">Réf : {t.ticketRef}</p>
                      )}
                      {t.disputed && (
                        <div className="mt-1">
                          {t.disputeStatus === 'ACCEPTEE' ? (
                            <div>
                              <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle size={12} /> Contestation acceptée</span>
                              {t.resolveNote && <p className="text-xs text-gray-500 mt-0.5">{t.resolveNote}</p>}
                            </div>
                          ) : t.disputeStatus === 'REJETEE' ? (
                            <div>
                              <span className="text-xs text-red-600 flex items-center gap-1"><XCircle size={12} /> Contestation rejetée</span>
                              {t.resolveNote && <p className="text-xs text-gray-500 mt-0.5">{t.resolveNote}</p>}
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 flex items-center gap-1"><Clock size={12} /> En cours de traitement</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {t.type === 'CONSOMMATION' ? (
                        <p className="text-blue-600 font-semibold">{fmt(t.consommation)}</p>
                      ) : (
                        <p className="text-emerald-600 font-semibold">− {fmt(t.paiement)}</p>
                      )}
                      <div className="flex gap-2 items-center">
                        {t.ticketPhotoUrl && (
                          <button
                            onClick={() => setPhotoModal(t.ticketPhotoUrl)}
                            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                            title="Voir le ticket"
                          >
                            <Camera size={14} />
                          </button>
                        )}
                        {t.type === 'CONSOMMATION' && !t.disputed && (
                          <button
                            onClick={() => setDisputeModal(t.id)}
                            className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
                            title="Contester"
                          >
                            <AlertTriangle size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Récapitulatif */}
                <div className="pt-3 border-t border-gray-200 space-y-1 mt-1">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Consommations</span>
                    <span>{fmt(openConso)}</span>
                  </div>
                  {openPaid > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Paiements reçus</span>
                      <span>− {fmt(openPaid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
                    <span className="text-gray-900">Solde dû</span>
                    <span className="text-red-600">{fmt(solde)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Modal demande récapitulatif */}
      {showRecapRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center p-4 z-50">
          <div className="card w-full max-w-sm">
            <h2 className="font-semibold mb-1">Demander un récapitulatif</h2>
            <p className="text-sm text-gray-500 mb-4">
              Vous pouvez contacter la comptabilité directement sur WhatsApp ou envoyer une demande depuis l'application.
            </p>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/22896438383?text=${encodeURIComponent(`Bonjour, je suis ${clientData?.firstName} ${clientData?.lastName} (${clientData?.phone}). Je souhaite obtenir un récapitulatif de mon compte SpiritTab. Merci.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full flex items-center justify-center gap-2 mb-2 bg-green-600 hover:bg-green-700 border-green-600"
              onClick={() => setShowRecapRequest(false)}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Contacter sur WhatsApp
            </a>

            {/* Demande in-app */}
            {recapSent ? (
              <p className="text-center text-sm text-green-600 font-medium py-2">Demande envoyée ✓</p>
            ) : (
              <>
                {recapError && <p className="text-xs text-red-500 mb-2">{recapError}</p>}
                <button
                  className="btn-secondary w-full mb-2"
                  disabled={recapLoading}
                  onClick={async () => {
                    setRecapLoading(true)
                    setRecapError('')
                    try {
                      await api.post('/notifications/recap-request')
                      setRecapSent(true)
                    } catch (err) {
                      setRecapError(err.response?.data?.error || 'Erreur lors de l\'envoi')
                    } finally {
                      setRecapLoading(false)
                    }
                  }}
                >
                  {recapLoading ? 'Envoi...' : 'Envoyer une demande à la comptabilité'}
                </button>
              </>
            )}

            <button className="text-sm text-gray-400 w-full text-center py-1" onClick={() => { setShowRecapRequest(false); setRecapSent(false); setRecapError('') }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal photo ticket */}
      {photoModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPhotoModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute -top-10 right-0 text-white text-2xl leading-none"
              onClick={() => setPhotoModal(null)}
            >
              <X size={18} />
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
