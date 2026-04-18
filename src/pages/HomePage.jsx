import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionLoader from '../components/common/SectionLoader'
import HorizontalCarousel from '../components/common/HorizontalCarousel'
import SectionTitle from '../components/SectionTitle'
import SellerCard from '../components/SellerCard'
import HomeCommunityLatestSection from '../components/home/HomeCommunityLatestSection'
import HomeQuickCategoryChips from '../components/home/HomeQuickCategoryChips'
import HomeSearchHero from '../components/home/HomeSearchHero'
import HomeServiceSection from '../components/home/HomeServiceSection'
import { ALL_CATEGORY_VALUE, QUICK_CATEGORY_OPTIONS } from '../constants/marketplaceTaxonomy'
import { fetchLatestPostsByCategories } from '../lib/community'
import { fetchFavoritesByUser, toggleFavorite } from '../lib/favorites'
import { fetchHomeMarketplaceData } from '../lib/marketplace'
import useAuth from '../hooks/useAuth'
import { adminDeleteSellerProfile, adminDeleteService } from '../lib/admin'
import { isAdminProfile } from '../lib/permissions'

const RECENT_SEARCHES_KEY = 'recentSearches:home'

function HomePage() {
  const navigate = useNavigate()
  const { user, profile, requireAuth } = useAuth()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORY_VALUE)
  const [recommendedSellers, setRecommendedSellers] = useState([])
  const [newSellers, setNewSellers] = useState([])
  const [popularServices, setPopularServices] = useState([])
  const [favoriteSellerIds, setFavoriteSellerIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCommunityLoading, setIsCommunityLoading] = useState(true)
  const [loadErrorMessage, setLoadErrorMessage] = useState('')
  const [latestNoticePosts, setLatestNoticePosts] = useState([])
  const [latestFreePosts, setLatestFreePosts] = useState([])
  const isAdmin = isAdminProfile(profile)

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
    queueMicrotask(() => {
      if (!mounted) return
      setIsLoading(true)
      setLoadErrorMessage('')
    })

    fetchHomeMarketplaceData()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setLoadErrorMessage(error.message ?? '메인 데이터를 불러오지 못했습니다.')
          setRecommendedSellers([])
          setNewSellers([])
          setPopularServices([])
          return
        }
        setRecommendedSellers(data?.recommendedSellers ?? [])
        setNewSellers(data?.newSellers ?? [])
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
    if (!user?.id) {
      queueMicrotask(() => {
        if (mounted) setFavoriteSellerIds([])
      })
      return undefined
    }
    fetchFavoritesByUser({ userId: user.id }).then(({ data }) => {
      if (!mounted) return
      setFavoriteSellerIds(
        (data ?? [])
          .filter((item) => item.targetType === 'seller')
          .map((item) => String(item.targetId)),
      )
    })
    return () => {
      mounted = false
    }
  }, [user?.id])

  useEffect(() => {
    let mounted = true
    queueMicrotask(() => {
      if (!mounted) return
      setIsCommunityLoading(true)
    })
    fetchLatestPostsByCategories({
      categories: ['notice', 'free'],
      limitPerCategory: 5,
    }).then(({ data, error }) => {
      if (!mounted || error) return
      setLatestNoticePosts(data?.notice ?? [])
      setLatestFreePosts(data?.free ?? [])
    }).finally(() => {
      if (mounted) setIsCommunityLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const hasServices = useMemo(
    () => popularServices.length > 0 || recommendedSellers.length > 0 || newSellers.length > 0,
    [popularServices.length, recommendedSellers.length, newSellers.length],
  )

  const handleToggleSellerFavorite = (seller) => {
    if (!seller?.id) return
    requireAuth({
      reason: '판매자 찜은 로그인 후 이용할 수 있습니다.',
      onSuccess: async () => {
        const { data, error } = await toggleFavorite({
          userId: user.id,
          targetType: 'seller',
          targetId: String(seller.id),
        })
        if (error) {
          setLoadErrorMessage(error.message ?? '찜 처리 중 오류가 발생했습니다.')
          return
        }
        setFavoriteSellerIds((prev) =>
          data?.isFavorite
            ? Array.from(new Set([...prev, String(seller.id)]))
            : prev.filter((id) => id !== String(seller.id)),
        )
      },
    })
  }

  const reloadHomeData = async () => {
    const { data, error } = await fetchHomeMarketplaceData()
    if (error) {
      setLoadErrorMessage(error.message ?? '메인 데이터를 불러오지 못했습니다.')
      return
    }
    setRecommendedSellers(data?.recommendedSellers ?? [])
    setNewSellers(data?.newSellers ?? [])
    setPopularServices(data?.popularServices ?? [])
  }

  const handleAdminDeleteSeller = async (seller) => {
    if (!isAdmin || !seller?.sellerUserId) return
    const confirmed = window.confirm(`${seller.name} 판매자를 비활성화할까요?`)
    if (!confirmed) return
    const { error } = await adminDeleteSellerProfile({ userId: seller.sellerUserId })
    if (error) {
      setLoadErrorMessage(error.message ?? '판매자 삭제에 실패했습니다.')
      return
    }
    reloadHomeData()
  }

  const handleAdminDeleteService = async (service) => {
    if (!isAdmin || !service?.id) return
    const confirmed = window.confirm(`${service.name} 서비스를 비노출 처리할까요?`)
    if (!confirmed) return
    const { error } = await adminDeleteService({ serviceId: service.id })
    if (error) {
      setLoadErrorMessage(error.message ?? '서비스 삭제에 실패했습니다.')
      return
    }
    reloadHomeData()
  }

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
    if (category && category !== ALL_CATEGORY_VALUE) params.set('category', category)
    navigate(`/seller-search?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <SectionLoader label="메인 데이터 불러오는 중" />
      </div>
    )
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
            categories={QUICK_CATEGORY_OPTIONS}
            onSelectCategory={(nextCategory) =>
              navigate(`/seller-search?category=${encodeURIComponent(nextCategory)}`)
            }
          />
        }
        promoBanner={
          <article className="home-promo-banner-card">
            <p className="badge">프로모션</p>
            <h3>신규 판매자 혜택</h3>
            <p>이번 주 등록 완료 시 추천 영역 우선 노출과 포인트 보너스를 제공합니다.</p>
            <button type="button" className="btn-secondary" onClick={() => navigate('/seller-search')}>
              자세히 보기
            </button>
          </article>
        }
      />

      <section className="main-card">
        <SectionTitle title="추천 판매자" />
        <HorizontalCarousel ariaLabel="추천 판매자">
          {recommendedSellers.map((seller) => (
            <div key={seller.id} className="carousel-item seller">
              <SellerCard
                seller={seller}
                canFavorite={Boolean(user?.id)}
                isFavorite={favoriteSellerIds.includes(String(seller.id))}
                onToggleFavorite={handleToggleSellerFavorite}
                canAdminManage={isAdmin}
                onAdminDelete={handleAdminDeleteSeller}
              />
            </div>
          ))}
        </HorizontalCarousel>
      </section>

      <section className="main-card">
        <SectionTitle title="신규 판매자" />
        <HorizontalCarousel ariaLabel="신규 판매자">
          {newSellers.map((seller) => (
            <div key={seller.id} className="carousel-item seller">
              <SellerCard
                seller={seller}
                canFavorite={Boolean(user?.id)}
                isFavorite={favoriteSellerIds.includes(String(seller.id))}
                onToggleFavorite={handleToggleSellerFavorite}
                canAdminManage={isAdmin}
                onAdminDelete={handleAdminDeleteSeller}
              />
            </div>
          ))}
        </HorizontalCarousel>
      </section>

      <HomeServiceSection
        title="인기 서비스"
        services={popularServices}
        onSelectService={(service) =>
          navigate(service.id ? `/service/${service.id}` : '/seller-search')
        }
        canAdminManage={isAdmin}
        onAdminDeleteService={handleAdminDeleteService}
      />

      {isCommunityLoading ? (
        <SectionLoader label="커뮤니티 게시글 불러오는 중" />
      ) : (
        <HomeCommunityLatestSection
          noticePosts={latestNoticePosts}
          freePosts={latestFreePosts}
          onMore={(tabKey) => navigate(`/community?tab=${tabKey}`)}
          onOpenPost={(postId, tabKey) => navigate(`/community?tab=${tabKey}&post=${postId}`)}
        />
      )}

      {!hasServices && !loadErrorMessage ? (
        <p className="muted">아직 표시할 서비스 데이터가 없습니다.</p>
      ) : null}
      {loadErrorMessage ? <p className="muted">{loadErrorMessage}</p> : null}
    </div>
  )
}

export default HomePage
