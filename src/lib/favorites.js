import { supabase } from './supabase'

const FAVORITES_STORAGE_KEY = 'pointbridge:favorites'

function normalizeError(error, fallbackMessage = '찜 정보를 처리하지 못했습니다.') {
  if (!error) return null
  return {
    message: error.message ?? fallbackMessage,
    code: error.code ?? 'FAVORITES_ERROR',
    details: error.details ?? null,
    status: error.status ?? null,
  }
}

function isSchemaCompatibilityError(error) {
  const code = String(error?.code ?? '').toUpperCase()
  const message = String(error?.message ?? '').toLowerCase()
  return (
    code === 'PGRST204' ||
    code === '42P01' ||
    code === '42703' ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('column')
  )
}

function readLocalFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalFavorites(nextFavorites) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites))
}

function filterByUser(favorites, userId) {
  return favorites.filter((item) => item.user_id === userId)
}

function mapFavoriteRow(row) {
  return {
    id: row.id ?? `${row.user_id}:${row.target_type}:${row.target_id}`,
    userId: row.user_id,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: row.created_at ?? null,
  }
}

async function readFavoritesFromDb({ userId }) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id, user_id, target_type, target_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error }
  return {
    data: (data ?? []).map(mapFavoriteRow),
    error: null,
  }
}

function readFavoritesFromLocal({ userId }) {
  const favorites = filterByUser(readLocalFavorites(), userId).map(mapFavoriteRow)
  return { data: favorites, error: null }
}

export async function fetchFavoritesByUser({ userId }) {
  if (!userId) return { data: [], error: null }
  if (!supabase) return readFavoritesFromLocal({ userId })

  const result = await readFavoritesFromDb({ userId })
  if (!result.error) return result
  if (!isSchemaCompatibilityError(result.error)) {
    return { data: [], error: normalizeError(result.error, '찜 목록을 불러오지 못했습니다.') }
  }
  return readFavoritesFromLocal({ userId })
}

export async function toggleFavorite({
  userId,
  targetType,
  targetId,
}) {
  if (!userId || !targetType || !targetId) {
    return {
      data: null,
      error: {
        code: 'INVALID_FAVORITE_PAYLOAD',
        message: '찜 처리에 필요한 값이 누락되었습니다.',
      },
    }
  }

  const normalizedTargetType = String(targetType).trim().toLowerCase()
  const normalizedTargetId = String(targetId).trim()

  const toggleFavoriteInLocal = () => {
    const local = readLocalFavorites()
    const existing = local.find(
      (item) =>
        item.user_id === userId &&
        item.target_type === normalizedTargetType &&
        item.target_id === normalizedTargetId,
    )
    if (existing) {
      saveLocalFavorites(local.filter((item) => item !== existing))
      return { data: { isFavorite: false }, error: null }
    }
    saveLocalFavorites([
      {
        id: crypto.randomUUID(),
        user_id: userId,
        target_type: normalizedTargetType,
        target_id: normalizedTargetId,
        created_at: new Date().toISOString(),
      },
      ...local,
    ])
    return { data: { isFavorite: true }, error: null }
  }

  if (!supabase) {
    return toggleFavoriteInLocal()
  }

  const { data: existing, error: existingError } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('target_type', normalizedTargetType)
    .eq('target_id', normalizedTargetId)
    .maybeSingle()

  if (existingError && !isSchemaCompatibilityError(existingError)) {
    return { data: null, error: normalizeError(existingError, '찜 상태 확인에 실패했습니다.') }
  }

  if (existingError && isSchemaCompatibilityError(existingError)) {
    return toggleFavoriteInLocal()
  }

  if (existing?.id) {
    const { error: deleteError } = await supabase.from('favorites').delete().eq('id', existing.id)
    if (deleteError && !isSchemaCompatibilityError(deleteError)) {
      return { data: null, error: normalizeError(deleteError, '찜 해제에 실패했습니다.') }
    }
    return { data: { isFavorite: false }, error: null }
  }

  const { error: insertError } = await supabase.from('favorites').insert({
    user_id: userId,
    target_type: normalizedTargetType,
    target_id: normalizedTargetId,
  })
  if (insertError) {
    if (isSchemaCompatibilityError(insertError)) {
      return toggleFavoriteInLocal()
    }
    return { data: null, error: normalizeError(insertError, '찜 추가에 실패했습니다.') }
  }
  return { data: { isFavorite: true }, error: null }
}

