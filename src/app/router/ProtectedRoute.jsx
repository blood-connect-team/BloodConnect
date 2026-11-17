import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/auth-context';
import { Loader } from '../../components/common/Loader';

/**
 * Lets the user through only with a real Supabase session (UX only: the database's
 * Row Level Security is what actually protects the data).
 * - not logged in      -> /login?next=<current path>
 * - requireProfile and no profile yet -> /register (complete your profile)
 */
export function ProtectedRoute({ requireProfile = true }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;

  const next = encodeURIComponent(location.pathname + location.search);
  if (!user) return <Navigate to={`/login?next=${next}`} replace />;
  if (requireProfile && !profile) return <Navigate to={`/register?next=${next}`} replace />;

  return <Outlet />;
}
