import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const navItems = [
  { to: '/admin/dashboard', label: 'Tableau de bord', icon: '📊' },
  { to: '/admin/clients', label: 'Clients', icon: '👥' },
  { to: '/admin/consommation', label: 'Ajouter conso', icon: '🍾' },
  { to: '/admin/paiement', label: 'Enregistrer paiement', icon: '💳' },
  { to: '/admin/stats', label: 'Statistiques', icon: '📈' },
  { to: '/admin/import', label: 'Import Excel', icon: '📥' },
  { to: '/admin/disputes', label: 'Contestations', icon: '⚠️' },
]

const managerItems = [
  { to: '/admin/dashboard', label: 'Tableau de bord', icon: '📊' },
  { to: '/admin/clients', label: 'Clients', icon: '👥' },
  { to: '/admin/stats', label: 'Statistiques', icon: '📈' },
  { to: '/admin/disputes', label: 'Contestations', icon: '⚠️' },
]

const adminOnlyItems = [
  { to: '/admin/users', label: 'Utilisateurs', icon: '🔑' },
  { to: '/admin/audit', label: 'Journal audit', icon: '📋' },
]

function NotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  function fetchNotifs() {
    api.get('/notifications').then((r) => setNotifs(r.data.notifications)).catch(() => {})
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleItemClick(notif) {
    setOpen(false)
    if (notif.type === 'DISPUTE') navigate('/admin/disputes')
    else navigate(`/admin/clients/${notif.clientId}`)
  }

  const count = notifs.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-night-800 transition-colors"
        title="Notifications"
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-night-900 border border-night-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-night-800 flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            {count > 0 && <span className="badge badge-red text-xs">{count}</span>}
          </div>

          {count === 0 ? (
            <p className="text-center py-6 text-gray-500 text-sm">Aucune alerte en cours</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-night-800/50">
              {notifs.map((n, i) => (
                <li
                  key={i}
                  onClick={() => handleItemClick(n)}
                  className="px-4 py-3 hover:bg-night-800/40 cursor-pointer transition-colors"
                >
                  {n.type === 'DISPUTE' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-xs">⚠️ Contestation</span>
                        <span className="text-gray-500 text-xs">{n.establishment}</span>
                      </div>
                      <p className="text-sm font-medium mt-0.5">{n.clientName}</p>
                      {n.note && <p className="text-xs text-gray-400 truncate mt-0.5">{n.note}</p>}
                    </div>
                  ) : (
                    <div>
                      <span className="text-red-400 text-xs">🚨 Plafond dépassé</span>
                      <p className="text-sm font-medium mt-0.5">{n.clientName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Number(n.solde).toLocaleString('fr-FR')} FCFA &nbsp;/&nbsp; plafond {Number(n.creditLimit).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminLayout() {
  const { adminUser, logoutAdmin } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logoutAdmin()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-night-900 border-r border-night-800 flex flex-col">
        <div className="p-4 border-b border-night-800">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-indigo-400">🌙 Night Credit</h1>
            <NotificationBell />
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{adminUser?.name}</p>
          <span className={`badge mt-1 ${adminUser?.role === 'ADMIN' ? 'badge-red' : adminUser?.role === 'MANAGER' ? 'badge-purple' : 'badge-blue'}`}>
            {adminUser?.role}
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {(adminUser?.role === 'MANAGER' ? managerItems : navItems).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-night-800 hover:text-gray-200'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {adminUser?.role === 'ADMIN' && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-xs text-gray-600 uppercase tracking-wider px-3">Administration</p>
              </div>
              {adminOnlyItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-night-800 hover:text-gray-200'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-night-800">
          <button onClick={handleLogout} className="btn-danger w-full text-sm">
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
