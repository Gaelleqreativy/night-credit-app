import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, History, KeyRound, Moon } from 'lucide-react'

export default function ClientLayout({ children }) {
  const { clientData, logoutClient } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logoutClient()
    navigate('/client/login')
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <header className="bg-white border-b border-gray-100 shadow-sm px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-blue-600" />
            <div>
              <p className="font-semibold text-sm leading-tight text-gray-900">{clientData?.firstName} {clientData?.lastName}</p>
              <p className="text-xs text-gray-500 leading-tight">{clientData?.phone}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg border border-gray-200 hover:border-red-200"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-100 px-4 flex gap-1">
        {[
          { to: '/client/dashboard', label: 'Accueil', Icon: Home },
          { to: '/client/transactions', label: 'Historique', Icon: History },
          { to: '/client/pin', label: 'Mon PIN', Icon: KeyRound },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`
            }
          >
            <item.Icon size={13} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 p-4 pb-8">{children}</main>
    </div>
  )
}
