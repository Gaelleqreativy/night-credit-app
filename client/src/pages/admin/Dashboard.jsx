import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'

function StatCard({ label, value, sub, color = 'indigo', link }) {
  const colorMap = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  }
  const card = (
    <div className="card hover:border-night-700 transition-colors">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
  return link ? <Link to={link}>{card}</Link> : card
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/stats?year=${year}`)
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false))
  }, [year])

  function fmt(n) {
    return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA'
  }

  if (loading) return <div className="text-gray-500 text-center py-20">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <select
          className="input w-auto text-sm"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {[2025, 2024, 2023, 2022].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
          <option value="">Toutes années</option>
        </select>
      </div>

      {/* Alertes */}
      {stats?.contestationsOuvertes > 0 && (
        <Link to="/admin/disputes" className="block">
          <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{stats.contestationsOuvertes} contestation(s) ouverte(s) en attente de traitement</span>
          </div>
        </Link>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total dû" value={fmt(stats?.totalDu)} color="red" />
        <StatCard label="Total consommations" value={fmt(stats?.totalConso)} color="indigo" />
        <StatCard label="Total encaissé" value={fmt(stats?.totalPaiement)} color="emerald" />
        <StatCard label="Clients actifs" value={stats?.clientsActifs || 0} sub="avec solde > 0" color="yellow" link="/admin/clients" />
      </div>

      {/* Par établissement */}
      <div className="card">
        <h2 className="font-semibold mb-4">Par établissement</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-night-800">
                <th className="text-left py-2">Établissement</th>
                <th className="text-right py-2">Consommations</th>
                <th className="text-right py-2">Paiements</th>
                <th className="text-right py-2">Solde dû</th>
              </tr>
            </thead>
            <tbody>
              {stats?.byEstablishment?.map((e) => (
                <tr key={e.id} className="border-b border-night-800/50 hover:bg-night-800/30">
                  <td className="py-2 font-medium">{e.name}</td>
                  <td className="py-2 text-right text-indigo-300">{fmt(e.totalConso)}</td>
                  <td className="py-2 text-right text-emerald-300">{fmt(e.totalPaiement)}</td>
                  <td className="py-2 text-right text-red-300 font-semibold">{fmt(e.solde)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top débiteurs */}
      <div className="card">
        <h2 className="font-semibold mb-4">Top débiteurs</h2>
        <div className="space-y-2">
          {stats?.top10?.slice(0, 5).map((c, i) => (
            <Link key={c.id} to={`/admin/clients/${c.id}`}>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-night-800 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm w-5">{i + 1}</span>
                  <span>{c.lastName} {c.firstName}</span>
                </div>
                <span className="text-red-400 font-semibold">{fmt(c.solde)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
