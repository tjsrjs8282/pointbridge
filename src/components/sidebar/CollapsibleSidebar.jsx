import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import useUserTier from '../../hooks/useUserTier'
import { fetchSellerProfileIdByUserId } from '../../lib/marketplace'
import { isAdminProfile } from '../../lib/permissions'
import ConfirmModal from '../common/ConfirmModal'
import SidebarGuestPanel from './SidebarGuestPanel'
import SidebarPromoBanners from './SidebarPromoBanners'
import SidebarToggleButton from './SidebarToggleButton'
import SidebarUserPanel from './SidebarUserPanel'

const SIDEBAR_COLLAPSED_KEY = 'pointbridge:sidebar:collapsed'

function readCollapsedState() {
  try {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) return saved === 'true'
    const defaultState = document.body?.getAttribute('data-sidebar-default')
    return defaultState === 'collapsed'
  } catch {
    return false
  }
}

function CollapsibleSidebar() {
  const navigate = useNavigate()
  const {
    profile,
    user,
    requireAuth,
    requestSellerOnboarding,
    signOut,
    isLoggedIn,
    openAuthModal,
  } = useAuth()

  const [isCollapsed, setIsCollapsed] = useState(readCollapsedState)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [hiddenPromoBannerIds, setHiddenPromoBannerIds] = useState([])

  const nickname =
    profile?.nickname ??
    profile?.name ??
    user?.user_metadata?.nickname ??
    user?.user_metadata?.name ??
    user?.email?.split('@')?.[0] ??
    '사용자'
  const avatarText = nickname.slice(0, 2).toUpperCase()
  const isAdmin = isAdminProfile(profile)
  const avatarUrl = profile?.avatar_url ?? ''
  const pointBalance = Number(profile?.point_balance ?? 0)
  const isSellerRegistered = Boolean(profile?.is_seller) || profile?.seller_status === 'active'
  const { tier } = useUserTier({ userId: user?.id, profile })
  const canAccessSellerDashboard = isSellerRegistered
  const sellerActionLabel = '판매자 대시보드'

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed))
  }, [isCollapsed])

  const goWithAuth = ({ to, reason, state }) => {
    requireAuth({
      reason,
      onSuccess: () => navigate(to, state ? { state } : undefined),
    })
  }

  const goToMySellerProfile = async () => {
    if (!user?.id) return
    const { data } = await fetchSellerProfileIdByUserId(user.id)
    if (data) {
      navigate(`/seller/${data}`)
      return
    }
    requestSellerOnboarding()
  }

  const handleSellerDashboardAction = () => {
    requireAuth({
      reason: '판매자 기능은 로그인 후 이용할 수 있습니다.',
      onSuccess: () => {
        if (canAccessSellerDashboard) {
          goToMySellerProfile()
          return
        }
        requestSellerOnboarding()
      },
    })
  }

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } catch (err) {
      console.warn('[Sidebar] signOut', err)
    } finally {
      setIsLoggingOut(false)
      setIsLogoutConfirmOpen(false)
      navigate('/', { replace: true })
    }
  }

  const sidebarClassName = useMemo(
    () => `right-panel collapsible-sidebar ${isCollapsed ? 'collapsed' : ''}`,
    [isCollapsed],
  )
  const accountActionItems = [
    {
      key: 'mypage',
      label: '마이페이지',
      icon: '👤',
      variant: 'secondary',
      onClick: () =>
        goWithAuth({
          to: '/mypage?tab=activity',
          reason: '마이페이지는 로그인 후 이용할 수 있습니다.',
        }),
    },
    ...(isAdmin
      ? [
          {
            key: 'admin-dashboard',
            label: '관리자 전용 페이지',
            icon: '🛡',
            variant: 'primary',
            onClick: () =>
              goWithAuth({
                to: '/admin',
                reason: '관리자 전용 페이지는 로그인 후 이용할 수 있습니다.',
              }),
          },
        ]
      : []),
    ...(!isAdmin && canAccessSellerDashboard
      ? [
          {
            key: 'seller-dashboard',
            label: sellerActionLabel,
            icon: '🛠',
            variant: 'primary',
            onClick: handleSellerDashboardAction,
          },
        ]
      : []),
  ]

  const guestActionItems = [
    {
      key: 'login',
      label: '로그인',
      icon: '🔐',
      variant: 'secondary',
      onClick: () => requireAuth({ reason: '로그인 후 이용할 수 있습니다.' }),
    },
    {
      key: 'signup',
      label: '회원가입',
      icon: '✨',
      variant: 'primary',
      onClick: () =>
        openAuthModal({
          tab: 'signup',
          reason: '회원가입 후 더 많은 기능을 이용할 수 있습니다.',
        }),
    },
  ]

  return (
    <aside className={sidebarClassName}>
      {isCollapsed ? (
        <section className="panel-card sidebar-slim-panel">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                className="sidebar-slim-profile"
                onClick={() => navigate('/mypage?tab=activity')}
                title="마이페이지"
                aria-label="마이페이지"
              >
                <div className="right-profile-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="내 프로필 이미지" /> : avatarText}
                </div>
              </button>
              <button
                type="button"
                className="sidebar-slim-action"
                onClick={() =>
                  goWithAuth({
                    to: '/mypage?tab=points',
                    reason: '포인트 충전은 로그인 후 이용할 수 있습니다.',
                    state: { openPointCharge: true },
                  })
                }
                title="포인트 충전"
                aria-label="포인트 충전"
              >
                💎
              </button>
              {[...accountActionItems, {
                key: 'logout',
                label: '로그아웃',
                icon: '↩',
                variant: 'secondary',
                onClick: () => setIsLogoutConfirmOpen(true),
              }].map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={`sidebar-slim-action ${action.variant === 'primary' ? 'primary' : ''}`.trim()}
                  onClick={action.onClick}
                  title={action.label}
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </>
          ) : (
            <>
              {guestActionItems.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={`sidebar-slim-action ${action.variant === 'primary' ? 'primary' : ''}`.trim()}
                  onClick={action.onClick}
                  title={action.label}
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </>
          )}
        </section>
      ) : (
        <>
          <section className="panel-card account-hub-card">
            <div className="account-hub-head">
              <p className="badge">내 계정 허브</p>
              {isLoggedIn ? (
                <button
                  type="button"
                  className="account-logout-btn"
                  onClick={() => setIsLogoutConfirmOpen(true)}
                >
                  로그아웃
                </button>
              ) : null}
            </div>

            {!isLoggedIn ? (
              <SidebarGuestPanel
                onLogin={() => requireAuth({ reason: '로그인 후 이용할 수 있습니다.' })}
                onSignup={() =>
                  openAuthModal({
                    tab: 'signup',
                    reason: '회원가입 후 더 많은 기능을 이용할 수 있습니다.',
                  })
                }
              />
            ) : (
              <SidebarUserPanel
                nickname={nickname}
                avatarText={avatarText}
                avatarUrl={avatarUrl}
                tier={tier}
                isSellerRegistered={isSellerRegistered}
                pointBalance={pointBalance}
                onProfile={() => navigate('/mypage?tab=activity')}
                onPointCharge={() =>
                  goWithAuth({
                    to: '/mypage?tab=points',
                    reason: '포인트 충전은 로그인 후 이용할 수 있습니다.',
                    state: { openPointCharge: true },
                  })
                }
                actions={accountActionItems}
              />
            )}
          </section>

          <SidebarPromoBanners
            hiddenBannerIds={hiddenPromoBannerIds}
            onPointEvent={() =>
              goWithAuth({
                to: '/mypage?tab=points',
                reason: '포인트 이벤트 상세는 로그인 후 이용할 수 있습니다.',
              })
            }
            onSellerEvent={() =>
              goWithAuth({
                to: '/mypage?tab=sales',
                reason: '이벤트 상세 확인은 로그인 후 이용할 수 있습니다.',
              })
            }
            onClose={(bannerId) =>
              setHiddenPromoBannerIds((prev) =>
                prev.includes(bannerId) ? prev : [...prev, bannerId],
              )
            }
          />
        </>
      )}

      <div className="sidebar-toggle-anchor">
        <SidebarToggleButton
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed((prev) => !prev)}
        />
      </div>

      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmText="확인"
        cancelText="취소"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        isConfirming={isLoggingOut}
      />
    </aside>
  )
}

export default CollapsibleSidebar
