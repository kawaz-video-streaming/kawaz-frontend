import { type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/useAuth';

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
};
