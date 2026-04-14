import { supabase } from './supabase'

const BAD_WORDS = ['씨발', '병신', '개새끼', '좆', 'fuck', 'shit']

function createNotConfiguredError() {
  return {
    message:
      'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    code: 'SUPABASE_NOT_CONFIGURED',
  }
}

function normalizeError(error) {
  if (!error) return null
  return {
    message: error.message ?? 'Unknown marketplace error',
    code: error.code ?? 'UNKNOWN_MARKETPLACE_ERROR',
    details: error.details ?? null,
    hint: error.hint ?? null,
    status: error.status ?? null,
  }
}

function toInitials(value) {
  if (!value) return 'PB'
  const chunks = String(value).trim().split(/\s+/).slice(0, 2)
  return chunks.map((chunk) => chunk[0]).join('').toUpperCase()
}

function mapSellerRow(row) {
  return {
    id: row.seller_profile_id,
    sellerUserId: row.seller_user_id,
    name: row.display_name ?? '판매자',
    category: row.categories?.[0] ?? '기타',
    categories: row.categories ?? [],
    intro: row.intro ?? '',
    rating: Number(row.review_avg ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    startPrice: Number(row.start_price_point ?? 0),
    region: row.region ?? '미지정',
    avatar: toInitials(row.display_name),
    avatarUrl: row.avatar_url ?? '',
    verified: Boolean(row.is_active),
    avgResponse: row.response_time_avg ? `${row.response_time_avg}분` : '-',
    totalWorks: Number(row.total_completed_orders ?? 0),
    createdAt: row.created_at ?? null,
  }
}

function mapServiceRow(row) {
  return {
    id: row.id,
    sellerUserId: row.seller_user_id,
    sellerProfileId: row.seller_profile_id ?? null,
    sellerName: row.seller_name ?? '판매자',
    name: row.title,
    description: row.description ?? '',
    category: row.category ?? '기타',
    price: Number(row.price_point ?? 0),
    option: '기본',
    createdAt: row.created_at ?? null,
  }
}

function mapReviewRow(row) {
  return {
    id: row.id,
    sellerId: row.seller_user_id,
    user: row.buyer_name ?? '구매자',
    text: row.content ?? '',
    score: Number(row.rating ?? 0),
    createdAt: row.created_at ?? null,
  }
}

export function containsProhibitedLanguage(content = '') {
  const normalized = String(content).toLowerCase()
  return BAD_WORDS.some((word) => normalized.includes(word))
}

export async function registerSellerProfile({
  userId,
  displayName,
  intro,
  region,
  categories = [],
  isActive = true,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  const profilePayload = {
    id: userId,
    is_seller: true,
    seller_status: 'active',
  }

  const sellerPayload = {
    user_id: userId,
    display_name: displayName,
    intro: intro ?? '',
    region: region ?? '',
    categories,
    is_active: isActive,
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })

  if (profileError) return { data: null, error: normalizeError(profileError) }

  const { data, error } = await supabase
    .from('seller_profiles')
    .upsert(sellerPayload, { onConflict: 'user_id' })
    .select('*')
    .single()

  return { data, error: normalizeError(error) }
}

export async function createSellerService({
  sellerUserId,
  title,
  description,
  category,
  pricePoint,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  const { data, error } = await supabase
    .from('services')
    .insert({
      seller_user_id: sellerUserId,
      title,
      description: description ?? '',
      category,
      price_point: pricePoint,
      is_active: true,
    })
    .select('*')
    .single()

  return { data, error: normalizeError(error) }
}

export async function deactivateSellerProfile({ userId }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) {
    return {
      data: null,
      error: {
        code: 'MISSING_USER_ID',
        message: '판매자 삭제를 위한 사용자 ID가 필요합니다.',
      },
    }
  }

  // Try soft-delete fields first (is_deleted/deleted_at), then fallback for older schema.
  let sellerUpdateError = null
  const { error: softDeleteError } = await supabase
    .from('seller_profiles')
    .update({
      is_active: false,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (softDeleteError) {
    const { error: fallbackError } = await supabase
      .from('seller_profiles')
      .update({ is_active: false })
      .eq('user_id', userId)
    sellerUpdateError = fallbackError
  }

  if (sellerUpdateError) {
    return {
      data: null,
      error: {
        code: 'SELLER_DEACTIVATE_FAILED',
        message: '판매자 프로필 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.',
        details: sellerUpdateError.details ?? null,
      },
    }
  }

  await Promise.all([
    supabase
      .from('profiles')
      .update({ is_seller: false, seller_status: 'deleted' })
      .eq('id', userId),
    supabase.from('services').update({ is_active: false }).eq('seller_user_id', userId),
  ])

  return { data: { userId, deactivated: true }, error: null }
}

export async function fetchSellers({
  keyword = '',
  category = '전체',
  region = '전체',
  sortBy = 'rating',
} = {}) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }

  let sellers = []
  let sellerError = null

  let viewQuery = supabase.from('seller_search_view').select('*').eq('is_active', true)
  if (category !== '전체') viewQuery = viewQuery.contains('categories', [category])
  if (region !== '전체') viewQuery = viewQuery.eq('region', region)
  const { data: viewRows, error: viewError } = await viewQuery

  if (!viewError && Array.isArray(viewRows)) {
    sellers = viewRows.map(mapSellerRow)
  } else {
    sellerError = viewError
    let query = supabase.from('seller_profiles').select('*').eq('is_active', true)
    if (category !== '전체') query = query.contains('categories', [category])
    if (region !== '전체') query = query.eq('region', region)

    const { data: sellerProfiles, error } = await query
    if (error) return { data: [], error: normalizeError(error) }

    const sellerUserIds = (sellerProfiles ?? []).map((row) => row.user_id)
    if (sellerUserIds.length === 0) return { data: [], error: null }

    const [{ data: profileRows, error: profileError }, { data: serviceRows, error: serviceError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, avatar_url, review_avg, review_count')
          .in('id', sellerUserIds),
        supabase
          .from('services')
          .select('seller_user_id, price_point')
          .in('seller_user_id', sellerUserIds)
          .eq('is_active', true),
      ])

    if (profileError) return { data: [], error: normalizeError(profileError) }
    if (serviceError) return { data: [], error: normalizeError(serviceError) }

    const profileMap = new Map((profileRows ?? []).map((row) => [row.id, row]))
    const minPriceBySellerId = (serviceRows ?? []).reduce((acc, row) => {
      const current = acc.get(row.seller_user_id)
      const next = Number(row.price_point ?? 0)
      if (!current || next < current) acc.set(row.seller_user_id, next)
      return acc
    }, new Map())

    sellers = (sellerProfiles ?? []).map((sellerProfile) => {
      const sellerProfileMeta = profileMap.get(sellerProfile.user_id)
      return mapSellerRow({
        seller_profile_id: sellerProfile.id,
        seller_user_id: sellerProfile.user_id,
        display_name: sellerProfile.display_name,
        intro: sellerProfile.intro,
        region: sellerProfile.region,
        categories: sellerProfile.categories,
        is_active: sellerProfile.is_active,
        response_time_avg: sellerProfile.response_time_avg,
        total_completed_orders: sellerProfile.total_completed_orders,
        avatar_url: sellerProfileMeta?.avatar_url,
        review_avg: sellerProfileMeta?.review_avg,
        review_count: sellerProfileMeta?.review_count,
        created_at: sellerProfile.created_at,
        start_price_point: minPriceBySellerId.get(sellerProfile.user_id) ?? 0,
      })
    })
  }

  const normalizedKeyword = String(keyword ?? '').trim().toLowerCase()
  if (normalizedKeyword) {
    const sellerUserIds = sellers.map((item) => item.sellerUserId)
    let matchedServiceSellerSet = new Set()
    if (sellerUserIds.length > 0) {
      const { data: matchedServices, error: serviceKeywordError } = await supabase
        .from('services')
        .select('seller_user_id, title, description')
        .in('seller_user_id', sellerUserIds)
        .eq('is_active', true)
      if (!serviceKeywordError) {
        matchedServiceSellerSet = new Set(
          (matchedServices ?? [])
            .filter(
              (row) =>
                String(row.title ?? '')
                  .toLowerCase()
                  .includes(normalizedKeyword) ||
                String(row.description ?? '')
                  .toLowerCase()
                  .includes(normalizedKeyword),
            )
            .map((row) => row.seller_user_id),
        )
      }
    }

    sellers = sellers.filter((seller) => {
      const sellerText = [seller.name, seller.intro, seller.category, ...(seller.categories ?? []), seller.region]
        .join(' ')
        .toLowerCase()
      return sellerText.includes(normalizedKeyword) || matchedServiceSellerSet.has(seller.sellerUserId)
    })
  }

  sellers.sort((a, b) => {
    if (sortBy === 'reviews') return b.reviewCount - a.reviewCount
    if (sortBy === 'price') return a.startPrice - b.startPrice
    if (sortBy === 'latest') {
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    }
    return b.rating - a.rating
  })

  return { data: sellers, error: sellerError ? normalizeError(sellerError) : null }
}

export async function fetchSellerServicesByUserId(sellerUserId) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  if (!sellerUserId) {
    return {
      data: [],
      error: {
        code: 'MISSING_SELLER_ID',
        message: '판매자 ID가 필요합니다.',
      },
    }
  }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('seller_user_id', sellerUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: normalizeError(error) }
  return { data: (data ?? []).map(mapServiceRow), error: null }
}

