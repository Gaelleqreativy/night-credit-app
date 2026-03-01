import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ClientLayout({ children }) {
  const { clientData, logoutClient } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logoutClient()
    navigate('/client/login')
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <header className="bg-night-900 border-b border-night-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="text-indigo-400 font-bold text-lg">🌙</span>
          <span className="ml-2 font-semibold">{clientData?.firstName} {clientData?.lastName}</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-400">Déco</button>
      </header>

      <nav className="bg-night-900 border-b border-night-800 px-4 flex gap-1">
        {[
          { to: '/client/dashboard', label: 'Accueil' },
          { to: '/client/pin', label: 'Mon PIN' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `py-3 px-4 text-sm border-b-2 transition-colors ${
                isActive ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
