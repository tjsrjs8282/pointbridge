import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function LineIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {children}
    </svg>
  )
}

function TopBar({ onOpenMobileMenu }) {
  const navigate = useNavigate()
  const {
    isLoggedIn,
    isInitializing,
    user,
    profile,
    signOut,
    requireAuth,
    requestSellerOnboarding,
    openAuthModal,
  } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const displayName =
    profile?.nickname ??
    profile?.name ??
    user?.user_metadata?.nickname ??
    user?.user_metadata?.name ??
    user?.name ??
    user?.email ??
    '사용자'
  const avatarText = displayName.slice(0, 1).toUpperCase()
  const avatarUrl = profile?.avatar_url ?? ''
  const isSellerRegistered = Boolean(profile?.is_seller) || profile?.seller_status === 'active'
  const sellerActionLabel = isSellerRegistered ? '판매 목록 편집' : '판매자 등록'
  const handleSellerAction = () => {
    setIsMenuOpen(false)
    if (isSellerRegistered) {
      navigate('/seller-dashboard')
      return
    }
    requestSellerOnboarding()
  }

  const handleLogout = async () => {
    try {
      setIsSigningOut(true)
      setLogoutError('')
      await signOut()
      setIsMenuOpen(false)
      navigate('/', { replace: true })
    } catch (error) {
      setLogoutError(error?.message ?? '로그아웃 처리 중 문제가 발생했습니다.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          aria-label="모바일 메뉴 열기"
          onClick={onOpenMobileMenu}
        >
          ☰
        </button>
        <h2>PointBridge</h2>
      </div>

      <div className="topbar-right">
        {isInitializing ? (
          <div className="topbar-auth">
            <span className="topbar-login-link">상태 확인 중...</span>
          </div>
        ) : !isLoggedIn ? (
          <div className="topbar-auth">
            <button
              type="button"
              className="topbar-login-link"
              onClick={() =>
                requireAuth({
                  reason: '로그인 후 더 많은 기능을 이용할 수 있습니다.',
                })
              }
            >
              로그인
            </button>
            <button
              type="button"
              className="topbar-signup-link"
              onClick={() =>
                openAuthModal({
                  tab: 'signup',
                  reason: '회원가입 후 더 많은 기능을 이용할 수 있습니다.',
                })
              }
            >
              회원가입
            </button>
          </div>
        ) : (
          <div className="topbar-actions">
            <button
              type="button"
              className="topbar-icon-btn"
              aria-label="알림"
              onClick={() =>
                requireAuth({
                  reason: '알림 확인은 로그인 후 이용할 수 있습니다.',
                  onSuccess: () => navigate('/notifications'),
                })
              }
            >
              <LineIcon>
                <path d="M12 3a5 5 0 0 0-5 5v2.8c0 .7-.2 1.3-.6 1.9L5 15h14l-1.4-2.3c-.4-.6-.6-1.2-.6-1.9V8a5 5 0 0 0-5-5Z" />
                <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
              </LineIcon>
            </button>
            <button
              type="button"
              className="topbar-icon-btn"
              aria-label="메시지"
              onClick={() =>
                requireAuth({
                  reason: '채팅은 로그인 후 이용할 수 있습니다.',
                  onSuccess: () => navigate('/chat'),
                })
              }
            >
              <LineIcon>
                <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />
              </LineIcon>
            </button>

            <div className="topbar-profile-wrap">
              <button
                type="button"
                className="topbar-avatar-btn"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
              >
                {avatarUrl ? <img src={avatarUrl} alt="내 프로필 이미지" /> : avatarText}
              </button>
              {isMenuOpen ? (
                <div className="topbar-dropdown">
                  <Link to="/points" onClick={() => setIsMenuOpen(false)}>
                    포인트
                  </Link>
                  <Link to="/settings" onClick={() => setIsMenuOpen(false)}>
                    설정
                  </Link>
                  <button
                    type="button"
                    className={!isSellerRegistered ? 'cta' : ''}
                    onClick={handleSellerAction}
                  >
                    {sellerActionLabel}
                  </button>
                  <button type="button" onClick={handleLogout} disabled={isSigningOut}>
                    {isSigningOut ? '로그아웃 중...' : '로그아웃'}
                  </button>
                  {logoutError ? <small className="auth-error">{logoutError}</small> : null}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default TopBar
