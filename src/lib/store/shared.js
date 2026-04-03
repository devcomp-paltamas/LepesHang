import { addDays, formatDateKey, startOfWeek } from '../date.js'

const LEGACY_LOCAL_STORAGE_KEY = 'lepeshang-app-state'
const HABIT_TABLES_CACHE_KEY = 'lepeshang-habit-tables-available'

export const TASK_PRIORITIES = new Set([
  'A1',
  'A2',
  'A3',
  'B1',
  'B2',
  'B3',
  'C1',
  'C2',
  'C3',
])

let habitTablesAvailable = null

export function getTodayDateKey() {
  return formatDateKey(new Date())
}

export function clearLegacyLocalState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY)
}

function readHabitTablesAvailabilityCache() {
  if (typeof window === 'undefined') return null

  const rawValue = window.localStorage.getItem(HABIT_TABLES_CACHE_KEY)
  if (rawValue === 'available') return true
  if (rawValue === 'missing') return false
  return null
}

export function getHabitTablesAvailability() {
  if (habitTablesAvailable === null) {
    habitTablesAvailable = readHabitTablesAvailabilityCache()
  }

  return habitTablesAvailable
}

export function setHabitTablesAvailability(value) {
  habitTablesAvailable = value

  if (typeof window === 'undefined') return

  if (value === null) {
    window.localStorage.removeItem(HABIT_TABLES_CACHE_KEY)
    return
  }

  window.localStorage.setItem(HABIT_TABLES_CACHE_KEY, value ? 'available' : 'missing')
}

export function resetHabitTableAvailabilityCache() {
  setHabitTablesAvailability(null)
}

export function getCurrentWeekRange(weekOffset = 0) {
  const start = addDays(startOfWeek(new Date()), weekOffset * 7)
  const end = addDays(start, 6)

  return {
    start: formatDateKey(start),
    end: formatDateKey(end),
  }
}

export function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function normalizeState(state) {
  return {
    provider_options: state.provider_options || [],
    category_options: state.category_options || [],
    routine_blocks: state.routine_blocks || [],
    sources: state.sources || [],
    habits: state.habits || [],
    habit_logs: state.habit_logs || [],
    habit_tracking_available: state.habit_tracking_available ?? false,
    habit_tracking_status: state.habit_tracking_status || 'unchecked',
    weekly_plan: state.weekly_plan || null,
    schedule_items: state.schedule_items || [],
    activity_logs: state.activity_logs || [],
    thought_entries: state.thought_entries || [],
    thought_entries_available: state.thought_entries_available ?? false,
    task_entries: state.task_entries || [],
    task_entries_available: state.task_entries_available ?? false,
    knowledge_entries: state.knowledge_entries || [],
    ai_recommendations: state.ai_recommendations || [],
    notifications: state.notifications || [],
  }
}

export function isMissingHabitTableError(error) {
  if (!error) return false

  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.status === 404 ||
    error.message?.includes('Could not find the table') ||
    error.message?.includes('relation') ||
    error.message?.includes('habits') ||
    error.message?.includes('habit_logs')
  )
}

export function isMissingThoughtTableError(error) {
  if (!error) return false

  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.status === 404 ||
    error.message?.includes('Could not find the table') ||
    error.message?.includes('relation') ||
    error.message?.includes('thought_entries')
  )
}

export function isMissingTaskTableError(error) {
  if (!error) return false

  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    (error.code === '42703' && error.message?.includes('plan_date')) ||
    error.status === 404 ||
    error.message?.includes('Could not find the table') ||
    error.message?.includes('relation') ||
    error.message?.includes('task_entries')
  )
}

export function mergeOptionLists(state) {
  const providerSet = new Set(state.provider_options || [])
  const categorySet = new Set(state.category_options || [])

  for (const source of state.sources || []) {
    if (source.provider) providerSet.add(source.provider)
    if (source.category) categorySet.add(source.category)
  }

  return {
    ...state,
    provider_options: Array.from(providerSet).sort((left, right) => left.localeCompare(right)),
    category_options: Array.from(categorySet).sort((left, right) => left.localeCompare(right)),
  }
}

export function getRoutineBlockSortKey(block) {
  const modeRank = {
    morning: 0,
    evening: 1,
    custom: 2,
  }

  return modeRank[block.mode] ?? 99
}
