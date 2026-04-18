import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProfileEditModal from '../components/ProfileEditModal'
import ProfileImageModal from '../components/ProfileImageModal'
import MemberStatusIcon from '../components/common/MemberStatusIcon'
import ProfileTabContent from '../components/profile/ProfileTabContent'
import { mockUsers } from '../data/mockUsers'
import useAuth from '../hooks/useAuth'
import { fetchFavoritesByUser, toggleFavorite } from '../lib/favorites'
import { fetchSellersByProfileIds, fetchServicesByIds } from '../lib/marketplace'
import useUserTier from '../hooks/useUserTier'
import { isAdminProfile, normalizeRoleLabel } from '../lib/permissions'
import { applyTestPointCharge, checkPointWithdrawEligibility, fetchPointLogsPaged, requestPointWithdraw } from '../lib/points'
import { supabase } from '../lib/supabase'

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const profileTabs = [
  { key: 'pointHistory', label: '포인트 사용 내역' },
  { key: 'points', label: '포인트 충전' },
  { key: 'pointWithdraw', label: '포인트 환전' },
  { key: 'reviews', label: '리뷰 관리' },
  { key: 'wishlist', label: '찜/관심' },
  { key: 'sales', label: '판매 서비스' },
]

function ProfilePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile: authProfile, user, requireAuth, refreshProfile } = useAuth()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isImageEditOpen, setIsImageEditOpen] = useState(false)
  const [isPasswordEditOpen, setIsPasswordEditOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    passwordConfirm: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [saveToast, setSaveToast] = useState('')
  const [activeTab, setActiveTab] = useState('pointHistory')
  const [shouldFocusCharge, setShouldFocusCharge] = useState(false)
  const [favoriteSellers, setFavoriteSellers] = useState([])
  const [favoriteServices, setFavoriteServices] = useState([])
  const [favoriteSellerIds, setFavoriteSellerIds] = useState([])
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false)
  const [isChargingPoints, setIsChargingPoints] = useState(false)
  const [pointChargeMessage, setPointChargeMessage] = useState('')
  const [pointLogRows, setPointLogRows] = useState([])
  const [pointLogFilter, setPointLogFilter] = useState('1y')
  const [pointLogPage, setPointLogPage] = useState(1)
  const [pointLogTotalPages, setPointLogTotalPages] = useState(1)
  const [isPointLogLoading, setIsPointLogLoading] = useState(false)
  const [isPointWithdrawing, setIsPointWithdrawing] = useState(false)
  const [pointWithdrawMessage, setPointWithdrawMessage] = useState('')
  const [withdrawEligibility, setWithdrawEligibility] = useState({
    eligible: false,
    minRequired: 1000,
    pointBalance: 0,
  })
  const profile = useMemo(
    () => ({
      ...mockUsers[0],
      name: authProfile?.name ?? mockUsers[0].name,
      nickname:
        authProfile?.nickname ??
        authProfile?.name ??
        mockUsers[0].name,
      role:
        normalizeRoleLabel(authProfile?.role),
      email: authProfile?.email ?? mockUsers[0].email,
      phone: authProfile?.phone ?? mockUsers[0].phone,
      address: authProfile?.address ?? '',
      addressDetail: authProfile?.address_detail ?? '',
      region: authProfile?.region ?? mockUsers[0].region,
      intro:
        authProfile?.bio ??
        '빠른 커뮤니케이션과 깔끔한 결과물을 지향하는 실무형 작업자입니다.',
      interests: authProfile?.interests ?? '개발, 디자인, 설치/수리',
      avatarUrl: authProfile?.avatar_url ?? '',
      pointBalance: authProfile?.point_balance ?? 12450,
      createdAt: authProfile?.created_at ?? null,
    }),
    [authProfile],
  )
  const isSellerRegistered = Boolean(authProfile?.is_seller) || authProfile?.seller_status === 'active'
  const isAdmin = isAdminProfile(authProfile)
  const { tier } = useUserTier({ userId: user?.id, profile: authProfile })
  const canAccessSellerDashboard = isSellerRegistered
  const sellerActionLabel = '판매자 대시보드'
  const hasProfileMeta = isAdmin

  const activity = {
    orderCount: 17,
    reviewCount: 24,
    points: 12450,
  }

  const openPasswordModal = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      passwordConfirm: '',
    })
    setPasswordError('')
    setPasswordNotice('')
    setIsPasswordEditOpen(true)
  }

  useEffect(() => {
    const nextState = location.state ?? {}
    if (nextState.openProfileEdit) {
      setIsEditOpen(true)
    }
    if (nextState.openPasswordModal) {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        passwordConfirm: '',
      })
      setPasswordError('')
      setPasswordNotice('')
      setIsPasswordEditOpen(true)
    }
    if (nextState.openProfileEdit || nextState.openPasswordModal) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    const nextState = location.state ?? {}
    if (nextState.openPointCharge) {
      setActiveTab('points')
      setShouldFocusCharge(true)
      navigate(`${location.pathname}?tab=points`, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab === 'activity' || tab === 'orders') {
      setActiveTab('pointHistory')
      return
    }
    if (tab && profileTabs.some((item) => item.key === tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      setPointLogRows([])
      setPointLogTotalPages(1)
      return undefined
    }
    setIsPointLogLoading(true)
    fetchPointLogsPaged({
      userId: user.id,
      page: pointLogPage,
      pageSize: 10,
      filter: pointLogFilter,
    }).then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        setPointChargeMessage(error.message ?? '포인트 내역을 불러오지 못했습니다.')
        setPointLogRows([])
        setPointLogTotalPages(1)
        return
      }
      setPointLogRows(data?.rows ?? [])
      setPointLogTotalPages(Math.max(1, Number(data?.totalPages ?? 1)))
    }).finally(() => {
      if (mounted) setIsPointLogLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [pointLogFilter, pointLogPage, user?.id])

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      setWithdrawEligibility({ eligible: false, minRequired: 1000, pointBalance: 0 })
      return undefined
    }
    checkPointWithdrawEligibility({ userId: user.id }).then(({ data }) => {
      if (!mounted || !data) return
      setWithdrawEligibility(data)
    })
    return () => {
      mounted = false
    }
  }, [user?.id, profile.pointBalance])

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      setFavoriteSellers([])
      setFavoriteServices([])
      setFavoriteSellerIds([])
      return undefined
    }

    setIsFavoritesLoading(true)
    fetchFavoritesByUser({ userId: user.id })
      .then(async ({ data, error }) => {
        if (!mounted || error) return
        const sellerIds = (data ?? [])
          .filter((item) => item.targetType === 'seller')
          .map((item) => String(item.targetId))
        const serviceIds = (data ?? [])
          .filter((item) => item.targetType === 'service')
          .map((item) => String(item.targetId))
        setFavoriteSellerIds(sellerIds)

        const [sellersResult, servicesResult] = await Promise.all([
          fetchSellersByProfileIds(sellerIds),
          fetchServicesByIds(serviceIds),
        ])
        if (!mounted) return
        setFavoriteSellers(sellersResult.data ?? [])
        setFavoriteServices(servicesResult.data ?? [])
      })
      .finally(() => {
        if (mounted) setIsFavoritesLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [user?.id])

  const moveTab = (tab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(location.search)
    params.set('tab', tab)
    navigate(`${location.pathname}?${params.toString()}`, { replace: true })
  }

  const handlePointFilterChange = (nextFilter) => {
    setPointLogFilter(nextFilter)
    setPointLogPage(1)
  }

  const handleToggleSellerFavorite = async (seller) => {
    if (!user?.id || !seller?.id) return
    const { data, error } = await toggleFavorite({
      userId: user.id,
      targetType: 'seller',
      targetId: String(seller.id),
    })
    if (error) {
      setSaveToast(error.message ?? '찜 상태를 변경하지 못했습니다.')
      setTimeout(() => setSaveToast(''), 2200)
      return
    }
    const nextIds = data?.isFavorite
      ? Array.from(new Set([...favoriteSellerIds, String(seller.id)]))
      : favoriteSellerIds.filter((id) => id !== String(seller.id))
    setFavoriteSellerIds(nextIds)
    if (!data?.isFavorite) {
      setFavoriteSellers((prev) => prev.filter((item) => String(item.id) !== String(seller.id)))
    }
  }

  const handlePasswordSave = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordNotice('')

    if (!user?.email) {
      setPasswordError('로그인 정보가 확인되지 않습니다.')
      return
    }
    if (!passwordForm.currentPassword) {
      setPasswordError('현재 비밀번호를 입력해 주세요.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.passwordConfirm) {
      setPasswordError('새 비밀번호가 일치하지 않습니다')
      return
    }
    if (!passwordRegex.test(passwordForm.newPassword)) {
      setPasswordError('새 비밀번호는 8자 이상, 영문+숫자를 포함해야 합니다.')
      return
    }

    try {
      setIsSavingPassword(true)
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      })
      if (verifyError) throw new Error('현재 비밀번호가 올바르지 않습니다')

      const { error: updateError } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
      if (updateError) throw new Error(updateError.message)

      setPasswordNotice('비밀번호가 변경되었습니다.')
      setPasswordForm({ currentPassword: '', newPassword: '', passwordConfirm: '' })
      setTimeout(() => {
        setIsPasswordEditOpen(false)
        setPasswordNotice('')
      }, 900)
    } catch (error) {
      setPasswordError(error?.message ?? '비밀번호 변경 중 문제가 발생했습니다.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handlePointCharge = async (amount) => {
    const isAuthenticated = requireAuth({
      reason: '포인트 충전은 로그인 후 이용할 수 있습니다.',
    })
    if (!isAuthenticated) return

    if (!user?.id) {
      setPointChargeMessage('사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
      return
    }

    const safeAmount = Math.max(0, Number(amount ?? 0))
    if (!safeAmount) {
      setPointChargeMessage('충전 금액을 선택해 주세요.')
      return
    }

    setIsChargingPoints(true)
    setPointChargeMessage('')
    const { error } = await applyTestPointCharge({ userId: user.id, amount: safeAmount })
    await refreshProfile()
    const logsResult = await fetchPointLogsPaged({
      userId: user.id,
      page: 1,
      pageSize: 10,
      filter: pointLogFilter,
    })
    setPointLogPage(1)
    setPointLogRows(logsResult.data?.rows ?? [])
    setPointLogTotalPages(Math.max(1, Number(logsResult.data?.totalPages ?? 1)))
    setIsChargingPoints(false)

    if (error) {
      setPointChargeMessage(error.message ?? '충전 처리 중 오류가 발생했습니다.')
      return
    }
    setPointChargeMessage(`충전 완료: +${safeAmount.toLocaleString()}P`)
    const eligibilityResult = await checkPointWithdrawEligibility({ userId: user.id })
    if (eligibilityResult.data) setWithdrawEligibility(eligibilityResult.data)
  }

  const handlePointWithdraw = async (amount) => {
    const isAuthenticated = requireAuth({
      reason: '포인트 환전은 로그인 후 이용할 수 있습니다.',
    })
    if (!isAuthenticated) return
    if (!user?.id) {
      setPointWithdrawMessage('사용자 정보를 찾을 수 없습니다.')
      return
    }
    setIsPointWithdrawing(true)
    setPointWithdrawMessage('')
    const { error } = await requestPointWithdraw({ userId: user.id, amount })
    await refreshProfile()
    const eligibilityResult = await checkPointWithdrawEligibility({ userId: user.id })
    if (eligibilityResult.data) setWithdrawEligibility(eligibilityResult.data)
    setIsPointWithdrawing(false)
    if (error) {
      setPointWithdrawMessage(error.message ?? '환전 신청에 실패했습니다.')
      return
    }
    setPointWithdrawMessage(`환전 신청 완료: ${Number(amount ?? 0).toLocaleString()}P`)
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>내 프로필</h1>
        <p>거래 성향과 선호 카테고리를 설정해 더 정확한 매칭을 받으세요.</p>
      </section>

      <section className="main-card profile-summary-card enhanced flat">
        <div className="profile-avatar-block">
          <div className="profile-avatar-lg image">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="프로필 이미지 미리보기" />
            ) : (
              <span>{profile.avatar}</span>
            )}
          </div>
        </div>
        <div className="profile-summary-text enhanced">
          <div className="profile-summary-header">
            <div className="profile-status-head">
              <h2 className="profile-nickname-heading profile-status-head__name">{profile.nickname}</h2>
              <div className="profile-status-head__icons">
                <MemberStatusIcon
                  tier={tier}
                  isSeller={isSellerRegistered}
                  className="profile-member-status-icon"
                />
              </div>
            </div>
          </div>
          <p>{profile.intro}</p>
          {hasProfileMeta ? (
            <div className="profile-inline-meta">
              {isAdmin ? <span>관리자</span> : null}
            </div>
          ) : null}
          <div className="profile-summary-actions">
            <button
              type="button"
              className="profile-pill-btn"
              onClick={() => setIsImageEditOpen(true)}
            >
              프로필 이미지 변경
            </button>
            <button type="button" className="profile-pill-btn" onClick={() => setIsEditOpen(true)}>
              내 정보 수정
            </button>
            <button type="button" className="profile-pill-btn" onClick={openPasswordModal}>
              비밀번호 변경
            </button>
            {isAdmin ? (
              <button type="button" className="profile-pill-btn btn-primary seller-dashboard-pill" onClick={() => navigate('/admin')}>
                관리자 전용 페이지
              </button>
            ) : null}
            {!isAdmin && canAccessSellerDashboard ? (
              <button type="button" className="profile-pill-btn btn-primary seller-dashboard-pill" onClick={() => navigate('/seller-dashboard')}>
                {sellerActionLabel}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="main-card profile-tabs-card">
        <div className="profile-tab-list">
          {profileTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => moveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <ProfileTabContent
        tab={activeTab}
        activity={activity}
        pointBalance={Number(profile.pointBalance ?? activity.points)}
        profile={authProfile ?? {}}
        favoriteSellers={favoriteSellers}
        favoriteServices={favoriteServices}
        isFavoritesLoading={isFavoritesLoading}
        onToggleSellerFavorite={handleToggleSellerFavorite}
        favoriteSellerIds={favoriteSellerIds}
        onPointChargeRef={(node) => {
          if (!node || !shouldFocusCharge) return
          node.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setShouldFocusCharge(false)
        }}
        onPointCharge={handlePointCharge}
        isPointCharging={isChargingPoints}
        pointChargeMessage={pointChargeMessage}
        pointUsageRows={pointLogRows}
        pointHistoryFilter={pointLogFilter}
        onPointHistoryFilterChange={handlePointFilterChange}
        pointHistoryPage={pointLogPage}
        pointHistoryTotalPages={pointLogTotalPages}
        onPointHistoryPageChange={setPointLogPage}
        isPointHistoryLoading={isPointLogLoading}
        onPointWithdraw={handlePointWithdraw}
        isPointWithdrawing={isPointWithdrawing}
        pointWithdrawMessage={pointWithdrawMessage}
        canPointWithdraw={withdrawEligibility.eligible}
        pointWithdrawMinRequired={withdrawEligibility.minRequired}
      />

      <ProfileEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={(message) => {
          setSaveToast(message)
          setTimeout(() => setSaveToast(''), 2200)
        }}
      />
      <ProfileImageModal
        isOpen={isImageEditOpen}
        onClose={() => setIsImageEditOpen(false)}
        onSaved={(message) => {
          setSaveToast(message)
          setTimeout(() => setSaveToast(''), 2200)
        }}
      />
      {isPasswordEditOpen ? (
        <div className="profile-edit-overlay settings-modal-overlay" role="presentation">
          <section className="profile-edit-modal settings-modal-card" role="dialog" aria-modal="true">
            <div className="profile-edit-head">
              <h2>비밀번호 변경</h2>
              <button type="button" onClick={() => setIsPasswordEditOpen(false)}>
                ×
              </button>
            </div>
            <form className="profile-edit-form settings-modal-form" onSubmit={handlePasswordSave}>
              <label>
                현재 비밀번호
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                  }
                />
              </label>
              <label>
                새 비밀번호
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                  }
                />
              </label>
              <label>
                새 비밀번호 확인
                <input
                  type="password"
                  value={passwordForm.passwordConfirm}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, passwordConfirm: event.target.value }))
                  }
                />
              </label>
              {passwordError ? <small className="auth-error">{passwordError}</small> : null}
              {passwordNotice ? <small className="auth-notice">{passwordNotice}</small> : null}
              <button type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
      {saveToast ? <div className="toast">{saveToast}</div> : null}
    </div>
  )
}

export default ProfilePage
