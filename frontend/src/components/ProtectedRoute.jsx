import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ allowedRoles = [], children }) {
  const { loading, user, isAuthenticated } = useAuth();

  if (loading) return <div className="py-10 text-center text-slate-300">Loading account...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.accountStatus === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }
  if (user?.accountStatus === 'suspended') {
    return <Navigate to="/unauthorized" replace />;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;
