import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
          <h1 className="text-lg font-bold text-indigo-400">🌙 Night Credit</h1>
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
