import { useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import SectionTitle from '../components/SectionTitle'
import ServiceCard from '../components/ServiceCard'
import SecondaryButton from '../components/SecondaryButton'
import useAuth from '../hooks/useAuth'
import { mockReviews } from '../data/mockReviews'
import { mockSellers } from '../data/mockSellers'
import { mockServices } from '../data/mockServices'

const optionMultipliers = {
  소: 1,
  중: 1.2,
  대: 1.45,
}

function SellerDetailPage() {
  const { id } = useParams()
  const { requireAuth } = useAuth()
  const pointBalance = 12450
  const seller = mockSellers.find((item) => item.id === id) ?? mockSellers[0]
  const sellerServices = mockServices.filter((service) => service.sellerId === seller.id)
  const sellerReviews = mockReviews.filter((review) => review.sellerId === seller.id)
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedOption, setSelectedOption] = useState('소')
  const [requestNote, setRequestNote] = useState('')
  const [schedule, setSchedule] = useState('')
  const [processType, setProcessType] = useState('온라인')
  const [address, setAddress] = useState('')

  const totalPoints = useMemo(() => {
    if (!selectedService) return 0
    return Math.round(selectedService.price * optionMultipliers[selectedOption])
  }, [selectedOption, selectedService])

  const hasEnoughPoints = pointBalance >= totalPoints

  const openOrderModal = (service) => {
    requireAuth({
      reason: '주문 신청은 로그인 후 이용할 수 있습니다.',
      onSuccess: () => {
        setSelectedService(service)
        setSelectedOption(service.option)
        setRequestNote('')
        setSchedule('')
        setProcessType('온라인')
        setAddress('')
        setIsOrderOpen(true)
      },
    })
  }

  return (
    <div className="page-stack">
      <section className="main-card seller-detail-profile">
        <div className="seller-detail-head">
          <div className="seller-detail-avatar">{seller.avatar}</div>
          <div>
            <p className="badge">판매자 상세</p>
            <h1>{seller.name}</h1>
            <p className="seller-detail-category">{seller.category}</p>
          </div>
          <span className={`verify-badge ${seller.verified ? 'on' : ''}`}>
            {seller.verified ? '인증 판매자' : '일반 판매자'}
          </span>
        </div>
        <div className="seller-detail-meta">
          <span>평점 {seller.rating}</span>
          <span>리뷰 {seller.reviewCount}건</span>
          <span>활동지역 {seller.region}</span>
        </div>
        <div className="seller-detail-actions">
          <SecondaryButton
            onClick={() =>
              requireAuth({
                reason: '채팅 시작은 로그인 후 이용할 수 있습니다.',
              })
            }
          >
            채팅 시작
          </SecondaryButton>
        </div>
        <p className="seller-detail-intro">{seller.intro}</p>
      </section>

      <section className="main-card">
        <SectionTitle title="제공 서비스" />
        <div className="seller-service-list">
          {sellerServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onOrder={openOrderModal}
            />
          ))}
        </div>
      </section>

      <section className="main-card">
        <SectionTitle title="리뷰" />
        <div className="seller-review-list">
          {sellerReviews.map((review) => (
            <article key={review.id} className="seller-review-item">
              <div>
                <strong>{review.user}</strong>
                <span>{review.score}</span>
              </div>
              <p>{review.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="main-card seller-summary-grid">
        <article>
          <h3>대표 서비스 수</h3>
          <p>{sellerServices.length}개</p>
        </article>
        <article>
          <h3>평균 응답시간</h3>
          <p>{seller.avgResponse}</p>
        </article>
        <article>
          <h3>누적 작업 수</h3>
          <p>{seller.totalWorks}건</p>
        </article>
      </section>

      {isOrderOpen && selectedService ? (
        <div className="order-modal-overlay" role="presentation">
          <section className="order-modal-card" role="dialog" aria-modal="true">
            <div className="order-modal-head">
              <h2>서비스 주문 신청</h2>
              <SecondaryButton onClick={() => setIsOrderOpen(false)}>
                닫기
              </SecondaryButton>
            </div>

            <div className="order-field">
              <label>선택한 서비스명</label>
              <input value={selectedService.name} readOnly />
            </div>

            <div className="order-grid">
              <div className="order-field">
                <label>옵션 선택</label>
                <select
                  value={selectedOption}
                  onChange={(event) => setSelectedOption(event.target.value)}
                >
                  <option value="소">소</option>
                  <option value="중">중</option>
                  <option value="대">대</option>
                </select>
              </div>
              <div className="order-field">
                <label>일정 선택</label>
                <input
                  type="date"
                  value={schedule}
                  onChange={(event) => setSchedule(event.target.value)}
                />
              </div>
            </div>

            <div className="order-field">
              <label>주소 또는 진행 방식</label>
              <div className="order-type-row">
                <select
                  value={processType}
                  onChange={(event) => setProcessType(event.target.value)}
                >
                  <option value="온라인">온라인</option>
                  <option value="방문">방문</option>
                </select>
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="방문 진행 시 주소를 입력하세요"
                />
              </div>
            </div>

            <div className="order-field">
              <label>요청사항 입력</label>
              <textarea
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                placeholder="필요한 작업 범위와 전달사항을 입력하세요."
              />
            </div>

            <div className="order-total">
              <strong>총 포인트: {totalPoints.toLocaleString()}P</strong>
              <p className={hasEnoughPoints ? 'point-ok' : 'point-low'}>
                보유 포인트 {pointBalance.toLocaleString()}P ·{' '}
                {hasEnoughPoints
                  ? '현재 포인트로 주문 신청 가능합니다.'
                  : '포인트가 부족합니다. 충전 후 진행해 주세요.'}
              </p>
            </div>

            <button type="button" className="order-submit-btn">
              주문 신청
            </button>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default SellerDetailPage
