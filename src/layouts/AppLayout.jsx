import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import LoginModal from '../components/LoginModal'
import RightPanel from '../components/RightPanel'
import SellerOnboardingModal from '../components/SellerOnboardingModal'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import useAuth from '../hooks/useAuth'

const mobileMenus = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/sellers', label: '판매자 찾기', icon: '🔎' },
  { to: '/orders', label: '주문내역', requiresAuth: true, icon: '📋' },
  { to: '/chat', label: '채팅', requiresAuth: true, icon: '💬' },
  { to: '/points', label: '포인트', requiresAuth: true, icon: '🪙' },
  { to: '/profile', label: '내 프로필', requiresAuth: true, icon: '👤' },
  { to: '/settings', label: '설정', requiresAuth: true, icon: '⚙️' },
]

function AppLayout({ isSellerMode = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { requireAuth, signOut, profile, user, isLoggedIn } = useAuth()

  const nickname =
    profile?.nickname ??
    profile?.name ??
    user?.user_metadata?.nickname ??
    user?.user_metadata?.name ??
    user?.email?.split('@')?.[0] ??
    '사용자'
  const avatarText = nickname.slice(0, 2).toUpperCase()
  const avatarUrl = profile?.avatar_url ?? ''

  const mobileMenuItems = useMemo(() => {
    const seller = isSellerMode
      ? [{ to: '/seller-dashboard', label: '판매관리', requiresAuth: true, icon: '🧰' }]
      : []
    return [...mobileMenus, ...seller]
  }, [isSellerMode])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const handleMobileMenuClick = (menu) => {
    if (menu.requiresAuth) {
      requireAuth({
        reason: `${menu.label} 기능은 로그인 후 이용할 수 있습니다.`,
        onSuccess: () => {
          navigate(menu.to)
          closeMobileMenu()
        },
      })
      return
    }
    navigate(menu.to)
    closeMobileMenu()
  }

  const handleMobileLogout = async () => {
    await signOut()
    closeMobileMenu()
    navigate('/', { replace: true })
  }

  return (
    <main className="app-shell">
      <Sidebar isSellerMode={isSellerMode} />
      <section className="content-panel">
        <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <div className="content-scroll-area">
          <Outlet />
        </div>
      </section>
      <RightPanel />
      {isMobileMenuOpen ? (
        <div className="mobile-drawer-overlay" role="presentation" onClick={closeMobileMenu}>
          <aside
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-drawer-head">
              <h3>메뉴</h3>
              <button type="button" onClick={closeMobileMenu} aria-label="모바일 메뉴 닫기">
                ×
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              {mobileMenuItems.map((menu) => (
                <button
                  key={menu.to}
                  type="button"
                  className={`mobile-drawer-link ${location.pathname === menu.to ? 'active' : ''}`}
                  onClick={() => handleMobileMenuClick(menu)}
                >
                  <span>{menu.icon}</span>
                  <strong>{menu.label}</strong>
                </button>
              ))}
              {isLoggedIn ? (
                <button type="button" className="mobile-drawer-link" onClick={handleMobileLogout}>
                  <span>↩</span>
                  <strong>로그아웃</strong>
                </button>
              ) : (
                <button
                  type="button"
                  className="mobile-drawer-link"
                  onClick={() => {
                    requireAuth({ reason: '로그인 후 이용할 수 있습니다.' })
                    closeMobileMenu()
                  }}
                >
                  <span>🔐</span>
                  <strong>로그인</strong>
                </button>
              )}
            </nav>

            <section className="mobile-drawer-panel panel-card gradient">
              <p>보유 포인트</p>
              <h2>12,450P</h2>
              <span>이번 달 +1,220P</span>
            </section>

            <section className="mobile-drawer-panel panel-card">
              <h3>내 프로필</h3>
              <Link to="/profile" onClick={closeMobileMenu} className="mobile-drawer-profile">
                <div className="right-profile-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="내 프로필 이미지" /> : avatarText}
                </div>
                <div>
                  <p className="profile-name">{nickname}</p>
                  <p className="profile-role">{profile?.role ?? '구매자/판매자'}</p>
                </div>
              </Link>
            </section>

            <section className="mobile-drawer-panel panel-card">
              <h3>최근 활동</h3>
              <div className="activity-item">
                <p>랜딩페이지 UI 개선</p>
                <span>진행중 · D-2</span>
              </div>
              <div className="activity-item">
                <p>원룸 청소 서비스</p>
                <span>완료 · 리뷰 대기</span>
              </div>
            </section>
          </aside>
        </div>
      ) : null}
      <LoginModal />
      <SellerOnboardingModal />
    </main>
  )
}

export default AppLayout
