import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import LoginModal from '../components/LoginModal'
import RightPanel from '../components/RightPanel'
import SellerOnboardingModal from '../components/SellerOnboardingModal'
import TopBar from '../components/TopBar'
import AppFooter from '../components/AppFooter'
import ConfirmModal from '../components/common/ConfirmModal'
import useAuth from '../hooks/useAuth'
import { isAdminProfile } from '../lib/permissions'

const mobileMenus = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/seller-search', label: '판매자 찾기', icon: '🔎' },
  { to: '/community', label: '게시판', icon: '📝' },
  { to: '/notifications', label: '알림', requiresAuth: true, icon: '🔔' },
  { to: '/chat', label: '채팅', requiresAuth: true, icon: '💬' },
  { to: '/settings', label: '설정', requiresAuth: true, icon: '⚙️' },
  { to: '/point-withdraw', label: '포인트 환전', requiresAuth: true, icon: '💱' },
  { to: '/mypage?tab=activity', label: '마이페이지', requiresAuth: true, icon: '👤' },
]

const SITE_NAME = 'PointBridge'
const SITE_DESCRIPTION =
  'PointBridge는 다양한 분야의 전문가와 사용자를 연결하는 서비스 중개 플랫폼입니다. 디자인, 개발, 마케팅 등 원하는 작업을 빠르게 찾아보세요.'
const SITE_KEYWORDS =
  'pointbridge, 서비스중개, 프리랜서, 전문가, 외주, 디자인, 개발, 마케팅'

function resolvePageTitle(pathname, search) {
  const params = new URLSearchParams(search)
  if (pathname === '/') return SITE_NAME
  if (pathname === '/seller-search' || pathname === '/sellers') return `판매자 찾기 | ${SITE_NAME}`
  if (pathname.startsWith('/seller/')) return `판매자 상세 | ${SITE_NAME}`
  if (pathname === '/community') {
    const tab = params.get('tab')
    if (tab === 'notice') return `공지사항 | ${SITE_NAME}`
    if (tab === 'free') return `자유게시판 | ${SITE_NAME}`
    if (tab === 'inquiry') return `문의게시판 | ${SITE_NAME}`
    return `게시판 | ${SITE_NAME}`
  }
  if (pathname === '/chat') return `채팅 | ${SITE_NAME}`
  if (pathname === '/notifications') return `알림 | ${SITE_NAME}`
  if (pathname === '/orders') return `주문내역 | ${SITE_NAME}`
  if (pathname === '/points') return `포인트 | ${SITE_NAME}`
  if (pathname === '/point-withdraw') return `포인트 환전 | ${SITE_NAME}`
  if (pathname === '/mypage' || pathname === '/profile') return `마이페이지 | ${SITE_NAME}`
  if (pathname === '/settings') return `설정 | ${SITE_NAME}`
  if (pathname === '/admin') return `관리자 전용 페이지 | ${SITE_NAME}`
  if (pathname === '/seller-dashboard') return `판매자 대시보드 | ${SITE_NAME}`
  return SITE_NAME
}

