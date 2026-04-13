import { supabase } from './supabase'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024

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
    message: error.message ?? 'Unknown profile error',
    code: error.code ?? 'UNKNOWN_PROFILE_ERROR',
    status: error.status ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  }
}

function classifyProfileError(error) {
  if (!error) return null

  const rawMessage = String(error.message ?? '').toLowerCase()
  const code = String(error.code ?? '').toUpperCase()
  const status = Number(error.status ?? 0)

  if (code === 'PGRST116') return 'ROW_NOT_FOUND'
  if (rawMessage.includes('0 rows') || rawMessage.includes('no rows')) {
    return 'ROW_NOT_FOUND'
  }
  if (status === 401 || status === 403) return 'SESSION_MISSING'
  if (
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('network') ||
    rawMessage.includes('fetch')
  ) {
    return 'NETWORK_ERROR'
  }
  return 'UNKNOWN'
}

export async function createUserProfile({
  userId,
  nickname,
  name,
  role,
  email,
  avatarUrl,
  phone,
  address,
  addressDetail,
  region,
  bio,
  preferredCategories,
  createdAt,
}) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  try {
    const payload = {
      id: userId,
      nickname,
      name: nickname ?? name,
      role,
      email,
      avatar_url: avatarUrl,
      phone,
      address,
      address_detail: addressDetail,
      region,
      bio,
      preferred_categories: preferredCategories,
      created_at: createdAt,
    }

    // Keep payload aligned with minimal common profiles schema.
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
        delete payload[key]
      }
    })

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    const normalizedError = normalizeError(error)
    if (normalizedError) {
      console.error('[Profile] Failed to upsert profile', {
        userId,
        payloadKeys: Object.keys(payload),
        message: normalizedError.message,
        code: normalizedError.code,
        details: normalizedError.details,
        hint: normalizedError.hint,
        status: normalizedError.status,
      })
    }

    return { data, error: normalizedError }
  } catch (error) {
    const normalizedError = normalizeError(error)
    console.error('[Profile] Unexpected profile upsert failure', {
      userId,
      message: normalizedError?.message,
      code: normalizedError?.code,
      details: normalizedError?.details,
      hint: normalizedError?.hint,
      status: normalizedError?.status,
    })
    return { data: null, error: normalizedError }
  }
}

export async function uploadProfileAvatar({ userId, file }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId || !file) {
    return {
      data: null,
      error: {
        message: 'Missing user id or file for avatar upload.',
        code: 'MISSING_UPLOAD_DATA',
        status: 400,
      },
    }
  }

  try {
    const fileType = String(file.type ?? '').toLowerCase()
    const extension = String(file.name?.split('.').pop() ?? '').toLowerCase()
    const isJpg = fileType === 'image/jpeg' || extension === 'jpg' || extension === 'jpeg'
    const isPng = fileType === 'image/png' || extension === 'png'
    const isWebp = fileType === 'image/webp' || extension === 'webp'
    if (!isJpg && !isPng && !isWebp) {
      return {
        data: null,
        error: {
          message: '프로필 이미지는 JPG, PNG, WEBP 파일만 업로드할 수 있습니다.',
          code: 'INVALID_IMAGE_TYPE',
          status: 400,
        },
      }
    }

    if (Number(file.size ?? 0) > MAX_AVATAR_FILE_SIZE) {
      return {
        data: null,
        error: {
          message: '프로필 이미지는 5MB 이하만 업로드할 수 있습니다.',
          code: 'FILE_TOO_LARGE',
          status: 400,
        },
      }
    }

    const normalizedExtension = isWebp ? 'webp' : isPng ? 'png' : 'jpg'
    const filePath = `${userId}_${Date.now()}.${normalizedExtension}`
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    const normalizedUploadError = normalizeError(uploadError)
    if (normalizedUploadError) {
      return { data: null, error: normalizedUploadError }
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)
    const publicUrl = data?.publicUrl ?? null
    if (!publicUrl) {
      return {
        data: null,
        error: {
          message: '업로드된 이미지 URL을 가져오지 못했습니다.',
          code: 'AVATAR_URL_MISSING',
          status: 500,
        },
      }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)
      .select()
      .single()

    const normalizedUpdateError = normalizeError(updateError)
    if (normalizedUpdateError) {
      return { data: null, error: normalizedUpdateError }
    }

    return {
      data: { path: filePath, publicUrl, profile: updatedProfile },
      error: null,
    }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

export async function syncProfileThemeSettings({ userId, settings }) {
  if (!supabase || !userId || !settings) return { data: null, error: null, skipped: true }

  try {
    const payload = {
      id: userId,
      theme_preset: settings.themePreset,
      accent_color: settings.accentColor,
      theme_mode: settings.themeMode,
      ui_settings: {
        uiDensity: settings.uiDensity,
        cardStyle: settings.cardStyle,
        cornerRadius: settings.cornerRadius,
        motionIntensity: settings.motionIntensity,
        sidebarDefaultState: settings.sidebarDefaultState,
        searchScope: settings.searchScope,
        saveRecentSearches: settings.saveRecentSearches,
      },
    }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    const normalizedError = normalizeError(error)
    if (normalizedError) {
      const errorCode = String(normalizedError.code ?? '').toUpperCase()
      const knownSchemaMismatch = errorCode === '42703' || errorCode === 'PGRST204'
      if (knownSchemaMismatch) {
        console.warn('[Profile] Theme sync skipped due to missing columns.', normalizedError)
        return { data: null, error: null, skipped: true }
      }
      return { data: null, error: normalizedError, skipped: false }
    }
    return { data, error: null, skipped: false }
  } catch (error) {
    const normalizedError = normalizeError(error)
    return { data: null, error: normalizedError, skipped: false }
  }
}

export async function getProfileByUserId(userId) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }
  if (!userId) {
    return {
      data: null,
      error: {
        message: 'Missing user id for profile fetch.',
        code: 'MISSING_USER_ID',
        status: 400,
      },
      errorType: 'SESSION_MISSING',
    }
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    const normalizedError = normalizeError(error)
    const errorType = classifyProfileError(normalizedError)

    if (normalizedError) {
      console.error('[Profile] Failed to fetch profile', {
        userId,
        errorType,
        error: normalizedError,
      })
    }

    return { data, error: normalizedError, errorType }
  } catch (error) {
    const normalizedError = normalizeError(error)
    const errorType = classifyProfileError(normalizedError)
    console.error('[Profile] Unexpected profile fetch failure', {
      userId,
      errorType,
      error: normalizedError,
    })
    return { data: null, error: normalizedError, errorType }
  }
}
