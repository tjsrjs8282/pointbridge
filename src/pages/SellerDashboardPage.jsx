import { useEffect, useMemo, useState } from 'react'
import useAuth from '../hooks/useAuth'
import {
  createSellerService,
  fetchSellerServicesByUserId,
} from '../lib/marketplace'

const defaultForm = {
  title: '',
  description: '',
  category: '개발',
  pricePoint: '',
}

function SellerDashboardPage() {
  const { user, requireAuth, profile } = useAuth()
  const [form, setForm] = useState(defaultForm)
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const canManageSeller = useMemo(() => {
    return Boolean((profile?.is_seller || profile?.seller_status === 'active') && user?.id)
  }, [profile?.is_seller, profile?.seller_status, user?.id])

  const loadServices = async () => {
    if (!user?.id) {
      setServices([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const { data, error } = await fetchSellerServicesByUserId(user.id)
    if (error) {
      setStatusMessage('서비스 목록을 불러오지 못했습니다.')
      setServices([])
      setIsLoading(false)
      return
    }
    setServices(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage('')

    const isAuthenticated = requireAuth({
      reason: '서비스 등록은 로그인 후 이용할 수 있습니다.',
    })
    if (!isAuthenticated) return

    if (!canManageSeller) {
      setStatusMessage('판매자 등록 후 서비스를 등록할 수 있습니다.')
      return
    }

    const parsedPoint = Number(form.pricePoint)
    if (!form.title.trim() || !form.category.trim() || !parsedPoint || parsedPoint <= 0) {
      setStatusMessage('서비스명, 카테고리, 포인트를 올바르게 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    const { error } = await createSellerService({
      sellerUserId: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      pricePoint: parsedPoint,
    })
    setIsSubmitting(false)

    if (error) {
      setStatusMessage(error.message ?? '서비스 등록 중 오류가 발생했습니다.')
      return
    }

    setStatusMessage('서비스가 등록되었습니다.')
    setForm(defaultForm)
    await loadServices()
  }

  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">판매관리</p>
        <h1>판매자 대시보드</h1>
        <p>서비스 등록, 견적, 진행중 주문을 관리하는 판매자 전용 화면입니다.</p>
      </section>

      <section className="main-card">
        <h2>판매 서비스 등록</h2>
        <p className="muted">등록한 서비스는 판매자 상세 페이지와 판매자 찾기 흐름에서 사용됩니다.</p>
        <form className="seller-onboarding-form" onSubmit={handleSubmit}>
          <label>
            서비스명
            <input
              type="text"
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="예) 랜딩페이지 제작"
            />
          </label>

          <label>
            카테고리
            <select
              value={form.category}
              onChange={(event) => handleChange('category', event.target.value)}
            >
              <option value="개발">개발</option>
              <option value="디자인">디자인</option>
              <option value="영상 편집">영상 편집</option>
              <option value="생활심부름">생활심부름</option>
              <option value="청소">청소</option>
              <option value="설치/수리">설치/수리</option>
            </select>
          </label>

          <label>
            설명
            <textarea
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="작업 범위, 전달물, 소요 기간 등을 작성하세요."
            />
          </label>

          <label>
            가격(포인트)
            <input
              type="number"
              min="1"
              step="1"
              value={form.pricePoint}
              onChange={(event) => handleChange('pricePoint', event.target.value)}
              placeholder="예) 4500"
            />
          </label>

          <button type="submit" className="seller-onboarding-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? '등록 중...' : '서비스 등록'}
          </button>
        </form>
        {statusMessage ? <p className="muted">{statusMessage}</p> : null}
      </section>

      <section className="main-card list-card">
        <article>
          <h3>활성 서비스</h3>
          <p>{services.length}개 공개중</p>
        </article>
        <article>
          <h3>판매자 상태</h3>
          <p>{canManageSeller ? '활성 판매자' : '판매자 등록 필요'}</p>
        </article>
      </section>

      <section className="main-card">
        <h2>내 서비스 목록</h2>
        {isLoading ? (
          <p className="muted">서비스 목록을 불러오는 중입니다...</p>
        ) : services.length === 0 ? (
          <p className="muted">아직 등록된 서비스가 없습니다.</p>
        ) : (
          <div className="seller-service-list">
            {services.map((service) => (
              <article key={service.id} className="seller-service-card">
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="seller-service-meta">
                  <span>{service.category}</span>
                  <span>{service.price.toLocaleString()}P</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default SellerDashboardPage
