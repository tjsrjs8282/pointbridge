import { Outlet } from 'react-router-dom'

function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-shell">
        <div className="auth-brand">
          <p>PointBridge</p>
          <span>사람과 서비스를 연결하는 작업 중개 플랫폼</span>
        </div>
        <Outlet />
      </section>
    </main>
  )
}

export default AuthLayout
