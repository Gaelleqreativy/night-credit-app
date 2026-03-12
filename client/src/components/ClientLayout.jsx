import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { Home, History, KeyRound, Moon, Bell, CheckCircle, CreditCard } from 'lucide-react'

function ClientNotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  function fetchNotifs() {
    api.get('/notifications/client').then((r) => setNotifs(r.data.notifications)).catch(() => {})
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {count > 0 && <span className="badge badge-blue text-xs">{count}</span>}
          </div>
          {count === 0 ? (
            <p className="text-center py-6 text-gray-500 text-sm">Aucune notification récente</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {notifs.map((n, i) => (
                <li key={i} className="px-4 py-3">
                  {n.type === 'DISPUTE_RESOLUE' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-green-600" />
                        <span className="text-green-600 text-xs font-medium">Contestation résolue</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{n.establishment}</p>
                      {n.note && <p className="text-xs text-gray-400 truncate mt-0.5">{n.note}</p>}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard size={12} className="text-blue-600" />
                        <span className="text-blue-600 text-xs font-medium">Paiement enregistré</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{n.establishment}</p>
                      <p className="text-xs text-gray-700 font-medium mt-0.5">
                        {Number(n.montant).toLocaleString('fr-FR')} FCFA
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
          <div className="flex items-center gap-1">
            <ClientNotificationBell />
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg border border-gray-200 hover:border-red-200"
            >
              Déconnexion
            </button>
          </div>
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
