import { useAuth } from '@/lib/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

function isMissingCriticalFields(profile) {
  if (!profile) return true;
  const name = profile.full_name;
  if (!name || name.trim() === '' || name === 'Usuário') return true;
  if (!profile.phone || profile.phone.trim() === '') return true;
  return false;
}

export default function RegistrationGuard({ children }) {
  const { user, profile, isAuthenticated } = useAuth();
  const location = useLocation();

  // Only check for authenticated users
  const showBanner =
    isAuthenticated &&
    isMissingCriticalFields(profile) &&
    location.pathname !== '/profile';

  return (
    <>
      {showBanner && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Seu cadastro está incompleto. Complete as informações para continuar.
            </span>
          </div>
          <Link
            to="/profile"
            className="shrink-0 text-xs font-medium text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors"
          >
            Completar perfil
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
