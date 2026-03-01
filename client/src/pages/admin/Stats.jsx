import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../api/axios'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const MOYEN_LABELS = {
  ESPECES: 'Espèces', CB: 'Carte bancaire', VIREMENT: 'Virement', CHEQUE: 'Chèque', MOBILE_MONEY: 'Mobile Money'
}

export default function StatsPage() {
  const [stats, setStats] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/stats?year=${year}`).then((r) => setStats(r.data)).finally(() => setLoading(false))
  }, [year])

  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') }

  const pieData = stats
    ? Object.entries(stats.moyensPaiement || {}).map(([k, v]) => ({ name: MOYEN_LABELS[k] || k, value: v }))
    : []

  const currentYear = new Date().getFullYear()

  if (loading) return <div className="text-gray-500 text-center py-20">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <div className="flex gap-2">
          <select className="input w-auto text-sm" value={year} onChange={(e) => setYear(e.target.value)}>
            {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={() => window.open(`/api/export/global?format=xlsx&year=${year}`, '_blank')} className="btn-secondary text-sm">
            ⬇️ Export global Excel
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total consommé', value: fmt(stats?.totalConso) + ' FCFA', color: 'text-indigo-400' },
          { label: 'Total encaissé', value: fmt(stats?.totalPaiement) + ' FCFA', color: 'text-emerald-400' },
          { label: 'Solde total dû', value: fmt(stats?.totalDu) + ' FCFA', color: 'text-red-400' },
          { label: 'Clients actifs', value: stats?.clientsActifs, color: 'text-yellow-400' },
        ].map((k) => (
          <div key={k.label} className="card">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Évolution mensuelle */}
      <div className="card">
        <h2 className="font-semibold mb-4">Évolution mensuelle {year}</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={stats?.monthly || []}>
            <XAxis dataKey="label" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={(v) => fmt(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #4338ca', borderRadius: 8 }}
              formatter={(v, n) => [fmt(v) + ' FCFA', n === 'conso' ? 'Consommations' : 'Paiements']}
            />
            <Bar dataKey="conso" fill="#6366f1" radius={[4, 4, 0, 0]} name="conso" />
            <Bar dataKey="paiement" fill="#10b981" radius={[4, 4, 0, 0]} name="paiement" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top débiteurs */}
        <div className="card">
          <h2 className="font-semibold mb-4">Top 10 débiteurs</h2>
          <div className="space-y-2">
            {(stats?.top10 || []).map((c, i) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                  <span className="text-sm">{c.lastName} {c.firstName}</span>
                </div>
                <span className="text-red-400 text-sm font-semibold">{fmt(c.solde)} FCFA</span>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition paiements */}
        <div className="card">
          <h2 className="font-semibold mb-4">Répartition paiements</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [fmt(v) + ' FCFA']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Aucun paiement enregistré</p>
          )}
        </div>
      </div>
    </div>
  )
}
