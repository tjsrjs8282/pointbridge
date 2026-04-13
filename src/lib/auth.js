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
    message: error.message ?? 'Unknown auth error',
    code: error.code ?? 'UNKNOWN_AUTH_ERROR',
    status: error.status ?? null,
  }
}

export async function signUpWithEmail({ email, password, metadata = {} }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { data, error: normalizeError(error) }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

export async function signInWithEmail({ email, password }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error: normalizeError(error) }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

export async function signOutUser() {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  try {
    const { error } = await supabase.auth.signOut()
    return { data: { signedOut: !error }, error: normalizeError(error) }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

export async function getCurrentUser() {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  try {
    const { data, error } = await supabase.auth.getUser()
    return { data, error: normalizeError(error) }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

export async function getCurrentSession() {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  try {
    const { data, error } = await supabase.auth.getSession()
    return { data, error: normalizeError(error) }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

export async function updatePassword({ password }) {
  if (!supabase) return { data: null, error: createNotConfiguredError() }

  try {
    const { data, error } = await supabase.auth.updateUser({ password })
    return { data, error: normalizeError(error) }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}
