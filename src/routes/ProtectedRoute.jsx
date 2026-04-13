import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const { isLoggedIn, isInitializing } = useAuth()

  if (isInitializing) {
    return <div className="auth-loading">인증 상태 확인 중...</div>
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children ?? <Outlet />
}

export default ProtectedRoute
