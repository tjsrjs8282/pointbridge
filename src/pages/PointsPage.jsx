import { useState } from 'react'
import PointCard from '../components/PointCard'
import PrimaryButton from '../components/PrimaryButton'
import SectionTitle from '../components/SectionTitle'
import { mockEarningHistory, mockPointSummary, mockUsageHistory } from '../data/mockPointHistory'
import useAuth from '../hooks/useAuth'

function PointsPage() {
  const { requireAuth } = useAuth()
  const [selectedAmount, setSelectedAmount] = useState(10000)
  const [customAmount, setCustomAmount] = useState('')

  const quickAmounts = [5000, 10000, 30000, 50000]

  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">포인트</p>
        <h1>포인트</h1>
        <p>사용 가능한 포인트와 최근 적립/사용 내역입니다.</p>
      </section>

      <PointCard
        title="현재 보유 포인트"
        value={`${mockPointSummary.current.toLocaleString()}P`}
        subValue={`사용 가능 ${mockPointSummary.available.toLocaleString()}P`}
        action={
          <PrimaryButton
            className="points-charge-btn"
            onClick={() =>
              requireAuth({
                reason: '포인트 충전은 로그인 후 이용할 수 있습니다.',
              })
            }
          >
            포인트 충전
          </PrimaryButton>
        }
      />

      <section className="main-card">
        <SectionTitle title="충전하기" />
        <div className="points-charge-panel">
          <div className="points-quick-amounts">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                className={selectedAmount === amount ? 'active' : ''}
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
                if (value) setSelectedAmount(Number(value))
              }}
              placeholder="충전할 포인트를 입력하세요"
            />
          </label>

          <PrimaryButton
            className="points-submit-btn"
            onClick={() =>
              requireAuth({
                reason: '포인트 충전은 로그인 후 이용할 수 있습니다.',
              })
            }
          >
            {selectedAmount.toLocaleString()}P 충전하기
          </PrimaryButton>
        </div>
      </section>

      <section className="main-card">
        <SectionTitle title="포인트 사용 내역" />
        <div className="points-history-list">
          {mockUsageHistory.map((item) => (
            <article key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.date}</p>
              </div>
              <strong className="minus">{item.points.toLocaleString()}P</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="main-card">
        <SectionTitle title="포인트 적립 내역" />
        <div className="points-history-list">
          {mockEarningHistory.map((item) => (
            <article key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.date}</p>
              </div>
              <strong className="plus">+{item.points.toLocaleString()}P</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="main-card points-locked-card">
        <h3>주문으로 묶여 있는 포인트</h3>
        <p>
          현재 진행 중 주문 2건으로{' '}
          <strong>{mockPointSummary.locked.toLocaleString()}P</strong>가 임시 보류 상태입니다.
          작업 완료 후 자동 정산됩니다.
        </p>
      </section>
    </div>
  )
}

export default PointsPage