function upsertMeta({ attr, key, content }) {
  if (typeof document === 'undefined') return
  let element = document.querySelector(`meta[${attr}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertCanonical(url) {
  if (typeof document === 'undefined') return
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const { requireAuth, signOut, profile, user, isLoggedIn, openAuthModal } = useAuth()

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
  const isAdmin = isAdminProfile(profile)
  const canAccessSellerDashboard = isSellerRegistered
  const sellerCtaLabel = '판매자 대시보드'

  const mobileMenuItems = useMemo(() => mobileMenus, [])

  useEffect(() => {
    const pageTitle = resolvePageTitle(location.pathname, location.search)
    document.title = pageTitle

    const pageUrl = `${window.location.origin}${location.pathname}${location.search}`
    upsertMeta({ attr: 'name', key: 'description', content: SITE_DESCRIPTION })
    upsertMeta({ attr: 'name', key: 'keywords', content: SITE_KEYWORDS })
    upsertMeta({ attr: 'property', key: 'og:title', content: SITE_NAME })
    upsertMeta({
      attr: 'property',
      key: 'og:description',
      content: '다양한 전문가를 빠르게 연결하는 서비스 중개 플랫폼',
    })
    upsertMeta({ attr: 'property', key: 'og:image', content: `${window.location.origin}/og-image.png` })
    upsertMeta({ attr: 'property', key: 'og:url', content: pageUrl })
    upsertMeta({ attr: 'property', key: 'og:type', content: 'website' })
    upsertMeta({ attr: 'name', key: 'twitter:card', content: 'summary_large_image' })
    upsertMeta({ attr: 'name', key: 'twitter:title', content: SITE_NAME })
    upsertMeta({
      attr: 'name',
      key: 'twitter:description',
      content: '다양한 전문가를 빠르게 연결하는 서비스 중개 플랫폼',
    })
    upsertMeta({ attr: 'name', key: 'twitter:image', content: `${window.location.origin}/og-image.png` })
    upsertCanonical(pageUrl)
  }, [location.pathname, location.search])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const isMobileMenuActive = (menu) => {
    if (menu.to.startsWith('/mypage')) {
      return location.pathname === '/mypage' || location.pathname === '/profile'
    }
    if (menu.to === '/seller-search') {
      return location.pathname === '/seller-search' || location.pathname === '/sellers' || location.pathname.startsWith('/seller/')
    }
    return location.pathname === menu.to
  }

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

  const handleMobileLogout = () => {
    setIsLogoutConfirmOpen(true)
  }

  const confirmMobileLogout = async () => {
    try {
      await signOut()
    } catch (err) {
      console.warn('[AppLayout] signOut', err)
    } finally {
      closeMobileMenu()
      setIsLogoutConfirmOpen(false)
      navigate('/', { replace: true })
    }
  }

  return (
    <main className="app-shell">
      <RightPanel />
      <section className="content-panel">
        <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <div className="content-scroll-area">
          <Outlet />
          <AppFooter />
        </div>
      </section>
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
                  className={`mobile-drawer-link ${isMobileMenuActive(menu) ? 'active' : ''}`}
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
                <>
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
                  <button
                    type="button"
                    className="mobile-drawer-link"
                    onClick={() => {
                      openAuthModal({
                        tab: 'signup',
                        reason: '회원가입 후 더 많은 기능을 이용할 수 있습니다.',
                      })
                      closeMobileMenu()
                    }}
                  >
                    <span>✨</span>
                    <strong>회원가입</strong>
                  </button>
                </>
              )}
            </nav>

            {isLoggedIn ? (
              <>
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
                          reason: '내 정보 수정은 로그인 후 이용할 수 있습니다.',
                          onSuccess: () => {
                            navigate('/mypage?tab=activity', { state: { openProfileEdit: true } })
                            closeMobileMenu()
                          },
                        })
                      }}
                    >
                      내 정보 수정
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
                      className="btn-secondary"
                      onClick={() => {
                        requireAuth({
                          reason: '포인트 환전은 로그인 후 이용할 수 있습니다.',
                          onSuccess: () => {
                            navigate('/point-withdraw')
                            closeMobileMenu()
                          },
                        })
                      }}
                    >
                      환전하기
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          requireAuth({
                            reason: '관리자 전용 페이지는 로그인 후 이용할 수 있습니다.',
                            onSuccess: () => {
                              navigate('/admin')
                              closeMobileMenu()
                            },
                          })
                        }}
                      >
                        관리자 전용 페이지
                      </button>
                    ) : null}
                    {!isAdmin && canAccessSellerDashboard ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          requireAuth({
                            reason: '판매자 기능은 로그인 후 이용할 수 있습니다.',
                            onSuccess: () => {
                              navigate('/seller-dashboard')
                              closeMobileMenu()
                            },
                          })
                        }}
                      >
                        {sellerCtaLabel}
                      </button>
                    ) : null}
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
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
      <LoginModal />
      <SellerOnboardingModal />
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmMobileLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </main>
  )
}

export default AppLayout
