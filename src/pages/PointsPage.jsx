import { useEffect, useMemo, useState } from 'react'
import PointChargePromoBanner from '../components/PointChargePromoBanner'
import PrimaryButton from '../components/PrimaryButton'
import SectionTitle from '../components/SectionTitle'
import { POINT_CHARGE_INCREMENTS, parseNonNegativeInt } from '../data/pointChargeUi'
import { mockEarningHistory, mockPointSummary, mockUsageHistory } from '../data/mockPointHistory'
import useAuth from '../hooks/useAuth'
import { applyTestPointCharge, fetchPointTransactions, stripPointLogDescriptionForDisplay } from '../lib/points'

function PointsPage() {
  const { requireAuth, user, profile, refreshProfile } = useAuth()
  const [chargeInput, setChargeInput] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)

  const parsedChargeAmount = useMemo(() => parseNonNegativeInt(chargeInput), [chargeInput])
  const chargeCta =
    parsedChargeAmount > 0 ? `${parsedChargeAmount.toLocaleString()}P 충전하기` : '충전하기'

  const currentPoint = Number(profile?.point_balance ?? mockPointSummary.current)
  const usageRows = useMemo(
    () =>
      transactions
        .filter((item) => ['use', 'debit'].includes(String(item.type ?? '').toLowerCase()))
        .slice(0, 8),
    [transactions],
  )
  const earningRows = useMemo(
    () =>
      transactions
        .filter((item) => {
          const type = String(item.type ?? '').toLowerCase()
          return ['charge', 'credit', 'reward', 'refund', 'adjustment'].includes(type)
        })
        .slice(0, 8),
    [transactions],
  )

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      queueMicrotask(() => {
        if (!mounted) return
        setTransactions([])
        setIsLoadingTransactions(false)
      })
      return () => {
        mounted = false
      }
    }
    queueMicrotask(() => {
      if (!mounted) return
      setIsLoadingTransactions(true)
    })
    fetchPointTransactions({ userId: user.id })
      .then(({ data }) => {
        if (!mounted) return
        setTransactions(data ?? [])
      })
      .finally(() => {
        if (mounted) setIsLoadingTransactions(false)
      })
    return () => {
      mounted = false
    }
  }, [user?.id])

  const handleTestCharge = async () => {
    const isAuthenticated = requireAuth({
      reason: '포인트 충전은 로그인 후 이용할 수 있습니다.',
    })
    if (!isAuthenticated) return
    if (!parsedChargeAmount || parsedChargeAmount <= 0) {
      setStatusMessage('충전할 포인트를 1P 이상 입력해 주세요.')
      return
    }
    if (!user?.id) {
      setStatusMessage('사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
      return
    }

    setIsSubmitting(true)
    setStatusMessage('')
    const { error } = await applyTestPointCharge({
      userId: user.id,
      amount: parsedChargeAmount,
    })
    await refreshProfile()
    const transactionResult = await fetchPointTransactions({ userId: user.id })
    setTransactions(transactionResult.data ?? [])
    setIsSubmitting(false)
    if (error) {
      setStatusMessage(error.message ?? '테스트 충전 중 오류가 발생했습니다.')
      return
    }
    setStatusMessage(`테스트 충전 완료: +${parsedChargeAmount.toLocaleString()}P`)
  }

  const renderTransactionDate = (value) => {
    const date = new Date(value ?? '')
    if (Number.isNaN(date.getTime())) return '-'
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>포인트</h1>
        <p className="muted muted-tight">보유 포인트와 충전·내역을 한곳에서 관리합니다.</p>
      </section>

      <section className="main-card profile-points-charge-section profile-points-charge-section--compact">
        <PointChargePromoBanner />

        <div className="points-balance-compact">
          <span className="points-balance-compact-label">보유 포인트</span>
          <strong className="points-balance-compact-value">{currentPoint.toLocaleString()}P</strong>
        </div>

        <div className="profile-point-charge-card profile-point-charge-card--flush">
          <p className="muted muted-tight">테스트 즉시 충전 · 금액은 누적 · 초기화로 0으로 초기화</p>
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
              <span className="points-charge-field-label" id="standalone-point-charge-input-label">
                직접 입력
              </span>
              <div className="points-charge-input-row points-charge-input-row--actions">
                <input
                  id="standalone-point-charge-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={chargeInput}
                  onChange={(event) => setChargeInput(event.target.value)}
                  placeholder="0"
                  aria-labelledby="standalone-point-charge-input-label"
                />
                <button type="button" className="points-charge-reset-btn" onClick={() => setChargeInput('')}>
                  초기화
                </button>
                <PrimaryButton
                  className="points-inline-charge-btn"
                  onClick={handleTestCharge}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '처리 중...' : chargeCta}
                </PrimaryButton>
              </div>
            </div>
            {statusMessage ? <p className="muted muted-tight">{statusMessage}</p> : null}
          </div>
        </div>
      </section>

      <section className="main-card">
        <SectionTitle title="포인트 사용 내역" />
        <div className="points-history-list">
          {isLoadingTransactions ? (
            <p className="muted">포인트 내역을 불러오는 중입니다...</p>
          ) : usageRows.length === 0 ? (
            mockUsageHistory.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.date}</p>
                </div>
                <strong className="minus">{item.points.toLocaleString()}P</strong>
              </article>
            ))
          ) : (
            usageRows.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{stripPointLogDescriptionForDisplay(item.description) || '포인트 사용'}</h3>
                  <p>{renderTransactionDate(item.created_at)}</p>
                </div>
                <strong className="minus">-{Number(item.amount ?? 0).toLocaleString()}P</strong>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="main-card">
        <SectionTitle title="포인트 적립 내역" />
        <div className="points-history-list">
          {isLoadingTransactions ? (
            <p className="muted">포인트 내역을 불러오는 중입니다...</p>
          ) : earningRows.length === 0 ? (
            mockEarningHistory.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.date}</p>
                </div>
                <strong className="plus">+{item.points.toLocaleString()}P</strong>
              </article>
            ))
          ) : (
            earningRows.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{stripPointLogDescriptionForDisplay(item.description) || '포인트 적립'}</h3>
                  <p>{renderTransactionDate(item.created_at)}</p>
                </div>
                <strong className="plus">+{Number(item.amount ?? 0).toLocaleString()}P</strong>
              </article>
            ))
          )}
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
