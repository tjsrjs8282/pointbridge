import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { getChatUnreadCountForUser } from '../lib/chat'
import { fetchLatestPostsByCategories } from '../lib/community'
import { readNotificationsForUser } from '../lib/notifications'
import { isAdminProfile } from '../lib/permissions'

function LineIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {children}
    </svg>
  )
}

function TopBar({ onOpenMobileMenu }) {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isLoggedIn,
    isInitializing,
    user,
    profile,
    requireAuth,
  } = useAuth()
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [hasNewCommunityPost, setHasNewCommunityPost] = useState(false)
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
  const isAdmin = isAdminProfile(profile)
  const welcomeText = `${displayName} 환영합니다`

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

  const markCommunityAsSeen = useCallback(() => {
    try {
      localStorage.setItem(`pointbridge:community:lastSeenAt:${user?.id ?? 'guest'}`, new Date().toISOString())
    } catch {
      // no-op: localStorage unavailable
    }
    setHasNewCommunityPost(false)
  }, [user])

  const formatBadgeCount = (count) => {
    if (!Number.isFinite(count) || count <= 0) return ''
    if (count > 99) return '99+'
    if (count > 9) return '9+'
    return String(count)
  }

  const isRouteActive = (to) => {
    if (to === '/') return location.pathname === '/'
    if (to === '/seller-search') {
      return location.pathname === '/seller-search' || location.pathname === '/sellers' || location.pathname.startsWith('/seller/')
    }
    if (to === '/mypage') return location.pathname === '/mypage' || location.pathname === '/profile'
    return location.pathname === to
  }

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      queueMicrotask(() => {
        if (!mounted) return
        setNotificationUnreadCount(0)
      })
      return () => {
        mounted = false
      }
    }

    readNotificationsForUser({ userId: user.id, displayName }).then(({ data }) => {
      if (!mounted) return
      if (location.pathname === '/notifications') {
        setNotificationUnreadCount(0)
        return
      }
      const unread = (data ?? []).filter((item) => !item.isRead).length
      setNotificationUnreadCount(unread)
    })

    return () => {
      mounted = false
    }
  }, [displayName, location.pathname, user?.id])

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      queueMicrotask(() => {
        if (!mounted) return
        setChatUnreadCount(0)
      })
      return () => {
        mounted = false
      }
    }

    getChatUnreadCountForUser({ userId: user.id }).then(({ data }) => {
      if (!mounted) return
      if (location.pathname === '/chat') {
        setChatUnreadCount(0)
        return
      }
      setChatUnreadCount(Number(data ?? 0))
    })
    return () => {
      mounted = false
    }
  }, [
    location.pathname,
    user?.id,
  ])

  useEffect(() => {
    let mounted = true
    fetchLatestPostsByCategories({
      categories: ['notice', 'free', 'inquiry'],
      limitPerCategory: 1,
    }).then(({ data, error }) => {
      if (!mounted || error) return
      const allPosts = [
        ...(data?.notice ?? []),
        ...(data?.free ?? []),
        ...(data?.inquiry ?? []),
      ]
      if (allPosts.length === 0) {
        setHasNewCommunityPost(false)
        return
      }
      const latestTime = allPosts
        .map((post) => new Date(post.createdAt ?? 0).getTime())
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0]
      if (!latestTime) {
        setHasNewCommunityPost(false)
        return
      }
      if (location.pathname === '/community') {
        markCommunityAsSeen()
        return
      }
      const seenRaw = localStorage.getItem(`pointbridge:community:lastSeenAt:${user?.id ?? 'guest'}`)
      const seenTime = seenRaw ? new Date(seenRaw).getTime() : 0
      setHasNewCommunityPost(!seenTime || latestTime > seenTime)
    })
    return () => {
      mounted = false
    }
  }, [location.pathname, markCommunityAsSeen, user?.id])

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
      badgeContent: hasNewCommunityPost ? 'N' : '',
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
      badgeContent: formatBadgeCount(notificationUnreadCount),
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
      badgeContent: formatBadgeCount(chatUnreadCount),
      icon: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />,
    },
    {
      key: 'settings',
      label: '설정',
      to: '/settings',
      authReason: '설정은 로그인 후 이용할 수 있습니다.',
      icon: (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6M18.1 18.1l-1.6-1.6M7.5 7.5 5.9 5.9" />
        </>
      ),
    },
    {
      key: 'profile',
      label: '프로필',
      to: '/mypage',
      authReason: '마이페이지는 로그인 후 이용할 수 있습니다.',
      avatar: true,
    },
  ]
  if (isAdmin) {
    navItems.splice(5, 0, {
      key: 'admin',
      label: '관리',
      to: '/admin',
      authReason: '관리자 전용 페이지는 로그인 후 이용할 수 있습니다.',
      icon: (
        <>
          <path d="M12 3.5 19.5 7v5.3c0 4.3-3.1 7.8-7.5 8.9-4.4-1.1-7.5-4.6-7.5-8.9V7L12 3.5Z" />
          <path d="M9.5 12.2 11 13.7l3.7-3.7" />
        </>
      ),
    })
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
        <Link to="/" className="topbar-logo-link" aria-label="PointBridge 홈으로 이동">
          <img src="/logo/pointbridge-logo.png" alt="PointBridge" className="topbar-logo-image" />
        </Link>
      </div>

      <div className="topbar-right">
        {isInitializing ? <div className="topbar-auth"><span className="topbar-login-link">상태 확인 중...</span></div> : null}

        {isLoggedIn ? <p className="topbar-welcome">{welcomeText}</p> : null}

        <div className="topbar-actions">
          {navItems.map((item) => (
            <div key={item.key} className="topbar-icon-wrap">
              <button
                type="button"
                className={`topbar-icon-btn ${item.avatar ? 'profile' : ''} ${isRouteActive(item.to) ? 'active' : ''}`}
                aria-label={item.label}
                onClick={() => {
                  if (item.key === 'community') markCommunityAsSeen()
                  navigateWithAuth({ to: item.to, reason: item.authReason })
                }}
              >
                {item.avatar ? (
                  avatarUrl ? <img src={avatarUrl} alt="내 프로필 이미지" /> : avatarText
                ) : (
                  <LineIcon>{item.icon}</LineIcon>
                )}
                {item.badgeContent ? <span className="topbar-icon-badge">{item.badgeContent}</span> : null}
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