export async function fetchSellerDetailByProfileId(sellerProfileId) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  const { data: sellerProfile, error: sellerError } = await supabase
    .from('seller_profiles')
    .select('*')
    .eq('id', sellerProfileId)
    .eq('is_active', true)
    .maybeSingle()

  if (sellerError) return { data: null, error: normalizeError(sellerError) }
  if (!sellerProfile) {
    return {
      data: null,
      error: { message: '판매자를 찾을 수 없습니다.', code: 'SELLER_NOT_FOUND' },
    }
  }

  const [{ data: sellerProfileMeta, error: profileError }, { data: services, error: serviceError }, { data: reviews, error: reviewError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, avatar_url, review_avg, review_count')
        .eq('id', sellerProfile.user_id)
        .maybeSingle(),
      supabase
        .from('services')
        .select('*')
        .eq('seller_user_id', sellerProfile.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('reviews')
        .select('id, seller_user_id, rating, content, created_at, buyer_user_id')
        .eq('seller_user_id', sellerProfile.user_id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false }),
    ])

  if (profileError) return { data: null, error: normalizeError(profileError) }
  if (serviceError) return { data: null, error: normalizeError(serviceError) }
  if (reviewError) return { data: null, error: normalizeError(reviewError) }

  const buyerUserIds = Array.from(new Set((reviews ?? []).map((row) => row.buyer_user_id)))
  let buyerNameMap = new Map()
  if (buyerUserIds.length > 0) {
    const { data: buyerProfiles, error: buyerProfilesError } = await supabase
      .from('profiles')
      .select('id, nickname, name')
      .in('id', buyerUserIds)
    if (buyerProfilesError) return { data: null, error: normalizeError(buyerProfilesError) }
    buyerNameMap = new Map(
      (buyerProfiles ?? []).map((row) => [row.id, row.nickname ?? row.name ?? '구매자']),
    )
  }

  const seller = mapSellerRow({
    seller_profile_id: sellerProfile.id,
    seller_user_id: sellerProfile.user_id,
    display_name: sellerProfile.display_name,
    intro: sellerProfile.intro,
    region: sellerProfile.region,
    categories: sellerProfile.categories,
    is_active: sellerProfile.is_active,
    response_time_avg: sellerProfile.response_time_avg,
    total_completed_orders: sellerProfile.total_completed_orders,
    avatar_url: sellerProfileMeta?.avatar_url,
    review_avg: sellerProfileMeta?.review_avg,
    review_count: sellerProfileMeta?.review_count,
    start_price_point: 0,
    created_at: sellerProfile.created_at,
  })

  const mappedServices = (services ?? []).map(mapServiceRow)
  seller.startPrice = mappedServices.reduce((min, item) => {
    if (!min) return item.price
    return Math.min(min, item.price)
  }, 0)

  const mappedReviews = (reviews ?? []).map((review) =>
    mapReviewRow({
      ...review,
      buyer_name: buyerNameMap.get(review.buyer_user_id),
    }),
  )

  return {
    data: {
      seller,
      services: mappedServices,
      reviews: mappedReviews,
    },
    error: null,
  }
}

