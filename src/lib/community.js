import { supabase } from './supabase'

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
    message: error.message ?? 'Unknown community error',
    code: error.code ?? 'UNKNOWN_COMMUNITY_ERROR',
    details: error.details ?? null,
    hint: error.hint ?? null,
    status: error.status ?? null,
  }
}

export const COMMUNITY_CATEGORIES = {
  notice: '공지사항',
  free: '자유게시판',
  inquiry: '문의게시판',
}

function mapPostRow(row) {
  const plainText = String(row.content ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    title: row.title,
    content: row.content,
    contentText: plainText,
    isSecret: Boolean(row.is_secret),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    authorName: row.author_name ?? '사용자',
  }
}

export async function fetchPostsByCategory(category) {
  if (!supabase) return { data: [], error: createNotConfiguredError() }

  let query = supabase
    .from('posts')
    .select('id, user_id, category, title, content, is_secret, created_at, updated_at, is_deleted')
    .order('created_at', { ascending: false })

  if (category && category !== 'all') query = query.eq('category', category)
  query = query.eq('is_deleted', false)
  const { data, error } = await query
  if (error) return { data: [], error: normalizeError(error) }

  const userIds = Array.from(new Set((data ?? []).map((row) => row.user_id)))
  let profileMap = new Map()
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, nickname, name')
      .in('id', userIds)
    if (profileError) return { data: [], error: normalizeError(profileError) }
    profileMap = new Map(
      (profiles ?? []).map((row) => [row.id, row.nickname ?? row.name ?? '사용자']),
    )
  }

  return {
    data: (data ?? []).map((row) =>
      mapPostRow({
        ...row,
        author_name: profileMap.get(row.user_id),
      }),
    ),
    error: null,
  }
}

export async function createPost({
  userId,
  category,
  title,
  content,
  isSecret = false,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      category,
      title,
      content,
      is_secret: Boolean(isSecret),
    })
    .select('id, user_id, category, title, content, is_secret, created_at, updated_at')
    .single()
  if (error) return { data: null, error: normalizeError(error) }
  return { data: mapPostRow(data), error: null }
}

export async function fetchLatestPostsByCategories({
  categories = ['notice', 'free'],
  limitPerCategory = 5,
} = {}) {
  if (!supabase) return { data: {}, error: createNotConfiguredError() }

  const normalizedCategories = categories.filter(Boolean)
  if (normalizedCategories.length === 0) return { data: {}, error: null }

  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, category, title, content, is_secret, created_at, updated_at, is_deleted')
    .in('category', normalizedCategories)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) return { data: {}, error: normalizeError(error) }

  const grouped = normalizedCategories.reduce((acc, key) => ({ ...acc, [key]: [] }), {})
  ;(data ?? []).forEach((row) => {
    const current = grouped[row.category] ?? []
    if (current.length < limitPerCategory) {
      current.push(mapPostRow(row))
      grouped[row.category] = current
    }
  })

  return { data: grouped, error: null }
}
