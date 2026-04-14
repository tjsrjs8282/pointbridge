import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProfileEditModal from '../components/ProfileEditModal'
import ProfileImageModal from '../components/ProfileImageModal'
import ProfileTabContent from '../components/profile/ProfileTabContent'
import { mockUsers } from '../data/mockUsers'
import useAuth from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const gradeMeta = {
  Bronze: { icon: 'B', label: 'Bronze', roleLabel: '기본 등급' },
  Silver: { icon: 'S', label: 'Silver', roleLabel: '활동 우수' },
  Gold: { icon: 'G', label: 'Gold', roleLabel: '프리미엄' },
}
const profileTabs = [
  { key: 'activity', label: '최근 활동' },
  { key: 'orders', label: '주문내역' },
  { key: 'reviews', label: '리뷰 관리' },
  { key: 'wishlist', label: '찜/관심' },
  { key: 'sales', label: '판매 서비스' },
  { key: 'points', label: '포인트' },
  { key: 'settings', label: '설정' },
]

function ProfilePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { requestSellerOnboarding, profile: authProfile, user } = useAuth()
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
  const [activeTab, setActiveTab] = useState('activity')
  const [shouldFocusCharge, setShouldFocusCharge] = useState(false)
  const profile = useMemo(
    () => ({
      ...mockUsers[0],
      grade: 'Silver',
      name: authProfile?.name ?? mockUsers[0].name,
      nickname:
        authProfile?.nickname ??
        authProfile?.name ??
        mockUsers[0].name,
      role: authProfile?.role ?? mockUsers[0].role,
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
  const grade = gradeMeta[profile.grade] ?? gradeMeta.Bronze
  const isSellerRegistered = Boolean(authProfile?.is_seller) || authProfile?.seller_status === 'active'
  const sellerActionLabel = isSellerRegistered ? '판매자 대시보드 이동' : '판매자 등록'

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
    if (tab && profileTabs.some((item) => item.key === tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  const moveTab = (tab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(location.search)
    params.set('tab', tab)
    navigate(`${location.pathname}?${params.toString()}`, { replace: true })
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

  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">내 프로필</p>
        <h1>내 프로필</h1>
        <p>거래 성향과 선호 카테고리를 설정해 더 정확한 매칭을 받으세요.</p>
      </section>

      <section className="main-card profile-summary-card enhanced">
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
            <h2>{profile.nickname}</h2>
            <span className={`user-grade-badge ${profile.grade.toLowerCase()}`}>
              <em>{grade.icon}</em>
              {grade.label}
            </span>
          </div>
          <p>{profile.intro}</p>
          <div className="profile-inline-meta">
            <span>{profile.role}</span>
            <span>{grade.roleLabel}</span>
            <span>가입일 {profile.createdAt ? String(profile.createdAt).slice(0, 10) : profile.joinedAt}</span>
          </div>
          <div className="profile-summary-actions">
            <button type="button" onClick={() => setIsEditOpen(true)}>
              프로필 편집
            </button>
            <button type="button" onClick={openPasswordModal}>
              비밀번호 변경
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (isSellerRegistered) {
                  navigate('/seller-dashboard')
                  return
                }
                requestSellerOnboarding()
              }}
            >
              {sellerActionLabel}
            </button>
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
        onPointChargeRef={(node) => {
          if (!node || !shouldFocusCharge) return
          node.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setShouldFocusCharge(false)
        }}
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
