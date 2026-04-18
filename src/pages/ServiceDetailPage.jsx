import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SectionLoader from '../components/common/SectionLoader'
import { fetchServiceDetailById } from '../lib/marketplace'

function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [service, setService] = useState(null)
  const [seller, setSeller] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let mounted = true
    queueMicrotask(() => {
      if (!mounted) return
      setIsLoading(true)
      setErrorMessage('')
    })
    fetchServiceDetailById(id)
      .then(({ data, error }) => {
        if (!mounted) return
        if (error || !data?.service) {
          setErrorMessage(error?.message ?? '서비스 정보를 불러오지 못했습니다.')
          setService(null)
          setSeller(null)
          return
        }
        setService(data.service)
        setSeller(data.seller)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id])

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>{service?.name ?? '서비스 상세'}</h1>
        <p>등록된 서비스의 작업 범위, 이미지, 가격 정보를 확인하세요.</p>
      </section>

      {isLoading ? <SectionLoader label="서비스 정보 불러오는 중" /> : null}

      {!isLoading && errorMessage ? (
        <section className="main-card">
          <p className="muted">{errorMessage}</p>
        </section>
      ) : null}

      {!isLoading && service ? (
        <>
          <section className="main-card service-detail-card">
            <div className="service-detail-head">
              <div>
                <h2>{service.name}</h2>
                <p className="muted">
                  {service.category} · {Number(service.price ?? 0).toLocaleString()}P
                </p>
              </div>
              <button type="button" className="btn-primary" onClick={() => navigate(`/seller/${seller?.id ?? ''}`)}>
                판매자 프로필 이동
              </button>
            </div>

            {service.thumbnailUrl ? (
              <img src={service.thumbnailUrl} alt={`${service.name} 대표 이미지`} className="service-detail-hero-image" />
            ) : null}

            <article className="service-detail-description">
              <h3>서비스 설명</h3>
              <p>{service.description || '등록된 설명이 없습니다.'}</p>
            </article>

            <article className="service-detail-description">
              <h3>상세 내용</h3>
              <p>{service.detailContent || service.description || '등록된 상세 내용이 없습니다.'}</p>
            </article>

            {service.tags?.length ? (
              <div className="seller-extra-chip-list">
                {service.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            ) : null}

            {service.imageUrls?.length ? (
              <div className="service-detail-gallery">
                {service.imageUrls.map((imageUrl) => (
                  <img key={imageUrl} src={imageUrl} alt={`${service.name} 추가 이미지`} />
                ))}
              </div>
            ) : null}
          </section>

          {seller ? (
            <section className="main-card">
              <h2>판매자 정보</h2>
              <p className="muted">
                {seller.name} · {seller.region} · 평점 {Number(seller.rating ?? 0).toFixed(1)}
              </p>
              <Link className="seller-link-btn" to={`/seller/${seller.id}`}>
                판매자 프로필 상세 보기
              </Link>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default ServiceDetailPage
