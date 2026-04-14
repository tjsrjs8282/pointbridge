import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function RightPanel() {
  const navigate = useNavigate()
  const { profile, user, requireAuth, requestSellerOnboarding } = useAuth()
  const grade = 'Silver'
  const gradeMeta = {
    Bronze: { icon: 'B', label: 'Bronze' },
    Silver: { icon: 'S', label: 'Silver' },
    Gold: { icon: 'G', label: 'Gold' },
  }
  const selectedGrade = gradeMeta[grade]

  const nickname =
    profile?.nickname ??
    profile?.name ??
    user?.user_metadata?.nickname ??
    user?.user_metadata?.name ??
    user?.email?.split('@')?.[0] ??
    '사용자'
  const avatarText = nickname.slice(0, 2).toUpperCase()
  const roleLabel = profile?.role ?? '구매자/판매자'
  const avatarUrl = profile?.avatar_url ?? ''
  const pointBalance = Number(profile?.point_balance ?? 0)
  const isSellerRegistered = Boolean(profile?.is_seller) || profile?.seller_status === 'active'
  const sellerActionLabel = isSellerRegistered ? '판매 목록 편집' : '판매자 등록'
  const goWithAuth = ({ to, reason, state }) => {
    requireAuth({
      reason,
      onSuccess: () => navigate(to, state ? { state } : undefined),
    })
  }
  const handleSellerAction = () => {
    requireAuth({
      reason: '판매자 기능은 로그인 후 이용할 수 있습니다.',
      onSuccess: () => {
        if (isSellerRegistered) {
          navigate('/seller-dashboard')
          return
        }
        requestSellerOnboarding()
      },
    })
  }

  return (
    <aside className="right-panel">
      <section className="panel-card account-hub-card">
        <p className="badge">내 계정 허브</p>
        <div className="right-profile-row">
          <div className="right-profile-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="내 프로필 이미지" /> : avatarText}
          </div>
          <div>
            <p className="profile-name">{nickname}</p>
            <span className={`user-grade-badge ${grade.toLowerCase()}`}>
              <em>{selectedGrade.icon}</em>
              {selectedGrade.label}
            </span>
            <p className="profile-role">{roleLabel}</p>
          </div>
        </div>
        <div className="account-point-block">
          <div className="account-point-head">
            <span>보유 포인트</span>
            <button
              type="button"
              className="account-point-link-btn"
              onClick={() =>
                goWithAuth({
                  to: '/mypage?tab=points',
                  reason: '포인트 충전은 로그인 후 이용할 수 있습니다.',
                  state: { openPointCharge: true },
                })
              }
            >
              충전하기
            </button>
          </div>
          <strong>{pointBalance.toLocaleString()}P</strong>
        </div>
        <div className="account-hub-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              goWithAuth({
                to: '/mypage?tab=activity',
                reason: '마이페이지는 로그인 후 이용할 수 있습니다.',
              })
            }
          >
            마이페이지
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSellerAction}
          >
            {sellerActionLabel}
          </button>
        </div>
      </section>

      <section className="panel-card account-event-banner">
        <p className="badge">이벤트</p>
        <h3>첫 거래 리뷰 작성 시 포인트 2배</h3>
        <p>첫 거래 완료 후 리뷰를 작성하면 보너스 포인트를 2배로 적립해드립니다.</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            goWithAuth({
              to: '/mypage?tab=points',
              reason: '포인트 이벤트 상세는 로그인 후 이용할 수 있습니다.',
            })
          }
        >
          이벤트 보기
        </button>
      </section>
    </aside>
  )
}

export default RightPanel
