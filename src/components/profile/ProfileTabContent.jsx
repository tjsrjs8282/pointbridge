import { useMemo, useState } from 'react'
import CommunityPagination from '../community/CommunityPagination'
import PrimaryButton from '../PrimaryButton'
import SectionTitle from '../SectionTitle'
import SellerCard from '../SellerCard'
import ServiceCard from '../ServiceCard'
import PointChargePromoBanner from '../PointChargePromoBanner'
import { POINT_CHARGE_INCREMENTS, parseNonNegativeInt } from '../../data/pointChargeUi'
import { stripPointLogDescriptionForDisplay } from '../../lib/points'

const WITHDRAW_QUICK_AMOUNTS = [1000, 3000, 5000, 10000, 50000]

function ProfileTabContent({
  tab,
  activity,
  pointBalance,
  profile,
  onPointChargeRef,
  onPointCharge,
  isPointCharging = false,
  pointChargeMessage = '',
  pointUsageRows = [],
  pointHistoryFilter = '1y',
  onPointHistoryFilterChange,
  pointHistoryPage = 1,
  pointHistoryTotalPages = 1,
  onPointHistoryPageChange,
  isPointHistoryLoading = false,
  onPointWithdraw,
  isPointWithdrawing = false,
  pointWithdrawMessage = '',
  canPointWithdraw = false,
  pointWithdrawMinRequired = 1000,
  favoriteSellers = [],
  favoriteServices = [],
  isFavoritesLoading = false,
  onToggleSellerFavorite,
  favoriteSellerIds = [],
}) {
  const [chargeInput, setChargeInput] = useState('')
  const [withdrawPreset, setWithdrawPreset] = useState(10000)
  const [withdrawCustom, setWithdrawCustom] = useState('')
  const withdrawChargedAmount = useMemo(() => {
    if (withdrawCustom) return parseNonNegativeInt(withdrawCustom)
    return withdrawPreset
  }, [withdrawCustom, withdrawPreset])
  const parsedChargeAmount = useMemo(() => parseNonNegativeInt(chargeInput), [chargeInput])
  const mockPointUsageHistory = [
    { id: 'mock-usage-1', amount: 50000, created_at: new Date().toISOString(), description: '포인트 충전' },
    { id: 'mock-usage-2', amount: -3000, created_at: new Date().toISOString(), description: '홍길동 서비스 이용' },
    { id: 'mock-usage-3', amount: 12000, created_at: new Date().toISOString(), description: '서비스 판매 완료' },
  ]
  const historyRows = pointUsageRows.length > 0 ? pointUsageRows : mockPointUsageHistory
  const rangeFilters = [
    { key: '7d', label: '일주일' },
    { key: '1m', label: '1개월' },
    { key: '3m', label: '3개월' },
    { key: '6m', label: '6개월' },
    { key: '1y', label: '1년' },
    { key: 'all', label: '전체' },
  ]

  if (tab === 'pointHistory') {
    return (
      <section className="main-card">
        <h2>포인트 사용 내역</h2>
        <p className="muted">날짜별 포인트 흐름을 간결하게 확인할 수 있습니다.</p>

        <div className="point-history-filter-row">
          {rangeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={pointHistoryFilter === filter.key ? 'active' : ''}
              onClick={() => onPointHistoryFilterChange?.(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isPointHistoryLoading ? <p className="muted">포인트 내역을 불러오는 중입니다...</p> : null}

        <div className="points-history-list profile-point-history-list simple-list">
          {historyRows.map((item) => {
            const amount = Number(item.amount ?? 0)
            const isMinus = amount < 0
            const title =
              stripPointLogDescriptionForDisplay(item.description) ||
              (isMinus ? '서비스 이용' : '포인트 적립')
            return (
              <article key={item.id}>
                <div className="point-history-left">
                  <p>{item.created_at ? String(item.created_at).slice(0, 10) : '-'}</p>
                  <h3>{title}</h3>
                </div>
                <strong className={isMinus ? 'minus' : 'plus'}>
                  {isMinus ? '-' : '+'}
                  {Math.abs(amount).toLocaleString()}P
                </strong>
              </article>
            )
          })}
        </div>
        <CommunityPagination
          currentPage={pointHistoryPage}
          totalPages={pointHistoryTotalPages}
          onPageChange={onPointHistoryPageChange}
        />
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
        {isFavoritesLoading ? <p className="muted">찜 목록을 불러오는 중입니다...</p> : null}
        {!isFavoritesLoading && favoriteSellers.length === 0 && favoriteServices.length === 0 ? (
          <>
            <p className="muted">아직 저장된 찜이 없습니다.</p>
            <div className="chip-grid">
              <span>{profile?.interests || '관심 카테고리를 설정해보세요.'}</span>
            </div>
          </>
        ) : null}
        {favoriteSellers.length > 0 ? (
          <>
            <h3>찜한 판매자</h3>
            <div className="sellers-grid">
              {favoriteSellers.map((seller) => (
                <SellerCard
                  key={seller.id}
                  seller={seller}
                  canFavorite
                  isFavorite={favoriteSellerIds.includes(String(seller.id))}
                  onToggleFavorite={onToggleSellerFavorite}
                />
              ))}
            </div>
          </>
        ) : null}
        {favoriteServices.length > 0 ? (
          <>
            <h3>찜한 서비스</h3>
            <div className="seller-service-list">
              {favoriteServices.map((service) => (
                <ServiceCard key={service.id} service={service} canOrder={false} />
              ))}
            </div>
          </>
        ) : null}
      </section>
    )
  }

  if (tab === 'sales') {
    return (
      <section className="main-card">
        <h2>판매 서비스</h2>
        {profile?.is_seller ? (
          <>
            <p className="muted">판매 중인 서비스 관리는 판매자 프로필의 제공 서비스 영역에서 진행합니다.</p>
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
    const chargeCta =
      parsedChargeAmount > 0
        ? `${parsedChargeAmount.toLocaleString()}P 충전하기`
        : '충전하기'

    return (
      <section className="main-card profile-points-charge-section profile-points-charge-section--compact">
        <h2>포인트 충전</h2>
        <p className="muted muted-tight">금액 버튼은 입력란에 누적됩니다. 초기화로 0으로 돌릴 수 있습니다.</p>

        <PointChargePromoBanner />

        <div className="points-balance-compact">
          <span className="points-balance-compact-label">보유 포인트</span>
          <strong className="points-balance-compact-value">{pointBalance.toLocaleString()}P</strong>
        </div>

        <div className="profile-point-charge-card profile-point-charge-card--flush" ref={onPointChargeRef}>
          <div className="points-charge-panel compact">
            <div className="points-quick-amounts charge-increments">
              {POINT_CHARGE_INCREMENTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setChargeInput((prev) => {
                      const base = parseNonNegativeInt(prev)
                      return String(base + amount)
                    })
                  }}
                >
                  +{amount.toLocaleString()}P
                </button>
              ))}
            </div>

            <div className="points-charge-field">
              <span className="points-charge-field-label" id="profile-point-charge-input-label">
                직접 입력
              </span>
              <div className="points-charge-input-row points-charge-input-row--actions">
                <input
                  id="profile-point-charge-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={chargeInput}
                  onChange={(event) => setChargeInput(event.target.value)}
                  placeholder="0"
                  aria-labelledby="profile-point-charge-input-label"
                />
                <button
                  type="button"
                  className="points-charge-reset-btn"
                  onClick={() => setChargeInput('')}
                >
                  초기화
                </button>
                <PrimaryButton
                  className="points-inline-charge-btn"
                  onClick={() => onPointCharge?.(parsedChargeAmount)}
                  disabled={isPointCharging}
                >
                  {isPointCharging ? '처리 중...' : chargeCta}
                </PrimaryButton>
              </div>
            </div>
            {pointChargeMessage ? <p className="muted muted-tight">{pointChargeMessage}</p> : null}
          </div>
        </div>
      </section>
    )
  }

  if (tab === 'pointWithdraw') {
    return (
      <section className="main-card">
        <h2>포인트 환전</h2>
        <p className="muted">포인트 충전과 동일한 흐름으로 환전 신청할 수 있습니다.</p>
        <div className="profile-point-charge-card" ref={onPointChargeRef}>
          <SectionTitle title="환전하기" />
          <div className="points-charge-panel">
            <div className="points-quick-amounts">
              {WITHDRAW_QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={withdrawPreset === amount && !withdrawCustom ? 'active' : ''}
                  onClick={() => {
                    setWithdrawPreset(amount)
                    setWithdrawCustom('')
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
                value={withdrawCustom}
                onChange={(event) => {
                  const value = event.target.value
                  setWithdrawCustom(value)
                }}
                placeholder="환전할 포인트를 입력하세요"
              />
            </label>

            <PrimaryButton
              className="points-submit-btn"
              onClick={() => onPointWithdraw?.(Math.max(0, withdrawChargedAmount))}
              disabled={isPointWithdrawing || !canPointWithdraw}
            >
              {isPointWithdrawing ? '환전 신청 중...' : `${Math.max(0, withdrawChargedAmount).toLocaleString()}P 환전하기`}
            </PrimaryButton>
            {!canPointWithdraw ? <p className="muted">{pointWithdrawMinRequired.toLocaleString()}P 이상부터 환전 가능합니다.</p> : null}
            {pointWithdrawMessage ? <p className="muted">{pointWithdrawMessage}</p> : null}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="main-card">
      <h2>포인트 사용 내역</h2>
      <div className="profile-activity-grid">
        <article>
          <h3>보유 포인트</h3>
          <p>{pointBalance.toLocaleString()}P</p>
        </article>
        <article>
          <h3>리뷰 수</h3>
          <p>{activity.reviewCount}건</p>
        </article>
        <article>
          <h3>관심 판매자</h3>
          <p>{favoriteSellers.length}명</p>
        </article>
      </div>
    </section>
  )
}

export default ProfileTabContent
