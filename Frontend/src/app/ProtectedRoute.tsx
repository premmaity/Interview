import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { LoadingState } from '../components/States'
import { useAuth } from './AuthProvider'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <LoadingState label="Checking your session" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}

