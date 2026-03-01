import { createContext, useContext, useState, useEffect } from 'react'

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

  function loginAdmin(token, user) {
    localStorage.setItem('adminToken', token)
    localStorage.setItem('adminUser', JSON.stringify(user))
    setAdminUser(user)
  }

  function logoutAdmin() {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    setAdminUser(null)
  }

  function loginClient(token, client) {
    localStorage.setItem('clientToken', token)
    localStorage.setItem('clientData', JSON.stringify(client))
    setClientData(client)
  }

  function logoutClient() {
    localStorage.removeItem('clientToken')
    localStorage.removeItem('clientData')
    setClientData(null)
  }

  return (
    <AuthContext.Provider value={{ adminUser, clientData, loginAdmin, logoutAdmin, loginClient, logoutClient }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
