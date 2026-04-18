import { deactivateSellerProfile } from './marketplace'
import { supabase } from './supabase'

function createNotConfiguredError() {
  return {
    message:
      'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    code: 'SUPABASE_NOT_CONFIGURED',
  }
}

function normalizeError(error, fallbackMessage = '관리자 작업 중 오류가 발생했습니다.') {
  if (!error) return null
  return {
    message: error.message ?? fallbackMessage,
    code: error.code ?? 'ADMIN_ERROR',
    status: error.status ?? null,
    details: error.details ?? null,
  }
}

export async function adminListProfiles() {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, nickname, role, is_admin, is_seller, seller_status, created_at, point_balance')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return { data: [], error: normalizeError(error, '회원 목록을 불러오지 못했습니다.') }
  return { data: data ?? [], error: null }
}

export async function adminUpdateProfile({
  userId,
  nickname,
  role,
  isAdmin,
  isSeller,
  sellerStatus,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) {
    return { data: null, error: { code: 'MISSING_USER_ID', message: '사용자 ID가 필요합니다.' } }
  }
  const payload = {}
  if (typeof nickname === 'string') payload.nickname = nickname
  if (typeof role === 'string') payload.role = role
  if (typeof isAdmin === 'boolean') payload.is_admin = isAdmin
  if (typeof isSeller === 'boolean') payload.is_seller = isSeller
  if (typeof sellerStatus === 'string') payload.seller_status = sellerStatus

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('id, email, name, nickname, role, is_admin, is_seller, seller_status, created_at, point_balance')
    .single()
  if (error) return { data: null, error: normalizeError(error, '회원 정보 수정에 실패했습니다.') }
  return { data, error: null }
}

export async function adminDeleteProfile({ userId }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) {
    return { data: null, error: { code: 'MISSING_USER_ID', message: '사용자 ID가 필요합니다.' } }
  }
  const { error } = await supabase.from('profiles').delete().eq('id', userId)
  if (error) return { data: null, error: normalizeError(error, '회원 삭제에 실패했습니다.') }
  return { data: { userId }, error: null }
}

export async function adminListSellerProfiles() {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  const { data: sellerRows, error: sellerError } = await supabase
    .from('seller_profiles')
    .select('id, user_id, display_name, intro, region, categories, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (sellerError) return { data: [], error: normalizeError(sellerError, '판매자 목록을 불러오지 못했습니다.') }

  const userIds = Array.from(new Set((sellerRows ?? []).map((row) => row.user_id).filter(Boolean)))
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, email, nickname, is_admin, is_seller, seller_status')
    .in('id', userIds)
  const profileMap = new Map((profileRows ?? []).map((row) => [row.id, row]))

  const { data: serviceRows } = await supabase
    .from('services')
    .select('seller_user_id, price_point, is_active')
    .in('seller_user_id', userIds)
  const serviceStats = (serviceRows ?? []).reduce((acc, row) => {
    const sellerId = row.seller_user_id
    if (!sellerId) return acc
    const prev = acc.get(sellerId) ?? { minPrice: 0, maxPrice: 0, activeCount: 0 }
    const price = Number(row.price_point ?? 0)
    const next = {
      minPrice: prev.minPrice === 0 ? price : Math.min(prev.minPrice, price),
      maxPrice: Math.max(prev.maxPrice, price),
      activeCount: prev.activeCount + (row.is_active ? 1 : 0),
    }
    acc.set(sellerId, next)
    return acc
  }, new Map())

  const mapped = (sellerRows ?? []).map((row) => ({
    ...row,
    email: profileMap.get(row.user_id)?.email ?? '',
    nickname: profileMap.get(row.user_id)?.nickname ?? '',
    seller_status: profileMap.get(row.user_id)?.seller_status ?? 'none',
    is_admin: Boolean(profileMap.get(row.user_id)?.is_admin),
    service_stats: serviceStats.get(row.user_id) ?? { minPrice: 0, maxPrice: 0, activeCount: 0 },
  }))

  return { data: mapped, error: null }
}

export async function adminDeleteSellerProfile({ userId }) {
  return deactivateSellerProfile({ userId })
}

export async function adminListServices() {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  const { data, error } = await supabase
    .from('services')
    .select('id, seller_user_id, title, description, category, price_point, is_active, created_at, thumbnail_url')
    .order('created_at', { ascending: false })
    .limit(800)
  if (error) return { data: [], error: normalizeError(error, '서비스 목록을 불러오지 못했습니다.') }
  return { data: data ?? [], error: null }
}

export async function adminDeleteService({ serviceId }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!serviceId) {
    return { data: null, error: { code: 'MISSING_SERVICE_ID', message: '서비스 ID가 필요합니다.' } }
  }
  const { data, error } = await supabase
    .from('services')
    .update({ is_active: false })
    .eq('id', serviceId)
    .select('id, is_active')
    .single()
  if (error) return { data: null, error: normalizeError(error, '서비스 삭제에 실패했습니다.') }
  return { data, error: null }
}

