import { createClient } from '@supabase/supabase-js'

const runtimeEnv = typeof window !== 'undefined' ? window.__LEPESHANG_ENV__ || {} : {}

const url = import.meta.env.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY

export const isSupabaseEnabled = Boolean(url && anonKey)

export const supabase = isSupabaseEnabled ? createClient(url, anonKey) : null
