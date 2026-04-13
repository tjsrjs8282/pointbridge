import { createClient } from '@supabase/supabase-js'

const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = supabaseUrlRaw?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingEnvKeys = []
if (!supabaseUrl) missingEnvKeys.push('VITE_SUPABASE_URL')
if (!supabaseAnonKey) missingEnvKeys.push('VITE_SUPABASE_ANON_KEY')

if (import.meta.env.DEV) {
  console.log('[Supabase][debug] VITE_SUPABASE_URL =', supabaseUrl)
}

if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  console.warn('[Supabase] URL format looks unusual:', supabaseUrl)
}

if (missingEnvKeys.length > 0) {
  const message =
    `[Supabase] Missing env: ${missingEnvKeys.join(', ')}. ` +
    'Add them to .env (or .env.local) and restart Vite dev server.'

  if (import.meta.env.DEV) {
    console.error(message)
  } else {
    console.warn(message)
  }
}

export const isSupabaseConfigured = missingEnvKeys.length === 0
export const activeSupabaseUrl = supabaseUrl

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export default supabase
