import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SectionLoader from '../components/common/SectionLoader'
import SectionTitle from '../components/SectionTitle'
import SellerCard from '../components/SellerCard'
import EmptyState from '../components/EmptyState'
import {
  ALL_CATEGORY_VALUE,
  CATEGORY_SELECT_OPTIONS,
  normalizeCategoryFilter,
} from '../constants/marketplaceTaxonomy'
import useAuth from '../hooks/useAuth'
import { fetchFavoritesByUser, toggleFavorite } from '../lib/favorites'
import { fetchSellers } from '../lib/marketplace'

function SellersPage() {
  const navigate = useNavigate()
  const { user, requireAuth } = useAuth()
  const [searchParams] = useSearchParams()
  const initialCategory = normalizeCategoryFilter(searchParams.get('category'))
  const initialQuery = searchParams.get('q') ?? ''
  const [categoryFilter, setCategoryFilter] = useState(initialCategory)
  const [regionFilter, setRegionFilter] = useState(ALL_CATEGORY_VALUE)
  const [sortBy, setSortBy] = useState('rating')
  const [sellers, setSellers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState(initialQuery)
  const [favoriteSellerIds, setFavoriteSellerIds] = useState([])

  useEffect(() => {
    queueMicrotask(() => {
      setCategoryFilter(normalizeCategoryFilter(searchParams.get('category')))
      setQuery(searchParams.get('q') ?? '')
    })
  }, [searchParams])

  useEffect(() => {
    let isMounted = true
    queueMicrotask(() => {
      if (!isMounted) return
      setIsLoading(true)
      setErrorMessage('')
    })

    fetchSellers({
      keyword: query,
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
  }, [categoryFilter, query, regionFilter, sortBy])

  useEffect(() => {
    let mounted = true
    if (!user?.id) {
      queueMicrotask(() => {
        if (mounted) setFavoriteSellerIds([])
      })
      return undefined
    }
    fetchFavoritesByUser({ userId: user.id }).then(({ data, error }) => {
      if (!mounted || error) return
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

  const handleToggleFavorite = (seller) => {
    requireAuth({
      reason: '판매자 찜은 로그인 후 이용할 수 있습니다.',
      onSuccess: async () => {
        const { data, error } = await toggleFavorite({
          userId: user.id,
          targetType: 'seller',
          targetId: String(seller.id),
        })
        if (error) {
          setErrorMessage(error.message ?? '찜 처리 중 오류가 발생했습니다.')
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

  const regionOptions = useMemo(() => {
    const regionSet = new Set([ALL_CATEGORY_VALUE])
    sellers.forEach((seller) => regionSet.add(seller.region))
    return Array.from(regionSet)
  }, [sellers])

  return (
    <div className="page-stack">
      <section className="main-card hero-card hero-card--tight">
        <h1>판매자 찾기</h1>
        <p>평점, 응답속도, 전문 분야를 비교해 바로 의뢰할 수 있습니다.</p>
      </section>

      <section className="main-card sellers-filter-card">
        <div className="sellers-filter-head">
          <SectionTitle title="필터" />
        </div>
        <label className="sellers-search-field">
          <span>검색</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="판매자명/소개/카테고리 검색"
          />
        </label>
        <div className="sellers-category-tabs">
          {CATEGORY_SELECT_OPTIONS.map((category) => (
            <button
              key={category.value}
              type="button"
              className={categoryFilter === category.value ? 'active' : ''}
              onClick={() => {
                setCategoryFilter(category.value)
                const params = new URLSearchParams()
                if (category.value !== ALL_CATEGORY_VALUE) params.set('category', category.value)
                if (query.trim()) params.set('q', query.trim())
                navigate(`/seller-search?${params.toString()}`, { replace: true })
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

      {isLoading ? <SectionLoader label="판매자 정보 불러오는 중" /> : null}

      <section className="sellers-grid">
        {!isLoading && sellers.length === 0 ? (
          <div className="sellers-empty-wrap">
            <EmptyState
              title="조건에 맞는 판매자가 없습니다"
              description="필터를 바꾸거나 잠시 후 다시 시도해 주세요."
            />
          </div>
        ) : !isLoading ? (
          sellers.map((seller) => (
            <SellerCard
              key={seller.id}
              seller={seller}
              canFavorite={Boolean(user?.id)}
              isFavorite={favoriteSellerIds.includes(String(seller.id))}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
        ) : null}
      </section>
    </div>
  )
}

export default SellersPage
