import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  LayoutDashboard, Users, UtensilsCrossed, CreditCard, TrendingUp,
  Upload, AlertTriangle, KeyRound, ClipboardList, Bell, Moon, LogOut, Menu, X, Building2,
} from 'lucide-react'

const navItems = [
  { to: '/admin/dashboard', label: 'Tableau de bord', Icon: LayoutDashboard },
  { to: '/admin/clients', label: 'Clients', Icon: Users },
  { to: '/admin/consommation', label: 'Ajouter conso', Icon: UtensilsCrossed },
  { to: '/admin/paiement', label: 'Enregistrer paiement', Icon: CreditCard },
  { to: '/admin/stats', label: 'Statistiques', Icon: TrendingUp },
  { to: '/admin/import', label: 'Import Excel', Icon: Upload },
  { to: '/admin/disputes', label: 'Contestations', Icon: AlertTriangle },
]

const managerItems = [
  { to: '/admin/dashboard', label: 'Tableau de bord', Icon: LayoutDashboard },
  { to: '/admin/clients', label: 'Clients', Icon: Users },
  { to: '/admin/stats', label: 'Statistiques', Icon: TrendingUp },
  { to: '/admin/disputes', label: 'Contestations', Icon: AlertTriangle },
]

const adminOnlyItems = [
  { to: '/admin/establishments', label: 'Établissements', Icon: Building2 },
  { to: '/admin/users', label: 'Utilisateurs', Icon: KeyRound },
  { to: '/admin/audit', label: 'Journal audit', Icon: ClipboardList },
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
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {count > 0 && <span className="badge badge-red text-xs">{count}</span>}
          </div>

          {count === 0 ? (
            <p className="text-center py-6 text-gray-500 text-sm">Aucune alerte en cours</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {notifs.map((n, i) => (
                <li
                  key={i}
                  onClick={() => handleItemClick(n)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {n.type === 'DISPUTE' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className="text-amber-600" />
                        <span className="text-amber-600 text-xs font-medium">Contestation</span>
                        <span className="text-gray-500 text-xs">{n.establishment}</span>
                      </div>
                      <p className="text-sm font-medium mt-0.5 text-gray-900">{n.clientName}</p>
                      {n.note && <p className="text-xs text-gray-500 truncate mt-0.5">{n.note}</p>}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className="text-red-600" />
                        <span className="text-red-600 text-xs font-medium">Plafond dépassé</span>
                      </div>
                      <p className="text-sm font-medium mt-0.5 text-gray-900">{n.clientName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogout() {
    logoutAdmin()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon size={18} className="text-blue-600" />
              <h1 className="text-lg font-bold text-blue-600">SpiritTab</h1>
            </div>
            <div className="flex items-center gap-1">
              <span className="hidden lg:block"><NotificationBell /></span>
              <button
                className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{adminUser?.name}</p>
          <span className={`badge mt-1 ${adminUser?.role === 'ADMIN' ? 'badge-red' : adminUser?.role === 'MANAGER' ? 'badge-purple' : 'badge-blue'}`}>
            {adminUser?.role}
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {(adminUser?.role === 'MANAGER' ? managerItems : navItems).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.Icon size={16} />
              {item.label}
            </NavLink>
          ))}

          {adminUser?.role === 'ADMIN' && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider px-3">Administration</p>
              </div>
              {adminOnlyItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <item.Icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button onClick={handleLogout} className="btn-danger w-full text-sm flex items-center justify-center gap-2">
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Barre mobile (hamburger + logo + cloche) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Moon size={16} className="text-blue-600" />
            <span className="font-bold text-blue-600 text-sm">SpiritTab</span>
          </div>
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