export async function adminListPosts() {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, category, title, created_at, is_deleted')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return { data: [], error: normalizeError(error, '게시글 목록을 불러오지 못했습니다.') }
  return { data: data ?? [], error: null }
}

export async function adminDeletePost({ postId }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!postId) {
    return { data: null, error: { code: 'MISSING_POST_ID', message: '게시글 ID가 필요합니다.' } }
  }
  const { data, error } = await supabase
    .from('posts')
    .update({ is_deleted: true })
    .eq('id', postId)
    .select('id, is_deleted')
    .single()
  if (error) return { data: null, error: normalizeError(error, '게시글 삭제에 실패했습니다.') }
  return { data, error: null }
}

export async function adminListOrders({ limit = 200 } = {}) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  const { data, error } = await supabase
    .from('orders')
    .select('id, buyer_user_id, seller_user_id, service_id, title_snapshot, status, price_point, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { data: [], error: normalizeError(error, '주문 목록을 불러오지 못했습니다.') }
  return { data: data ?? [], error: null }
}

export async function adminListReviews({ limit = 200 } = {}) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }
  const { data, error } = await supabase
    .from('reviews')
    .select('id, seller_user_id, buyer_user_id, rating, content, is_hidden, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { data: [], error: normalizeError(error, '리뷰 목록을 불러오지 못했습니다.') }
  return { data: data ?? [], error: null }
}

export async function adminHideReview({ reviewId, isHidden = true }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  const { data, error } = await supabase
    .from('reviews')
    .update({ is_hidden: isHidden })
    .eq('id', reviewId)
    .select('id, is_hidden')
    .single()
  if (error) return { data: null, error: normalizeError(error, '리뷰 상태 변경에 실패했습니다.') }
  return { data, error: null }
}

export async function adminApplyPointAdjustment({ userId, amount, reason = '관리자 포인트 조정' }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) return { data: null, error: { code: 'MISSING_USER_ID', message: '사용자 ID가 필요합니다.' } }
  const safeAmount = Number(amount)
  if (!Number.isFinite(safeAmount) || safeAmount === 0) {
    return { data: null, error: { code: 'INVALID_AMOUNT', message: '포인트 조정 금액을 입력해 주세요.' } }
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('id, point_balance')
    .eq('id', userId)
    .single()
  if (profileError) return { data: null, error: normalizeError(profileError, '회원 정보를 불러오지 못했습니다.') }

  const nextBalance = Math.max(0, Number(profileRow?.point_balance ?? 0) + safeAmount)
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ point_balance: nextBalance })
    .eq('id', userId)
    .select('id, point_balance')
    .single()
  if (updateError) return { data: null, error: normalizeError(updateError, '포인트 반영에 실패했습니다.') }

  await supabase.from('point_transactions').insert({
    user_id: userId,
    type: 'adjustment',
    amount: Math.abs(Math.round(safeAmount)),
    description: reason,
  })

  return { data: updatedProfile, error: null }
}
