import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';
import Home from './pages/Home';
import BarberDashboard from './pages/BarberDashboard';
import Booking from './pages/Booking';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import ShopPage from './pages/ShopPage';
import ClientDashboard from './pages/ClientDashboard';
import ShopSettings from './pages/ShopSettings';
import BarberProfile from './pages/BarberProfile';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminAgenda from './pages/admin/Agenda';
import AdminProdutos from './pages/admin/Produtos';
import AdminConfiguracoes from './pages/admin/Configuracoes';
import AdminClientes from './pages/admin/Clientes';
import RoleRoute from './components/RoleRoute';
import SiteOwnerLayout from './components/SiteOwnerLayout';
import SiteOwnerDashboard from './pages/siteowner/Dashboard';
import SiteOwnerPlanos from './pages/siteowner/Planos';
import SiteOwnerAssinaturas from './pages/siteowner/Assinaturas';
import SiteOwnerSimulador from './pages/siteowner/Simulador';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/shop/:slug" element={<ShopPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<ClientDashboard />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/barber-dashboard" element={<BarberDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shop-settings" element={<ShopSettings />} />
          <Route path="/barber/:id" element={<BarberProfile />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<RoleRoute allowedRoles={["admin", "siteowner"]} redirectTo="/" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/agenda" element={<AdminAgenda />} />
            <Route path="/admin/clientes" element={<AdminClientes />} />
            <Route path="/admin/barbearia" element={<ShopSettings />} />
            <Route path="/admin/produtos" element={<AdminProdutos />} />
            <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
          </Route>
        </Route>
      </Route>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<RoleRoute allowedRoles={["siteowner"]} redirectTo="/" />}>
          <Route element={<SiteOwnerLayout />}>
            <Route path="/siteowner" element={<SiteOwnerDashboard />} />
            <Route path="/siteowner/planos" element={<SiteOwnerPlanos />} />
            <Route path="/siteowner/assinaturas" element={<SiteOwnerAssinaturas />} />
            <Route path="/siteowner/simulador" element={<SiteOwnerSimulador />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App