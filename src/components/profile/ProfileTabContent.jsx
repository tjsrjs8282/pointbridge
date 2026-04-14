import { useMemo, useState } from 'react'
import PrimaryButton from '../PrimaryButton'
import SectionTitle from '../SectionTitle'

function ProfileTabContent({
  tab,
  activity,
  pointBalance,
  profile,
  onPointChargeRef,
}) {
  const [selectedAmount, setSelectedAmount] = useState(10000)
  const [customAmount, setCustomAmount] = useState('')
  const quickAmounts = [1000, 3000, 5000, 10000, 50000]
  const chargedAmount = useMemo(() => {
    if (customAmount) return Number(customAmount || 0)
    return selectedAmount
  }, [customAmount, selectedAmount])

  if (tab === 'orders') {
    return (
      <section className="main-card">
        <h2>주문내역</h2>
        <p className="muted">주문내역 상세는 기존 주문 화면과 동일한 흐름으로 유지됩니다.</p>
        <div className="profile-activity-grid">
          <article>
            <h3>진행중</h3>
            <p>{Math.max(1, Math.floor(activity.orderCount / 3))}건</p>
          </article>
          <article>
            <h3>완료</h3>
            <p>{Math.max(1, Math.floor(activity.orderCount / 2))}건</p>
          </article>
          <article>
            <h3>취소</h3>
            <p>{Math.max(0, Math.floor(activity.orderCount / 10))}건</p>
          </article>
        </div>
      </section>
    )
  }

  if (tab === 'reviews') {
    return (
      <section className="main-card">
        <h2>리뷰 관리</h2>
        <p className="muted">완료 주문 기준 리뷰 상태를 확인하고 후기를 관리합니다.</p>
        <div className="profile-activity-grid">
          <article>
            <h3>작성한 리뷰</h3>
            <p>{activity.reviewCount}건</p>
          </article>
          <article>
            <h3>작성 대기</h3>
            <p>{Math.max(0, Math.floor(activity.orderCount / 6))}건</p>
          </article>
          <article>
            <h3>평균 평점</h3>
            <p>{Number(profile?.review_avg ?? 0).toFixed(1)}</p>
          </article>
        </div>
      </section>
    )
  }

  if (tab === 'wishlist') {
    return (
      <section className="main-card">
        <h2>찜 / 관심</h2>
        <p className="muted">자주 보는 판매자와 관심 카테고리를 한 곳에서 관리합니다.</p>
        <div className="chip-grid">
          <span>{profile?.interests || '관심 카테고리를 설정해보세요.'}</span>
        </div>
      </section>
    )
  }

  if (tab === 'sales') {
    return (
      <section className="main-card">
        <h2>판매 서비스</h2>
        {profile?.is_seller ? (
          <>
            <p className="muted">판매 중인 서비스 관리는 판매자 대시보드에서 계속 진행합니다.</p>
          </>
        ) : (
          <p className="muted">판매자 등록 후 서비스 등록/수정이 가능합니다.</p>
        )}
      </section>
    )
  }

  if (tab === 'settings') {
    return (
      <section className="main-card">
        <h2>설정</h2>
        <p className="muted">알림, 테마, 계정 관련 설정은 이 탭에서 관리할 수 있도록 통합 중입니다.</p>
      </section>
    )
  }

  if (tab === 'points') {
    return (
      <section className="main-card">
        <h2>포인트</h2>
        <p className="muted">현재 보유 포인트와 적립 흐름을 확인합니다.</p>
        <div className="profile-activity-grid">
          <article>
            <h3>보유 포인트</h3>
            <p>{pointBalance.toLocaleString()}P</p>
          </article>
          <article>
            <h3>이번 달 적립</h3>
            <p>{Math.max(0, Math.floor(pointBalance * 0.16)).toLocaleString()}P</p>
          </article>
          <article>
            <h3>사용 예정</h3>
            <p>{Math.max(0, Math.floor(pointBalance * 0.07)).toLocaleString()}P</p>
          </article>
        </div>
        <div className="profile-point-charge-card" ref={onPointChargeRef}>
          <SectionTitle title="충전하기" />
          <div className="points-charge-panel">
            <div className="points-quick-amounts">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={selectedAmount === amount && !customAmount ? 'active' : ''}
                  onClick={() => {
                    setSelectedAmount(amount)
                    setCustomAmount('')
                  }}
                >
                  {amount.toLocaleString()}P
                </button>
              ))}
            </div>

            <label>
              직접 입력
              <input
                type="number"
                value={customAmount}
                onChange={(event) => {
                  const value = event.target.value
                  setCustomAmount(value)
                }}
                placeholder="충전할 포인트를 입력하세요"
              />
            </label>

            <PrimaryButton className="points-submit-btn">
              {Math.max(0, chargedAmount).toLocaleString()}P 결제하기
            </PrimaryButton>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="main-card">
      <h2>최근 활동</h2>
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
          <p>{pointBalance.toLocaleString()}P</p>
        </article>
      </div>
    </section>
  )
}

export default ProfileTabContent