export async function createOrderRequest({
  buyerUserId,
  sellerUserId,
  serviceId,
  category,
  titleSnapshot,
  pricePoint,
  requestMessage,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_user_id: buyerUserId,
      seller_user_id: sellerUserId,
      service_id: serviceId,
      category,
      title_snapshot: titleSnapshot,
      price_point: pricePoint,
      request_message: requestMessage ?? '',
      status: 'pending',
    })
    .select('*')
    .single()

  return { data, error: normalizeError(error) }
}

export async function respondOrder({
  orderId,
  decision,
  rejectionReasonCode = null,
  rejectionReasonText = null,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  let data = null
  let error = null

  const extendedResult = await supabase.rpc('respond_order', {
    p_order_id: orderId,
    p_decision: decision,
    p_rejection_reason_code: rejectionReasonCode,
    p_rejection_reason_text: rejectionReasonText,
  })
  data = extendedResult.data
  error = extendedResult.error

  if (error) {
    const fallbackResult = await supabase.rpc('respond_order', {
      p_order_id: orderId,
      p_decision: decision,
    })
    data = fallbackResult.data
    error = fallbackResult.error
  }

  return { data, error: normalizeError(error) }
}

export async function completeOrder({ orderId }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  const { data, error } = await supabase.rpc('complete_order', {
    p_order_id: orderId,
  })
  return { data, error: normalizeError(error) }
}

export async function createReview({
  orderId,
  serviceId,
  sellerUserId,
  buyerUserId,
  rating,
  content,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (containsProhibitedLanguage(content)) {
    return {
      data: null,
      error: {
        code: 'REVIEW_BAD_WORD',
        message: '리뷰 내용에 금칙어가 포함되어 있습니다.',
      },
    }
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      order_id: orderId,
      service_id: serviceId,
      seller_user_id: sellerUserId,
      buyer_user_id: buyerUserId,
      rating,
      content,
    })
    .select('*')
    .single()

  return { data, error: normalizeError(error) }
}

export async function getBuyerCompletedOrdersWithoutReview({ buyerUserId, sellerUserId }) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }

  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id, service_id, seller_user_id, buyer_user_id, title_snapshot, status')
    .eq('buyer_user_id', buyerUserId)
    .eq('seller_user_id', sellerUserId)
    .eq('status', 'completed')

  if (orderError) return { data: [], error: normalizeError(orderError) }

  const orderIds = (orders ?? []).map((order) => order.id)
  if (orderIds.length === 0) return { data: [], error: null }

  const { data: reviews, error: reviewError } = await supabase
    .from('reviews')
    .select('order_id')
    .in('order_id', orderIds)

  if (reviewError) return { data: [], error: normalizeError(reviewError) }

  const reviewedOrderSet = new Set((reviews ?? []).map((item) => item.order_id))
  const availableOrders = (orders ?? []).filter((item) => !reviewedOrderSet.has(item.id))
  return { data: availableOrders, error: null }
}

