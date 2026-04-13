import { useMemo, useState } from 'react'
import SectionTitle from '../components/SectionTitle'
import SellerCard from '../components/SellerCard'
import ServiceCard from '../components/ServiceCard'
import SecondaryButton from '../components/SecondaryButton'
import { mockSellers } from '../data/mockSellers'
import { mockServices } from '../data/mockServices'
import useSettings from '../hooks/useSettings'

const RECENT_SEARCHES_KEY = 'recentSearches:home'
const SEARCH_SCOPE_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: 'seller', label: '판매자' },
  { key: 'service', label: '서비스' },
  { key: 'category', label: '카테고리' },
]

function HomePage() {
  const { settings } = useSettings()
  const featuredSellers = mockSellers.slice(0, 3)
  const popularServices = mockServices.slice(0, 2)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [searchScope, setSearchScope] = useState(settings.searchScope ?? 'all')
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false)

  const normalizedQuery = activeQuery.trim().toLowerCase()
  const effectiveScope = searchScope === 'all' ? 'all' : searchScope

  const matchedSellers = useMemo(() => {
    if (!normalizedQuery) return []
    if (!['all', 'seller', 'category'].includes(effectiveScope)) return []
    return mockSellers.filter((seller) => {
      const sellerMatched =
        seller.name.toLowerCase().includes(normalizedQuery) ||
        seller.intro.toLowerCase().includes(normalizedQuery)
      const categoryMatched = seller.category.toLowerCase().includes(normalizedQuery)
      if (effectiveScope === 'seller') return sellerMatched
      if (effectiveScope === 'category') return categoryMatched
      return sellerMatched || categoryMatched
    })
  }, [effectiveScope, normalizedQuery])

  const matchedServices = useMemo(() => {
    if (!normalizedQuery) return []
    if (!['all', 'service', 'category'].includes(effectiveScope)) return []
    return mockServices.filter((service) => {
      const relatedSeller = mockSellers.find((seller) => seller.id === service.sellerId)
      const serviceMatched =
        service.name.toLowerCase().includes(normalizedQuery) ||
        service.description.toLowerCase().includes(normalizedQuery)
      const categoryMatched = relatedSeller?.category
        ?.toLowerCase()
        .includes(normalizedQuery)
      if (effectiveScope === 'service') return serviceMatched
      if (effectiveScope === 'category') return Boolean(categoryMatched)
      return serviceMatched || Boolean(categoryMatched)
    })
  }, [effectiveScope, normalizedQuery])

  const matchedCategories = useMemo(() => {
    if (!normalizedQuery) return []
    if (!['all', 'category'].includes(effectiveScope)) return []
    const categories = new Set()
    mockSellers.forEach((seller) => {
      if (seller.category.toLowerCase().includes(normalizedQuery)) {
        categories.add(seller.category)
      }
    })
    return Array.from(categories)
  }, [effectiveScope, normalizedQuery])

  const suggestions = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return []
    const sellerSuggestions = mockSellers
      .filter((seller) => seller.name.toLowerCase().includes(keyword))
      .map((seller) => ({ label: seller.name, type: '판매자' }))
    const serviceSuggestions = mockServices
      .filter((service) => service.name.toLowerCase().includes(keyword))
      .map((service) => ({ label: service.name, type: '서비스' }))
    const categorySuggestions = mockSellers
      .filter((seller) => seller.category.toLowerCase().includes(keyword))
      .map((seller) => ({ label: seller.category, type: '카테고리' }))

    const merged = [...sellerSuggestions, ...serviceSuggestions, ...categorySuggestions]
    const unique = merged.filter(
      (item, index) => merged.findIndex((target) => target.label === item.label) === index,
    )
    return unique.slice(0, 6)
  }, [query])

  const persistRecentSearches = (nextKeyword) => {
    if (!settings.saveRecentSearches) return
    const normalized = nextKeyword.trim()
    if (!normalized) return
    const nextList = [
      normalized,
      ...recentSearches.filter((item) => item !== normalized),
    ].slice(0, 8)
    setRecentSearches(nextList)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextList))
  }

  const handleSearchSubmit = (event) => {
    event?.preventDefault()
    const nextQuery = query.trim()
    if (!nextQuery) return
    setActiveQuery(nextQuery)
    persistRecentSearches(nextQuery)
    setIsSuggestionOpen(false)
  }

  return (
    <div className="page-stack">
      <section className="main-card home-search-card">
        <p className="badge">홈 대시보드</p>
        <h1>어떤 작업이 필요하세요?</h1>
        <p>원하는 서비스 키워드를 검색하고 바로 의뢰를 시작해보세요.</p>
        <form className="home-search-wrap" onSubmit={handleSearchSubmit}>
          <div className="home-search-filter-row">
            <select
              value={searchScope}
              onChange={(event) => setSearchScope(event.target.value)}
              aria-label="검색 범위"
            >
              {SEARCH_SCOPE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="home-search-box">
            <input
              type="text"
              placeholder="예) 상세페이지 디자인, 에어컨 청소, 랜딩페이지 제작"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setIsSuggestionOpen(true)
              }}
              onFocus={() => setIsSuggestionOpen(true)}
            />
            <button type="submit">검색</button>
          </div>
          {isSuggestionOpen && suggestions.length > 0 ? (
            <div className="home-search-suggestions">
              {suggestions.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setQuery(item.label)
                    setActiveQuery(item.label)
                    persistRecentSearches(item.label)
                    setIsSuggestionOpen(false)
                  }}
                >
                  <span>{item.label}</span>
                  <em>{item.type}</em>
                </button>
              ))}
            </div>
          ) : null}
          {settings.saveRecentSearches && recentSearches.length > 0 ? (
            <div className="home-recent-searches">
              <strong>최근 검색</strong>
              <div>
                {recentSearches.slice(0, 5).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item)
                      setActiveQuery(item)
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </form>
      </section>

      {activeQuery ? (
        <section className="main-card">
          <SectionTitle title={`검색 결과 · "${activeQuery}"`} />
          <div className="search-result-summary">
            <span>판매자 {matchedSellers.length}건</span>
            <span>서비스 {matchedServices.length}건</span>
            <span>카테고리 {matchedCategories.length}건</span>
          </div>

          {matchedCategories.length > 0 ? (
            <div className="chip-grid">
              {matchedCategories.map((category) => (
                <span key={category}>{category}</span>
              ))}
            </div>
          ) : null}

          {matchedSellers.length > 0 ? (
            <>
              <SectionTitle title="판매자 결과" />
              <div className="sellers-grid">
                {matchedSellers.slice(0, 4).map((seller) => (
                  <SellerCard key={`search-seller-${seller.id}`} seller={seller} />
                ))}
              </div>
            </>
          ) : null}

          {matchedServices.length > 0 ? (
            <>
              <SectionTitle title="서비스 결과" />
              <div className="seller-service-list">
                {matchedServices.slice(0, 4).map((service) => (
                  <ServiceCard
                    key={`search-service-${service.id}`}
                    service={service}
                    onOrder={() => {}}
                  />
                ))}
              </div>
            </>
          ) : null}

          {matchedSellers.length === 0 &&
          matchedServices.length === 0 &&
          matchedCategories.length === 0 ? (
            <p className="search-empty-message">검색 결과가 없습니다. 다른 키워드를 입력해 보세요.</p>
          ) : null}
        </section>
      ) : null}

      <section className="main-card">
        <SectionTitle title="카테고리 퀵 메뉴" />
        <div className="home-quick-menu">
          <button type="button">개발</button>
          <button type="button">디자인</button>
          <button type="button">생활심부름</button>
          <button type="button">청소</button>
          <button type="button">설치/수리</button>
          <button type="button">기타 전문작업</button>
        </div>
      </section>

      <section className="main-card">
        <SectionTitle title="추천 판매자" />
        <div className="sellers-grid">
          {featuredSellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      </section>

      <section className="main-card">
        <SectionTitle title="인기 서비스" />
        <div className="seller-service-list">
          {popularServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onOrder={() => {}}
            />
          ))}
        </div>
      </section>

      <section className="main-card">
        <h2>최근 주문 / 최근 본 서비스</h2>
        <div className="home-grid two">
          <article className="home-item-card">
            <h3>최근 주문</h3>
            <p>랜딩페이지 UI 개선</p>
            <span>진행중 · 완료예정 D-2</span>
          </article>
          <article className="home-item-card">
            <h3>최근 본 서비스</h3>
            <p>원룸 청소 2시간 패키지</p>
            <span>2,800P · 즉시 예약 가능</span>
          </article>
        </div>
      </section>

      <section className="main-card home-banner-card">
        <p>공지 / 이벤트</p>
        <h3>4월 신규 가입 이벤트: 첫 거래 수수료 50% 할인</h3>
        <span>이벤트 기간: 2026.04.01 - 2026.04.30</span>
        <div className="home-banner-actions">
          <SecondaryButton>자세히 보기</SecondaryButton>
        </div>
      </section>
    </div>
  )
}

export default HomePage
