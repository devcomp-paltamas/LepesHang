import { addDays, formatDateKey } from '../date.js'
import { isSupabaseEnabled, supabase } from '../supabase.js'
import { ensureDailyTaskPlan } from './tasks.js'
import { getOptionalHabitQueries } from './habits.js'
import {
  clearLegacyLocalState,
  getCurrentWeekRange,
  getHabitTablesAvailability,
  getRoutineBlockSortKey,
  isMissingHabitTableError,
  isMissingTaskTableError,
  isMissingThoughtTableError,
  makeId,
  mergeOptionLists,
  normalizeState,
  setHabitTablesAvailability,
} from './shared.js'

async function loadFromSupabase(weekOffset = 0) {
  const { start, end } = getCurrentWeekRange(weekOffset)
  const habitLogStart = formatDateKey(addDays(start, -14))
  const habitLogEnd = formatDateKey(addDays(end, 14))
  const taskPlanDate = formatDateKey(new Date())

  await ensureDailyTaskPlan(taskPlanDate)

  const [
    providerOptionsResult,
    categoryOptionsResult,
    routineBlocksResult,
    sourcesResult,
    habitsResult,
    habitLogsResult,
    weeklyPlanResult,
    scheduleItemsResult,
    activityLogsResult,
    thoughtEntriesResult,
    taskEntriesResult,
    knowledgeEntriesResult,
    recommendationsResult,
    notificationsResult,
  ] = await Promise.all([
    supabase.from('provider_options').select('value').order('value', { ascending: true }),
    supabase.from('category_options').select('value').order('value', { ascending: true }),
    supabase.from('routine_blocks').select('*'),
    supabase.from('sources').select('*').order('provider', { ascending: true }),
    ...getOptionalHabitQueries(habitLogStart, habitLogEnd),
    supabase
      .from('weekly_plans')
      .select('*')
      .lte('week_start_date', start)
      .gte('week_end_date', end)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('schedule_items')
      .select('*')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date', { ascending: true }),
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }),
    supabase
      .from('thought_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('task_entries')
      .select('*')
      .order('plan_date', { ascending: false })
      .order('is_completed', { ascending: true })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('knowledge_entries').select('*').order('created_at', { ascending: false }).limit(20),
    supabase
      .from('ai_recommendations')
      .select('*')
      .gte('target_date', start)
      .lte('target_date', end)
      .order('target_date', { ascending: false }),
    supabase.from('notifications').select('*').order('title', { ascending: true }),
  ])

  const errors = [
    providerOptionsResult.error,
    categoryOptionsResult.error,
    routineBlocksResult.error,
    sourcesResult.error,
    habitsResult.error,
    habitLogsResult.error,
    weeklyPlanResult.error,
    scheduleItemsResult.error,
    activityLogsResult.error,
    thoughtEntriesResult.error,
    taskEntriesResult.error,
    knowledgeEntriesResult.error,
    recommendationsResult.error,
    notificationsResult.error,
  ].filter(Boolean)

  const criticalErrors = errors.filter(
    (error) =>
      !isMissingHabitTableError(error) &&
      !isMissingThoughtTableError(error) &&
      !isMissingTaskTableError(error),
  )

  const habitFeatureMissing =
    isMissingHabitTableError(habitsResult.error) || isMissingHabitTableError(habitLogsResult.error)
  const thoughtFeatureMissing = isMissingThoughtTableError(thoughtEntriesResult.error)
  const taskFeatureMissing = isMissingTaskTableError(taskEntriesResult.error)

  if (habitFeatureMissing) {
    setHabitTablesAvailability(false)
  } else if (!habitsResult.error && !habitLogsResult.error) {
    setHabitTablesAvailability(true)
  }

  if (criticalErrors.length) {
    throw criticalErrors[0]
  }

  const currentHabitTablesAvailability = getHabitTablesAvailability()
  const habitTrackingStatus =
    currentHabitTablesAvailability === true
      ? 'available'
      : currentHabitTablesAvailability === false
        ? 'missing'
        : 'unchecked'

  return normalizeState(
    mergeOptionLists({
      routine_blocks: (routineBlocksResult.data || []).sort((left, right) => {
        const rankDiff = getRoutineBlockSortKey(left) - getRoutineBlockSortKey(right)
        if (rankDiff !== 0) return rankDiff
        return left.name.localeCompare(right.name)
      }),
      sources: sourcesResult.data || [],
      habits:
        currentHabitTablesAvailability === true && !habitFeatureMissing
          ? (habitsResult.data || []).filter((habit) => habit.is_active !== false)
          : [],
      habit_logs: currentHabitTablesAvailability === true && !habitFeatureMissing ? habitLogsResult.data || [] : [],
      habit_tracking_available: currentHabitTablesAvailability === true && !habitFeatureMissing,
      habit_tracking_status: habitTrackingStatus,
      weekly_plan: weeklyPlanResult.data || null,
      schedule_items: scheduleItemsResult.data || [],
      activity_logs: activityLogsResult.data || [],
      thought_entries: thoughtFeatureMissing ? [] : thoughtEntriesResult.data || [],
      thought_entries_available: !thoughtFeatureMissing,
      task_entries: taskFeatureMissing ? [] : taskEntriesResult.data || [],
      task_entries_available: !taskFeatureMissing,
      knowledge_entries: knowledgeEntriesResult.data || [],
      ai_recommendations: recommendationsResult.data || [],
      notifications: notificationsResult.data || [],
      provider_options: (providerOptionsResult.data || []).map((item) => item.value),
      category_options: (categoryOptionsResult.data || []).map((item) => item.value),
    }),
  )
}

async function loadSupabaseWeekState(weekOffset = 0) {
  const { start, end } = getCurrentWeekRange(weekOffset)
  const state = await loadFromSupabase(weekOffset)

  if (state.weekly_plan?.week_start_date === start && state.weekly_plan?.week_end_date === end) {
    return state
  }

  return {
    ...state,
    weekly_plan: {
      id: makeId(),
      week_start_date: start,
      week_end_date: end,
      status: 'draft',
      ai_recommendation: '',
    },
    schedule_items: state.schedule_items.filter((item) => item.scheduled_date >= start && item.scheduled_date <= end),
  }
}

export async function loadAppState(weekOffset = 0) {
  clearLegacyLocalState()

  if (!isSupabaseEnabled) {
    throw new Error('A Supabase-kapcsolat nincs beállítva.')
  }

  return loadSupabaseWeekState(weekOffset)
}
