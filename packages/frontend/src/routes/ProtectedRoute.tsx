import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Spinner } from '../components/ui/Spinner';

// Client-side convenience only — real authorization is enforced by the backend on
// every request. This just avoids flashing protected UI before redirecting.
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
