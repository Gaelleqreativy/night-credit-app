import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Injecter le token automatiquement
api.interceptors.request.use((config) => {
  // Token admin (prioritaire si présent)
  const adminToken = localStorage.getItem('adminToken')
  const clientToken = localStorage.getItem('clientToken')
  const token = adminToken || clientToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Intercepteur de réponse pour les 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      localStorage.removeItem('clientToken')
      localStorage.removeItem('clientData')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default api
