import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ClientLayout from '../../components/ClientLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import StatusBadge from '../../components/StatusBadge'

export default function ClientDashboard() {
  const { clientData } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/transactions/me').then((r) => setTransactions(r.data)).finally(() => setLoading(false))
  }, [])

  const totalConso = transactions.filter((t) => t.type === 'CONSOMMATION').reduce((s, t) => s + (t.consommation || 0), 0)
  const totalPaid = transactions.filter((t) => t.type === 'PAIEMENT').reduce((s, t) => s + (t.paiement || 0), 0)
  const solde = Math.max(0, totalConso - totalPaid)

  // Résumé par établissement
  const byEtab = {}
  transactions.forEach((t) => {
    const name = t.establishment?.name
    if (!byEtab[name]) byEtab[name] = { conso: 0, paid: 0 }
    if (t.type === 'CONSOMMATION') byEtab[name].conso += t.consommation || 0
    if (t.type === 'PAIEMENT') byEtab[name].paid += t.paiement || 0
  })

  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA' }

  const lastTx = transactions[0]

  return (
    <ClientLayout>
      <div className="space-y-5">
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

        {/* Stats rapides */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-xs text-gray-500">Total consommé</p>
            <p className="text-lg font-semibold text-indigo-300 mt-1">{fmt(totalConso)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500">Total payé</p>
            <p className="text-lg font-semibold text-emerald-300 mt-1">{fmt(totalPaid)}</p>
          </div>
        </div>

        {/* Dernière transaction */}
        {lastTx && (
          <div className="card">
            <p className="text-xs text-gray-500 mb-2">Dernière transaction</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{lastTx.establishment?.name}</p>
                <p className="text-xs text-gray-500">{new Date(lastTx.date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right">
                {lastTx.type === 'CONSOMMATION' ? (
                  <p className="text-indigo-300 font-semibold">{fmt(lastTx.consommation)}</p>
                ) : (
                  <p className="text-emerald-300 font-semibold">-{fmt(lastTx.paiement)}</p>
                )}
                <p className="text-xs text-gray-500">{lastTx.type === 'CONSOMMATION' ? 'Consommation' : 'Paiement'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Par établissement */}
        {Object.keys(byEtab).length > 0 && (
          <div className="card">
            <p className="text-xs text-gray-500 mb-3">Par établissement</p>
            <div className="space-y-2">
              {Object.entries(byEtab).map(([name, d]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{name}</span>
                  <span className={d.conso - d.paid > 0 ? 'text-red-300' : 'text-emerald-400'}>
                    {fmt(Math.max(0, d.conso - d.paid))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link to="/client/transactions" className="btn-secondary w-full text-center block">
          Voir toutes mes transactions →
        </Link>
      </div>
    </ClientLayout>
  )
}
