import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionTitle from '../components/SectionTitle'
import SellerCard from '../components/SellerCard'
import EmptyState from '../components/EmptyState'
import { fetchSellers } from '../lib/marketplace'

const categoryOptions = [
  { label: '전체', value: '전체' },
  { label: '웹/앱 개발', value: '개발' },
  { label: '그래픽 디자인', value: '디자인' },
  { label: '영상 편집', value: '영상 편집' },
  { label: '생활서비스', value: '생활심부름' },
  { label: '청소', value: '청소' },
  { label: '설치/수리', value: '설치/수리' },
]

function SellersPage() {
  const navigate = useNavigate()
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [regionFilter, setRegionFilter] = useState('전체')
  const [sortBy, setSortBy] = useState('rating')
  const [sellers, setSellers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setErrorMessage('')

    fetchSellers({
      category: categoryFilter,
      region: regionFilter,
      sortBy,
    })
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) {
          setErrorMessage(error.message ?? '판매자 정보를 불러오지 못했습니다.')
          setSellers([])
          return
        }
        setSellers(data)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [categoryFilter, regionFilter, sortBy])

  const regionOptions = useMemo(() => {
    const regionSet = new Set(['전체'])
    sellers.forEach((seller) => regionSet.add(seller.region))
    return Array.from(regionSet)
  }, [sellers])

  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">판매자 찾기</p>
        <h1>판매자 찾기</h1>
        <p>평점, 응답속도, 전문 분야를 비교해 바로 의뢰할 수 있습니다.</p>
      </section>

      <section className="main-card sellers-filter-card">
        <SectionTitle title="필터" />
        <div className="sellers-category-tabs">
          {categoryOptions.map((category) => (
            <button
              key={category.label}
              type="button"
              className={categoryFilter === category.value ? 'active' : ''}
              onClick={() => {
                setCategoryFilter(category.value)
                navigate('/sellers', { replace: true })
              }}
            >
              {category.label}
            </button>
          ))}
        </div>
        <div className="sellers-filters">
          <label>
            지역
            <select
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
            >
              {regionOptions.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
          </label>

          <label>
            정렬
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="rating">평점순</option>
              <option value="reviews">리뷰순</option>
              <option value="latest">최신순</option>
              <option value="price">낮은가격순</option>
            </select>
          </label>
        </div>
      </section>

      {errorMessage ? <p className="muted">{errorMessage}</p> : null}

      <section className="sellers-grid">
        {isLoading ? (
          <p className="muted">판매자 정보를 불러오는 중입니다...</p>
        ) : sellers.length === 0 ? (
          <EmptyState
            title="조건에 맞는 판매자가 없습니다"
            description="필터를 바꾸거나 잠시 후 다시 시도해 주세요."
          />
        ) : (
          sellers.map((seller) => <SellerCard key={seller.id} seller={seller} />)
        )}
      </section>
    </div>
  )
}

export default SellersPage
