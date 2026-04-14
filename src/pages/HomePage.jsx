import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionTitle from '../components/SectionTitle'
import SellerCard from '../components/SellerCard'
import HomeCommunityLatestSection from '../components/home/HomeCommunityLatestSection'
import HomeQuickCategoryChips from '../components/home/HomeQuickCategoryChips'
import HomeSearchHero from '../components/home/HomeSearchHero'
import HomeServiceSection from '../components/home/HomeServiceSection'
import { fetchLatestPostsByCategories } from '../lib/community'
import { fetchHomeMarketplaceData } from '../lib/marketplace'

const RECENT_SEARCHES_KEY = 'recentSearches:home'
const QUICK_CATEGORIES = ['개발', '디자인', '영상 편집', '생활심부름', '청소', '설치/수리']

function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('전체')
  const [recommendedSellers, setRecommendedSellers] = useState([])
  const [popularServices, setPopularServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadErrorMessage, setLoadErrorMessage] = useState('')
  const [latestNoticePosts, setLatestNoticePosts] = useState([])
  const [latestFreePosts, setLatestFreePosts] = useState([])
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    setLoadErrorMessage('')

    fetchHomeMarketplaceData()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setLoadErrorMessage(error.message ?? '메인 데이터를 불러오지 못했습니다.')
          setRecommendedSellers([])
          setPopularServices([])
          return
        }
        setRecommendedSellers(data?.recommendedSellers ?? [])
        setPopularServices(data?.popularServices ?? [])
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    fetchLatestPostsByCategories({
      categories: ['notice', 'free'],
      limitPerCategory: 5,
    }).then(({ data, error }) => {
      if (!mounted || error) return
      setLatestNoticePosts(data?.notice ?? [])
      setLatestFreePosts(data?.free ?? [])
    })
    return () => {
      mounted = false
    }
  }, [])

  const hasServices = useMemo(
    () => popularServices.length > 0 || recommendedSellers.length > 0,
    [popularServices.length, recommendedSellers.length],
  )

  const persistRecentSearches = (nextKeyword) => {
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
    if (nextQuery) persistRecentSearches(nextQuery)
    const params = new URLSearchParams()
    if (nextQuery) params.set('q', nextQuery)
    if (category && category !== '전체') params.set('category', category)
    navigate(`/seller-search?${params.toString()}`)
  }

  return (
    <div className="page-stack">
      <HomeSearchHero
        query={query}
        category={category}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onSubmit={handleSearchSubmit}
        recentSearches={recentSearches}
        onRecentClick={(item) => {
          setQuery(item)
          navigate(`/seller-search?q=${encodeURIComponent(item)}`)
        }}
        quickCategoryChips={
          <HomeQuickCategoryChips
            categories={QUICK_CATEGORIES}
            onSelectCategory={(nextCategory) =>
              navigate(`/seller-search?category=${encodeURIComponent(nextCategory)}`)
            }
          />
        }
      />

      <section className="main-card">
        <SectionTitle title="추천 판매자" />
        <div className="sellers-grid">
          {recommendedSellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      </section>

      <HomeServiceSection
        title="인기 서비스"
        services={popularServices}
        onSelectService={(service) =>
          navigate(service.sellerProfileId ? `/seller/${service.sellerProfileId}` : '/seller-search')
        }
      />

      <HomeCommunityLatestSection
        noticePosts={latestNoticePosts}
        freePosts={latestFreePosts}
        onMore={(tabKey) => navigate(`/community?tab=${tabKey}`)}
        onOpenPost={(postId, tabKey) => navigate(`/community?tab=${tabKey}&post=${postId}`)}
      />

      {isLoading ? <p className="muted">메인 데이터를 불러오는 중입니다...</p> : null}
      {!isLoading && !hasServices && !loadErrorMessage ? (
        <p className="muted">아직 표시할 서비스 데이터가 없습니다.</p>
      ) : null}
      {loadErrorMessage ? <p className="muted">{loadErrorMessage}</p> : null}
    </div>
  )
}

export default HomePage
