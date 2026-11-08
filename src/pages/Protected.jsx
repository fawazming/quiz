import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Spinner } from '../components/UI.jsx';

export default function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-center"><Spinner label="Checking your session…" /></div>;
  if (!user) {
    const target = roles?.includes('candidate') ? '/join' : '/login';
    return <Navigate to={target} state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'candidate' ? '/play' : '/admin'} replace />;
  }
  return children;
}
