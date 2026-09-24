import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { JSX } from 'react';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
