import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import LoginModal from '../components/LoginModal'
import RightPanel from '../components/RightPanel'
import SellerOnboardingModal from '../components/SellerOnboardingModal'
import TopBar from '../components/TopBar'
import AppFooter from '../components/AppFooter'
import useAuth from '../hooks/useAuth'

const mobileMenus = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/seller-search', label: '판매자 찾기', icon: '🔎' },
  { to: '/community', label: '게시판', icon: '📝' },
  { to: '/notifications', label: '알림', requiresAuth: true, icon: '🔔' },
  { to: '/chat', label: '채팅', requiresAuth: true, icon: '💬' },
  { to: '/mypage?tab=activity', label: '마이페이지', requiresAuth: true, icon: '👤' },
]

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { requireAuth, signOut, profile, user, isLoggedIn, requestSellerOnboarding } = useAuth()

  const nickname =
    profile?.nickname ??
    profile?.name ??
    user?.user_metadata?.nickname ??
    user?.user_metadata?.name ??
    user?.email?.split('@')?.[0] ??
    '사용자'
  const avatarText = nickname.slice(0, 2).toUpperCase()
  const avatarUrl = profile?.avatar_url ?? ''
  const pointBalance = Number(profile?.point_balance ?? 0)
  const isSellerRegistered = Boolean(profile?.is_seller) || profile?.seller_status === 'active'
  const sellerCtaLabel = isSellerRegistered ? '판매 목록 편집' : '판매자 등록'

  const mobileMenuItems = useMemo(() => mobileMenus, [])

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
      <section className="content-panel">
        <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <div className="content-scroll-area">
          <Outlet />
          <AppFooter />
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
              <h2>{pointBalance.toLocaleString()}P</h2>
              <span>계정 허브에서 포인트 내역을 관리하세요</span>
            </section>

            <section className="mobile-drawer-panel panel-card">
              <h3>내 계정 바로가기</h3>
              <Link to="/mypage?tab=activity" onClick={closeMobileMenu} className="mobile-drawer-profile">
                <div className="right-profile-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="내 프로필 이미지" /> : avatarText}
                </div>
                <div>
                  <p className="profile-name">{nickname}</p>
                  <p className="profile-role">{profile?.role ?? '구매자/판매자'}</p>
                </div>
              </Link>
              <div className="settings-account-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    requireAuth({
                      reason: '프로필 편집은 로그인 후 이용할 수 있습니다.',
                      onSuccess: () => {
                        navigate('/mypage?tab=activity', { state: { openProfileEdit: true } })
                        closeMobileMenu()
                      },
                    })
                  }}
                >
                  프로필 편집
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    requireAuth({
                      reason: '비밀번호 변경은 로그인 후 이용할 수 있습니다.',
                      onSuccess: () => {
                        navigate('/mypage?tab=activity', { state: { openPasswordModal: true } })
                        closeMobileMenu()
                      },
                    })
                  }}
                >
                  비밀번호 변경
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    requireAuth({
                      reason: '주문내역은 로그인 후 이용할 수 있습니다.',
                      onSuccess: () => {
                        navigate('/mypage?tab=orders')
                        closeMobileMenu()
                      },
                    })
                  }}
                >
                  주문내역
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    requireAuth({
                      reason: '포인트 충전은 로그인 후 이용할 수 있습니다.',
                      onSuccess: () => {
                        navigate('/mypage?tab=points', { state: { openPointCharge: true } })
                        closeMobileMenu()
                      },
                    })
                  }}
                >
                  충전하기
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    requireAuth({
                      reason: '판매자 기능은 로그인 후 이용할 수 있습니다.',
                      onSuccess: () => {
                        if (isSellerRegistered) {
                          navigate('/seller-dashboard')
                        } else {
                          requestSellerOnboarding()
                        }
                        closeMobileMenu()
                      },
                    })
                  }}
                >
                  {sellerCtaLabel}
                </button>
              </div>
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
