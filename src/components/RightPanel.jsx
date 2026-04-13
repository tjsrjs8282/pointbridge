import useAuth from '../hooks/useAuth'

function RightPanel() {
  const { profile, user } = useAuth()
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

  return (
    <aside className="right-panel">
      <section className="panel-card">
        <h3>알림 / 메시지</h3>
        <div className="quick-meta">
          <span>알림</span>
          <strong>3건</strong>
        </div>
        <div className="quick-meta">
          <span>메시지</span>
          <strong>5건</strong>
        </div>
      </section>

      <section className="panel-card gradient">
        <p>보유 포인트</p>
        <h2>12,450P</h2>
        <span>이번 달 +1,220P</span>
      </section>

      <section className="panel-card">
        <h3>내 프로필</h3>
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
      </section>

      <section className="panel-card">
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
  )
}

export default RightPanel
