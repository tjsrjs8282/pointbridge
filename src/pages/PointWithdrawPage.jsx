import { useEffect, useMemo, useState } from 'react'
import PrimaryButton from '../components/PrimaryButton'
import SectionTitle from '../components/SectionTitle'
import useAuth from '../hooks/useAuth'
import { checkPointWithdrawEligibility, requestPointWithdraw } from '../lib/points'

function PointWithdrawPage() {
  const { requireAuth, user, profile, refreshProfile } = useAuth()
  const [selectedAmount, setSelectedAmount] = useState(1000)
  const [customAmount, setCustomAmount] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eligibility, setEligibility] = useState({
    eligible: false,
    pointBalance: Number(profile?.point_balance ?? 0),
    minRequired: 1000,
  })

  const quickAmounts = [1000, 3000, 5000, 10000, 30000]
  const selectedWithdrawAmount = useMemo(() => {
    const raw = customAmount ? Number(customAmount) : selectedAmount
    if (!Number.isFinite(raw)) return 0
    return Math.max(0, Math.round(raw))
  }, [customAmount, selectedAmount])

  useEffect(() => {
    let mounted = true
    if (!user?.id) return undefined
    checkPointWithdrawEligibility({ userId: user.id }).then(({ data, error }) => {
      if (!mounted || error || !data) return
      setEligibility(data)
    })
    return () => {
      mounted = false
    }
  }, [user?.id, profile?.point_balance])

  const handleWithdrawRequest = async () => {
    const isAuthenticated = requireAuth({
      reason: '포인트 환전은 로그인 후 이용할 수 있습니다.',
    })
    if (!isAuthenticated) return
    if (!user?.id) {
      setStatusMessage('사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.')
      return
    }
    setIsSubmitting(true)
    setStatusMessage('')
    const { data, error } = await requestPointWithdraw({
      userId: user.id,
      amount: selectedWithdrawAmount,
    })
    setIsSubmitting(false)
    if (error) {
      setStatusMessage(error.message ?? '환전 신청에 실패했습니다.')
      return
    }
    await refreshProfile()
    setEligibility((prev) => ({
      ...prev,
      pointBalance: Number(data?.profile?.point_balance ?? prev.pointBalance),
      eligible: Number(data?.profile?.point_balance ?? prev.pointBalance) >= prev.minRequired,
    }))
    setStatusMessage(`환전 신청 완료: ${selectedWithdrawAmount.toLocaleString()}P`)
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>포인트 환전</h1>
        <p>충전 화면과 동일한 톤으로 환전 신청을 진행할 수 있습니다.</p>
      </section>

      <section className="main-card">
        <SectionTitle title="환전 신청" />
        <p className="muted">1,000P 이상부터 환전 가능합니다.</p>

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
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder="환전할 포인트를 입력하세요"
            />
          </label>

          <PrimaryButton
            className="points-submit-btn"
            onClick={handleWithdrawRequest}
            disabled={isSubmitting || !eligibility.eligible}
          >
            {isSubmitting
              ? '환전 신청 중...'
              : `${selectedWithdrawAmount.toLocaleString()}P 환전하기`}
          </PrimaryButton>
          {!eligibility.eligible ? <p className="muted">1,000P 이상부터 환전 가능합니다.</p> : null}
          {statusMessage ? <p className="muted">{statusMessage}</p> : null}
        </div>
      </section>
    </div>
  )
}

export default PointWithdrawPage
