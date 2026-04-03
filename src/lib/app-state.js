import { formatDateKey } from './date.js'
import { taskPriorityOptions } from '../views/shared.js'

export const THEME_PREFERENCE_KEY = 'lepeshang-theme-preference'

export function createInitialAppData() {
  return {
    provider_options: [],
    category_options: [],
    routine_blocks: [],
    sources: [],
    habits: [],
    habit_logs: [],
    habit_tracking_available: false,
    habit_tracking_status: 'unchecked',
    weekly_plan: null,
    schedule_items: [],
    activity_logs: [],
    thought_entries: [],
    thought_entries_available: false,
    task_entries: [],
    task_entries_available: false,
    ai_recommendations: [],
  }
}

export function createDefaultCompletionForm() {
  return {
    completionStatus: 'done',
    rating: '5',
    notes: '',
  }
}

export function createDefaultSourceForm() {
  return {
    id: null,
    name: '',
    provider: '',
    content_type: 'audio',
    url: '',
    category: '',
    difficulty_level: '3',
    notes: '',
    is_active: true,
  }
}

export function createDefaultOptionForm() {
  return {
    provider: '',
    category: '',
  }
}

export function createDefaultRecommendationForm() {
  return {
    id: null,
    target_date: formatDateKey(new Date()),
    recommendation_text: '',
    reasoning_summary: '',
    recommended_source_id: '',
  }
}

export function createDefaultHabitForm() {
  return {
    name: '',
    dailyTarget: '1',
    unit: 'db',
  }
}

export function createDefaultThoughtForm() {
  return {
    content: '',
  }
}

export function createDefaultTaskForm() {
  return {
    priority: 'A1',
    description: '',
  }
}

export function getTaskPriorityRank(priority) {
  const normalized = String(priority || '').toUpperCase()
  const rank = taskPriorityOptions.indexOf(normalized)
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank
}

export function getCompletionFormValues(log) {
  if (!log || log.completion_status === 'in_progress') {
    return createDefaultCompletionForm()
  }

  return {
    completionStatus: log.completion_status || 'done',
    rating: log.rating ? String(log.rating) : '5',
    notes: log.notes || '',
  }
}

export function getDefaultThemePreference() {
  const now = new Date()
  const totalMinutes = now.getHours() * 60 + now.getMinutes()
  return totalMinutes >= 375 && totalMinutes < 1020 ? 'day' : 'night'
}

export function getThemeMode(themePreference) {
  return {
    label: themePreference === 'day' ? 'Nappali mód' : 'Éjjeli mód',
    themeClass: themePreference === 'day' ? 'theme-day' : 'theme-night',
  }
}

export function getStatusLabel(status) {
  return (
    {
      planned: 'Tervezve',
      in_progress: 'Folyamatban',
      done: 'Kész',
      skipped: 'Kihagyva',
    }[status] || status
  )
}
