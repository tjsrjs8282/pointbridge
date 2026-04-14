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
    requireAuth,
    openAuthModal,
  } = useAuth()
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
  const welcomeText = isSellerRegistered
    ? `${displayName} 판매자님 환영합니다`
    : `${displayName}님 환영합니다`

  const navigateWithAuth = ({ to, reason }) => {
    if (reason) {
      requireAuth({
        reason,
        onSuccess: () => navigate(to),
      })
      return
    }
    navigate(to)
  }

  const navItems = [
    { key: 'home', label: '홈', to: '/', authReason: null, icon: <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" /> },
    {
      key: 'seller-search',
      label: '판매자 찾기',
      to: '/seller-search',
      authReason: null,
      icon: (
        <>
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.2-4.2" />
        </>
      ),
    },
    {
      key: 'community',
      label: '게시판',
      to: '/community',
      authReason: null,
      icon: (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </>
      ),
    },
    {
      key: 'notifications',
      label: '알림',
      to: '/notifications',
      authReason: '알림 확인은 로그인 후 이용할 수 있습니다.',
      icon: (
        <>
          <path d="M12 3a5 5 0 0 0-5 5v2.8c0 .7-.2 1.3-.6 1.9L5 15h14l-1.4-2.3c-.4-.6-.6-1.2-.6-1.9V8a5 5 0 0 0-5-5Z" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
        </>
      ),
    },
    {
      key: 'chat',
      label: '채팅',
      to: '/chat',
      authReason: '채팅은 로그인 후 이용할 수 있습니다.',
      icon: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />,
    },
    {
      key: 'profile',
      label: '프로필',
      to: '/mypage',
      authReason: '마이페이지는 로그인 후 이용할 수 있습니다.',
      avatar: true,
    },
  ]

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
        {isInitializing ? <div className="topbar-auth"><span className="topbar-login-link">상태 확인 중...</span></div> : null}
        {!isInitializing && !isLoggedIn ? (
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
        ) : null}

        {isLoggedIn ? <p className="topbar-welcome">{welcomeText}</p> : null}

        <div className="topbar-actions">
          {navItems.map((item) => (
            <div key={item.key} className="topbar-icon-wrap">
              <button
                type="button"
                className={`topbar-icon-btn ${item.avatar ? 'profile' : ''}`}
                aria-label={item.label}
                onClick={() => navigateWithAuth({ to: item.to, reason: item.authReason })}
              >
                {item.avatar ? (
                  avatarUrl ? <img src={avatarUrl} alt="내 프로필 이미지" /> : avatarText
                ) : (
                  <LineIcon>{item.icon}</LineIcon>
                )}
              </button>
              <span className="topbar-tooltip">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}

export default TopBar
