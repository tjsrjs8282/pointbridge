import { supabase } from './supabase'

/** 배너 키별 숨김 (로그아웃 시 `clear_my_banner_dismissals` RPC로 일괄 삭제 가능). */
export async function dismissBannerForUser({ userId, bannerKey }) {
  if (!supabase || !userId || !bannerKey) return { data: null, error: null }
  return supabase.from('user_banner_dismissals').upsert(
    { user_id: userId, banner_key: String(bannerKey) },
    { onConflict: 'user_id,banner_key' },
  )
}

export async function fetchDismissedBannerKeys({ userId }) {
  if (!supabase || !userId) return { data: [], error: null }
  const { data, error } = await supabase
    .from('user_banner_dismissals')
    .select('banner_key')
    .eq('user_id', userId)
  if (error) return { data: [], error }
  return { data: (data ?? []).map((r) => r.banner_key), error: null }
}
