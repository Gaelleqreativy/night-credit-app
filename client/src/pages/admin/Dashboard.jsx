import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { SkeletonStat } from '../../components/Skeleton'
import { useAuth } from '../../context/AuthContext'
import PeriodPicker from '../../components/PeriodPicker'
import { AlertTriangle, ArrowRight, Banknote, CreditCard, UtensilsCrossed, Users } from 'lucide-react'

function StatCard({ label, value, sub, color = 'indigo', link, icon }) {
  const colorMap = {
    indigo: 'text-blue-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    yellow: 'text-amber-600',
  }
  const card = (
    <div className="card hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        {icon && <span className="opacity-30 group-hover:opacity-60 transition-opacity">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold mt-2 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
  return link ? <Link to={link}>{card}</Link> : card
}

// ── Vue MANAGER ───────────────────────────────────────────────────────────────
function ManagerDashboard({ stats, loading, periodParams, setPeriodParams }) {
  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA' }

  const establishments = stats?.byEstablishment || []
  const totalDu = establishments.reduce((s, e) => s + (e.solde || 0), 0)
  const totalConso = establishments.reduce((s, e) => s + (e.totalConso || 0), 0)
  const totalPaiement = establishments.reduce((s, e) => s + (e.totalPaiement || 0), 0)
  const maxConso = establishments.length ? Math.max(...establishments.map((e) => e.totalConso || 0), 1) : 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mes établissements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue lecture seule</p>
        </div>
        <PeriodPicker onChange={setPeriodParams} />
      </div>

      {/* KPI */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Solde total dû" value={fmt(totalDu)} color="red" icon={<Banknote size={18} />} />
          <StatCard label="Consommations" value={fmt(totalConso)} color="indigo" icon={<UtensilsCrossed size={18} />} />
          <StatCard label="Encaissé" value={fmt(totalPaiement)} color="emerald" icon={<CreditCard size={18} />} />
        </div>
      )}

      {/* Carte par établissement */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>
      ) : establishments.length === 0 ? (
        <div className="card text-center py-10 text-gray-500">Aucune donnée pour cette période</div>
      ) : (
        <div className="space-y-4">
          {establishments.map((e) => {
            const pct = maxConso > 0 ? Math.min(100, ((e.totalConso || 0) / maxConso) * 100) : 0
            const taux = e.totalConso > 0 ? Math.round(((e.totalPaiement || 0) / e.totalConso) * 100) : 0
            return (
              <div key={e.id} className="card space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">{e.name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Taux de recouvrement : {taux}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">{fmt(e.solde)}</p>
                    <p className="text-xs text-gray-500">solde dû</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Consommations</span>
                    <span>{fmt(e.totalConso)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Encaissé</p>
                    <p className="text-emerald-600 font-semibold mt-0.5">{fmt(e.totalPaiement)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Non réglé</p>
                    <p className="text-red-600 font-semibold mt-0.5">{fmt(e.solde)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Vue ADMIN / COMPTABLE ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { adminUser } = useAuth()
  const isManager = adminUser?.role === 'MANAGER'
  const [stats, setStats] = useState(null)
  const [periodParams, setPeriodParams] = useState({})
  const [establishmentId, setEstablishmentId] = useState('')
  const [establishments, setEstablishments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isManager) api.get('/establishments').then((r) => setEstablishments(r.data))
  }, [isManager])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (periodParams.year) params.set('year', periodParams.year)
    if (periodParams.dateFrom) params.set('dateFrom', periodParams.dateFrom)
    if (periodParams.dateTo) params.set('dateTo', periodParams.dateTo)
    if (!isManager && establishmentId) params.set('establishmentId', establishmentId)
    api.get(`/stats?${params}`)
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false))
  }, [periodParams, establishmentId, isManager])

  if (isManager) {
    return <ManagerDashboard stats={stats} loading={loading} periodParams={periodParams} setPeriodParams={setPeriodParams} />
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA'
  }

  const maxConso = stats?.byEstablishment?.length
    ? Math.max(...stats.byEstablishment.map((e) => e.totalConso || 0), 1)
    : 1

  return (
    <div className="space-y-6">

      {/* En-tête + filtres */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <PeriodPicker onChange={setPeriodParams} />
          {establishments.length > 0 && (
            <select
              className="input w-auto text-sm"
              value={establishmentId}
              onChange={(e) => setEstablishmentId(e.target.value)}
            >
              <option value="">Tous les établissements</option>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Alerte contestations */}
      {stats?.contestationsOuvertes > 0 && (
        <Link to="/admin/disputes" className="block">
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-700 text-sm flex items-center gap-2 hover:bg-red-100 transition-colors">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{stats.contestationsOuvertes} contestation(s) ouverte(s) en attente de traitement</span>
            <span className="ml-auto flex items-center gap-1 text-xs underline">Voir <ArrowRight size={12} /></span>
          </div>
        </Link>
      )}

      {/* KPI */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total dû" value={fmt(stats?.totalDu)} color="red" icon={<Banknote size={18} />} />
          <StatCard label="Total consommations" value={fmt(stats?.totalConso)} color="indigo" icon={<UtensilsCrossed size={18} />} />
          <StatCard label="Total encaissé" value={fmt(stats?.totalPaiement)} color="emerald" icon={<CreditCard size={18} />} />
          <StatCard label="Clients actifs" value={stats?.clientsActifs || 0} sub="avec solde > 0" color="yellow" icon={<Users size={18} />} link="/admin/clients" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Par établissement */}
        <div className="card">
          <h2 className="font-semibold mb-4">Par établissement</h2>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1 animate-pulse">
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-2 bg-gray-100 rounded" style={{ width: `${60 - i * 15}%` }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {stats?.byEstablishment?.map((e) => (
                <div key={e.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{e.name}</span>
                    <span className="text-red-600 font-semibold">{fmt(e.solde)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((e.totalConso || 0) / maxConso) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Conso : {fmt(e.totalConso)}</span>
                    <span>Encaissé : {fmt(e.totalPaiement)}</span>
                  </div>
                </div>
              ))}
              {!stats?.byEstablishment?.length && (
                <p className="text-gray-500 text-sm text-center py-4">Aucune donnée</p>
              )}
            </div>
          )}
        </div>

        {/* Top débiteurs */}
        <div className="card">
          <h2 className="font-semibold mb-4">Top débiteurs</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-3 bg-gray-100 rounded" />
                  <div className="flex-1 h-4 bg-gray-100 rounded" />
                  <div className="w-24 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {stats?.top10?.slice(0, 5).map((c, i) => (
                <Link key={c.id} to={`/admin/clients/${c.id}`}>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {i + 1}
                      </span>
                      <span className="group-hover:text-gray-900 transition-colors text-gray-700">{c.lastName} {c.firstName}</span>
                    </div>
                    <span className="text-red-600 font-semibold">{fmt(c.solde)}</span>
                  </div>
                </Link>
              ))}
              {!stats?.top10?.length && (
                <p className="text-gray-500 text-sm text-center py-4">Aucun débiteur</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
