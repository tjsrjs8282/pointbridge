import { useMemo, useState } from 'react'
import ProfileEditModal from '../components/ProfileEditModal'
import ProfileImageModal from '../components/ProfileImageModal'
import { mockUsers } from '../data/mockUsers'
import useAuth from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const gradeMeta = {
  Bronze: { icon: 'B', label: 'Bronze', roleLabel: '기본 등급' },
  Silver: { icon: 'S', label: 'Silver', roleLabel: '활동 우수' },
  Gold: { icon: 'G', label: 'Gold', roleLabel: '프리미엄' },
}

function ProfilePage() {
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
          <button type="button" className="profile-image-upload-btn" onClick={() => setIsImageEditOpen(true)}>
            프로필 사진 변경
          </button>
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
            <button type="button" onClick={() => setIsImageEditOpen(true)}>
              프로필 이미지 변경
            </button>
            <button type="button" onClick={() => setIsEditOpen(true)}>
              프로필 편집
            </button>
          </div>
        </div>
      </section>

      <section className="main-card">
        <h2>프로필 정보</h2>
        <div className="profile-info-grid">
          <article>
            <h3>한줄 소개</h3>
            <p>{profile.intro}</p>
          </article>
          <article>
            <h3>역할</h3>
            <p>{profile.role}</p>
          </article>
          <article>
            <h3>이름</h3>
            <p>{profile.name}</p>
          </article>
          <article>
            <h3>이메일</h3>
            <p>{profile.email}</p>
          </article>
          <article>
            <h3>연락처</h3>
            <p>{profile.phone}</p>
          </article>
          <article>
            <h3>주소</h3>
            <p>
              {profile.address}
              {profile.addressDetail ? ` ${profile.addressDetail}` : ''}
            </p>
          </article>
          <article>
            <h3>활동 지역</h3>
            <p>{profile.region}</p>
          </article>
          <article>
            <h3>관심 카테고리</h3>
            <p>{profile.interests}</p>
          </article>
        </div>
      </section>

      <section className="main-card settings-card profile-account-section">
        <h2>계정 관련</h2>
        <div className="settings-account-actions">
          <button type="button" className="btn-secondary" onClick={openPasswordModal}>
            비밀번호 변경
          </button>
          <button type="button" className="btn-primary" onClick={() => setIsEditOpen(true)}>
            프로필 편집
          </button>
        </div>
      </section>

      <section className="main-card">
        <h2>활동 요약</h2>
        <div className="profile-activity-grid">
          <article>
            <h3>주문 수</h3>
            <p>{activity.orderCount}건</p>
          </article>
          <article>
            <h3>리뷰 수</h3>
            <p>{activity.reviewCount}건</p>
          </article>
          <article>
            <h3>보유 포인트</h3>
            <p>{Number(profile.pointBalance ?? activity.points).toLocaleString()}P</p>
          </article>
        </div>
      </section>

      <section className="main-card profile-seller-cta">
        <h3>판매자 모드로 전환해 서비스 등록하기</h3>
        <p>
          보유한 역량으로 서비스를 등록하고 주문을 받아 수익을 만들어보세요.
          판매자 정보 등록 후 바로 시작할 수 있습니다.
        </p>
        <div>
          <button
            type="button"
            onClick={requestSellerOnboarding}
          >
            판매자로 전환
          </button>
          <button
            type="button"
            onClick={requestSellerOnboarding}
          >
            판매자 정보 등록
          </button>
        </div>
      </section>

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
