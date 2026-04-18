import { supabase } from './supabase'

const TIER_META = {
  newbie: { key: 'newbie', icon: '🌱', label: 'Newbie' },
  starter: { key: 'starter', icon: '⚡', label: 'Starter' },
  seller: { key: 'seller', icon: '🔥', label: 'Seller' },
  pro: { key: 'pro', icon: '🚀', label: 'Pro' },
  elite: { key: 'elite', icon: '👑', label: 'Elite' },
  legend: { key: 'legend', icon: '💎', label: 'Legend' },
}

function isSchemaCompatibilityError(error) {
  const code = String(error?.code ?? '').toUpperCase()
  const message = String(error?.message ?? '').toLowerCase()
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('column')
  )
}

function emptyStats() {
  return {
    chargeCount: 0,
    serviceUseCount: 0,
    serviceCount: 0,
    completedSalesCount: 0,
    reviewAvg: 0,
    isSellerRegistered: false,
  }
}

export function resolveUserTier(stats = {}) {
  const safe = { ...emptyStats(), ...stats }

  if (safe.completedSalesCount >= 30 && safe.reviewAvg >= 4) return TIER_META.legend
  if (safe.completedSalesCount >= 10 && safe.reviewAvg >= 3) return TIER_META.elite
  if (safe.serviceCount >= 3 && safe.completedSalesCount >= 5 && safe.serviceUseCount >= 1) return TIER_META.pro
  if (safe.isSellerRegistered && safe.serviceCount >= 1 && safe.completedSalesCount >= 1) return TIER_META.seller
  if (safe.chargeCount >= 1 && safe.serviceUseCount >= 1) return TIER_META.starter
  return TIER_META.newbie
}

/** DB 함수 `resolve_user_tier` / `resolve_my_user_tier` 반환 키 → UI 메타 */
export function tierMetaFromServerKey(key) {
  const k = String(key ?? 'newbie').toLowerCase()
  return TIER_META[k] ?? TIER_META.newbie
}

export async function fetchUserTierKeyFromServer({ supabase, userId }) {
  if (!supabase || !userId) return { data: null, error: null }
  const { data, error } = await supabase.rpc('resolve_user_tier', { p_user_id: userId })
  if (error) return { data: null, error }
  return { data: String(data ?? 'newbie'), error: null }
}

export async function fetchUserTierStats({ userId, profile } = {}) {
  if (!userId || !supabase) return { data: emptyStats(), error: null }

  const isSellerRegistered = Boolean(profile?.is_seller) || profile?.seller_status === 'active'
  const reviewAvg = Number(profile?.review_avg ?? 0)

  const [chargeResult, useResult, serviceCountResult, sellerProfileResult] = await Promise.all([
    supabase
      .from('point_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'charge'),
    supabase
      .from('point_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'use'),
    supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('seller_user_id', userId)
      .eq('is_active', true),
    supabase
      .from('seller_profiles')
      .select('total_completed_orders')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  let chargeCount = Number(chargeResult.count ?? 0)
  let serviceUseCount = Number(useResult.count ?? 0)

  if ((chargeResult.error && isSchemaCompatibilityError(chargeResult.error)) ||
      (useResult.error && isSchemaCompatibilityError(useResult.error))) {
    const [legacyChargeResult, legacyUseResult] = await Promise.all([
      supabase
        .from('point_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('type', ['charge', 'credit']),
      supabase
        .from('point_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('type', ['use', 'debit']),
    ])
    chargeCount = Number(legacyChargeResult.count ?? chargeCount)
    serviceUseCount = Number(legacyUseResult.count ?? serviceUseCount)
  }

  const serviceCount = Number(serviceCountResult.count ?? 0)
  const completedSalesCount = Number(sellerProfileResult.data?.total_completed_orders ?? 0)

  return {
    data: {
      chargeCount,
      serviceUseCount,
      serviceCount,
      completedSalesCount,
      reviewAvg,
      isSellerRegistered,
    },
    error:
      chargeResult.error ||
      useResult.error ||
      serviceCountResult.error ||
      sellerProfileResult.error ||
      null,
  }
}
