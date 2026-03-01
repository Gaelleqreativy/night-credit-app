import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // envoie les cookies httpOnly automatiquement
})

// Intercepteur de réponse pour les 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminUser')
      localStorage.removeItem('clientData')
      const isClient = window.location.pathname.startsWith('/client')
      window.location.href = isClient ? '/client/login' : '/admin/login'
    }
    return Promise.reject(err)
  }
)

export default api
