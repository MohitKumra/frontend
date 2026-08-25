// frontend/src/components/admin/AdminGuard.tsx
// Restores admin session via HttpOnly cookies on page load and protects admin routes.

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import { Spinner } from '../ui/Spinner';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, checkAuth } = useAdminStore();
  const location = useLocation();

  useEffect(() => {
    if (isInitializing) {
      checkAuth();
    }
  }, [isInitializing, checkAuth]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg text-text-primary">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted mt-3 font-medium">Verifying administrator session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}