export async function fetchHomeMarketplaceData() {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  const [recommendedResult, latestResult] = await Promise.all([
    fetchSellers({ sortBy: 'rating' }),
    supabase
      .from('services')
      .select('id, seller_user_id, title, description, category, price_point, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(18),
  ])

  if (recommendedResult.error) return { data: null, error: recommendedResult.error }
  if (latestResult.error) return { data: null, error: normalizeError(latestResult.error) }

  const recentRows = latestResult.data ?? []
  const sellerIds = Array.from(new Set(recentRows.map((row) => row.seller_user_id)))
  let sellerProfileMap = new Map()
  let profileMap = new Map()

  if (sellerIds.length > 0) {
    const [{ data: sellerProfiles, error: sellerProfilesError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        supabase
          .from('seller_profiles')
          .select('id, user_id, display_name, total_completed_orders, is_active')
          .in('user_id', sellerIds),
        supabase
          .from('profiles')
          .select('id, avatar_url, review_avg, review_count')
          .in('id', sellerIds),
      ])

    if (sellerProfilesError) return { data: null, error: normalizeError(sellerProfilesError) }
    if (profilesError) return { data: null, error: normalizeError(profilesError) }
    sellerProfileMap = new Map((sellerProfiles ?? []).map((row) => [row.user_id, row]))
    profileMap = new Map((profiles ?? []).map((row) => [row.id, row]))
  }

  const mappedServices = recentRows
    .map((row) => {
      const sellerProfile = sellerProfileMap.get(row.seller_user_id)
      if (!sellerProfile?.is_active) return null
      return mapServiceRow({
        ...row,
        seller_profile_id: sellerProfile?.id ?? null,
        seller_name: sellerProfile?.display_name ?? '판매자',
      })
    })
    .filter(Boolean)

  const popularServices = [...mappedServices]
    .sort((a, b) => {
      const aProfile = profileMap.get(a.sellerUserId)
      const bProfile = profileMap.get(b.sellerUserId)
      const aScore = Number(aProfile?.review_avg ?? 0) * 10 + Number(aProfile?.review_count ?? 0)
      const bScore = Number(bProfile?.review_avg ?? 0) * 10 + Number(bProfile?.review_count ?? 0)
      return bScore - aScore
    })
    .slice(0, 4)

  return {
    data: {
      recommendedSellers: (recommendedResult.data ?? []).slice(0, 3),
      popularServices,
      recentServices: mappedServices.slice(0, 6),
    },
    error: null,
  }
}
