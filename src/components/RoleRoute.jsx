import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

/**
 * Protects routes by user role.
 * allowedRoles: string[] — e.g. ["admin"]
 * redirectTo: where to send unauthorized users
 */
export default function RoleRoute({ allowedRoles, redirectTo = "/" }) {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!allowedRoles.some(r => user.roles?.includes(r) || user.role === r)) return <Navigate to={redirectTo} replace />;

  return <Outlet />;
}