import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionTitle from '../components/SectionTitle'
import SellerCard from '../components/SellerCard'
import { mockSellers } from '../data/mockSellers'

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

  const filteredSellers = useMemo(() => {
    const filtered = mockSellers.filter((seller) => {
      const categoryMatched =
        categoryFilter === '전체' || seller.category === categoryFilter
      const regionMatched = regionFilter === '전체' || seller.region === regionFilter
      return categoryMatched && regionMatched
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount
      if (sortBy === 'latest')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'price') return a.startPrice - b.startPrice
      return 0
    })
  }, [categoryFilter, regionFilter, sortBy])

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
              <option>전체</option>
              <option>서울</option>
              <option>경기</option>
              <option>인천</option>
              <option>부산</option>
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

      <section className="sellers-grid">
        {filteredSellers.map((seller) => (
          <SellerCard key={seller.id} seller={seller} />
        ))}
      </section>
    </div>
  )
}

export default SellersPage
