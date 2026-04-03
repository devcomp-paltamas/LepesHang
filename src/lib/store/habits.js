import { supabase } from '../supabase.js'
import {
  getHabitTablesAvailability,
  isMissingHabitTableError,
  makeId,
  resetHabitTableAvailabilityCache,
  setHabitTablesAvailability,
} from './shared.js'

export function getOptionalHabitQueries(habitLogStart, habitLogEnd) {
  if (getHabitTablesAvailability() !== true) {
    return [
      Promise.resolve({ data: [], error: null }),
      Promise.resolve({ data: [], error: null }),
    ]
  }

  return [
    supabase.from('habits').select('*').order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('*')
      .gte('target_date', habitLogStart)
      .lte('target_date', habitLogEnd)
      .order('target_date', { ascending: false }),
  ]
}

export async function saveHabit(input) {
  if (getHabitTablesAvailability() !== true) {
    throw new Error('A szokáskövetőt előbb ellenőrizni kell, vagy létre kell hozni a hiányzó táblákat a Supabase adatbázisban.')
  }

  const payload = {
    id: input.id || makeId(),
    name: input.name?.trim() || '',
    daily_target: input.daily_target ? Number(input.daily_target) : 1,
    unit: input.unit?.trim() || 'db',
    is_active: input.is_active ?? true,
  }

  if (!payload.name) {
    throw new Error('A szokás neve kötelező.')
  }

  if (!Number.isInteger(payload.daily_target) || payload.daily_target < 1) {
    throw new Error('A napi cél legalább 1 legyen.')
  }

  const { error } = await supabase.from('habits').upsert(payload)
  if (isMissingHabitTableError(error)) {
    setHabitTablesAvailability(false)
    throw new Error('A szokáskövető táblákat előbb létre kell hozni a Supabase adatbázisban.')
  }
  if (error) throw error

  setHabitTablesAvailability(true)
  return payload
}

export async function deleteHabit(habitId) {
  if (getHabitTablesAvailability() !== true) {
    throw new Error('A szokáskövetőt előbb ellenőrizni kell, vagy létre kell hozni a hiányzó táblákat a Supabase adatbázisban.')
  }

  if (!habitId) {
    throw new Error('A törlendő szokás azonosítója hiányzik.')
  }

  const { error } = await supabase.from('habits').delete().eq('id', habitId)
  if (isMissingHabitTableError(error)) {
    setHabitTablesAvailability(false)
    throw new Error('A szokáskövető táblákat előbb létre kell hozni a Supabase adatbázisban.')
  }
  if (error) throw error

  setHabitTablesAvailability(true)
}

export async function saveHabitLog(input) {
  if (getHabitTablesAvailability() !== true) {
    throw new Error('A szokáskövetőt előbb ellenőrizni kell, vagy létre kell hozni a hiányzó táblákat a Supabase adatbázisban.')
  }

  const completedCount = Number(input.completed_count)
  const payload = {
    habit_id: input.habit_id,
    target_date: input.target_date,
    completed_count: Number.isFinite(completedCount) ? Math.max(0, Math.floor(completedCount)) : 0,
    notes: input.notes?.trim() || '',
  }

  if (input.id) {
    payload.id = input.id
  }

  if (!payload.habit_id || !payload.target_date) {
    throw new Error('A szokás és a dátum kötelező.')
  }

  const { error } = await supabase.from('habit_logs').upsert(payload, { onConflict: 'habit_id,target_date' })
  if (isMissingHabitTableError(error)) {
    setHabitTablesAvailability(false)
    throw new Error('A szokáskövető táblákat előbb létre kell hozni a Supabase adatbázisban.')
  }
  if (error) throw error

  setHabitTablesAvailability(true)
  return payload
}

export async function checkHabitTableAvailability() {
  const [habitsProbe, logsProbe] = await Promise.all([
    supabase.from('habits').select('id').limit(1),
    supabase.from('habit_logs').select('id').limit(1),
  ])

  const missing = isMissingHabitTableError(habitsProbe.error) || isMissingHabitTableError(logsProbe.error)

  if (missing) {
    setHabitTablesAvailability(false)
    return false
  }

  if (habitsProbe.error) throw habitsProbe.error
  if (logsProbe.error) throw logsProbe.error

  setHabitTablesAvailability(true)
  return true
}

export { resetHabitTableAvailabilityCache }
