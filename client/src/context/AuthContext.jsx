import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(() => {
    const s = localStorage.getItem('adminUser')
    return s ? JSON.parse(s) : null
  })
  const [clientData, setClientData] = useState(() => {
    const s = localStorage.getItem('clientData')
    return s ? JSON.parse(s) : null
  })

  // Vérifier la session au chargement (cookie httpOnly)
  useEffect(() => {
    if (adminUser) {
      api.get('/auth/me').catch(() => {
        localStorage.removeItem('adminUser')
        setAdminUser(null)
      })
    }
    if (clientData) {
      api.get('/auth/client-me').catch(() => {
        localStorage.removeItem('clientData')
        setClientData(null)
      })
    }
  }, []) // eslint-disable-line

  function loginAdmin(user) {
    localStorage.setItem('adminUser', JSON.stringify(user))
    setAdminUser(user)
  }

  async function logoutAdmin() {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('adminUser')
    setAdminUser(null)
  }

  function loginClient(client) {
    localStorage.setItem('clientData', JSON.stringify(client))
    setClientData(client)
  }

  async function logoutClient() {
    await api.post('/auth/client-logout').catch(() => {})
    localStorage.removeItem('clientData')
    setClientData(null)
  }

  function updateClientData(patch) {
    const updated = { ...clientData, ...patch }
    localStorage.setItem('clientData', JSON.stringify(updated))
    setClientData(updated)
  }

  return (
    <AuthContext.Provider value={{ adminUser, clientData, loginAdmin, logoutAdmin, loginClient, logoutClient, updateClientData }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
