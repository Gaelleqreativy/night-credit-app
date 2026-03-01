import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Admin pages
import AdminLogin from './pages/admin/Login'
import AdminDashboard from './pages/admin/Dashboard'
import ClientsList from './pages/admin/ClientsList'
import ClientDetail from './pages/admin/ClientDetail'
import AddConsommation from './pages/admin/AddConsommation'
import AddPaiement from './pages/admin/AddPaiement'
import StatsPage from './pages/admin/Stats'
import ImportPage from './pages/admin/Import'
import AuditPage from './pages/admin/Audit'
import UsersPage from './pages/admin/Users'
import DisputesPage from './pages/admin/Disputes'

// Client pages
import ClientLogin from './pages/client/ClientLogin'
import ClientDashboard from './pages/client/ClientDashboard'
import ClientTransactions from './pages/client/ClientTransactions'
import ClientPin from './pages/client/ClientPin'

// Layouts
import AdminLayout from './components/AdminLayout'

function AdminRoute({ children }) {
  const { adminUser } = useAuth()
  return adminUser ? children : <Navigate to="/admin/login" replace />
}

function ClientRoute({ children }) {
  const { clientData } = useAuth()
  return clientData ? children : <Navigate to="/client/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Redirection racine */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={<AdminRoute><AdminLayout /></AdminRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="consommation" element={<AddConsommation />} />
        <Route path="paiement" element={<AddPaiement />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="disputes" element={<DisputesPage />} />
      </Route>

      {/* Client */}
      <Route path="/client/login" element={<ClientLogin />} />
      <Route path="/client/dashboard" element={<ClientRoute><ClientDashboard /></ClientRoute>} />
      <Route path="/client/transactions" element={<ClientRoute><ClientTransactions /></ClientRoute>} />
      <Route path="/client/pin" element={<ClientRoute><ClientPin /></ClientRoute>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
