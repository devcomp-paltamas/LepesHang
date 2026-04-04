import { addDays, formatDateKey, formatWeekdayLabel, getWeekDates, startOfWeek } from './date.js'
import { getStatusLabel, getTaskPriorityRank } from './app-state.js'
import { getRoutineBlockLabel } from '../views/shared.js'

function toTimestamp(rawDate) {
  const value = rawDate ? new Date(rawDate).getTime() : 0
  return Number.isFinite(value) ? value : 0
}

export function buildPlannerState(scheduleItems, routineBlocks, weekOffset = 0) {
  const baseDate = new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000)
  const week = getWeekDates(baseDate)
  const state = {}

  week.forEach((date) => {
    const dateKey = formatDateKey(date)

    routineBlocks.forEach((block) => {
      const match = scheduleItems.find(
        (item) => item.scheduled_date === dateKey && item.routine_block_id === block.id,
      )

      state[`${dateKey}:${block.id}`] = {
        id: match?.id || null,
        sourceId: match?.source_id || '',
      }
    })
  })

  return state
}

export function buildHabitProgressState(habits, habitLogs, selectedDateKey) {
  return habits.reduce((state, habit) => {
    const log = habitLogs.find((entry) => entry.habit_id === habit.id && entry.target_date === selectedDateKey)
    state[habit.id] = String(log?.completed_count ?? 0)
    return state
  }, {})
}

export function buildHabitDraftState(habits) {
  return habits.reduce((state, habit) => {
    state[habit.id] = {
      name: habit.name || '',
      dailyTarget: String(habit.daily_target ?? 1),
      unit: habit.unit || 'db',
    }
    return state
  }, {})
}

export function getSelectedDateWeekOffset(selectedDate) {
  const currentWeekStart = startOfWeek(new Date())
  const selectedWeekStart = startOfWeek(selectedDate)
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000

  return Math.round((selectedWeekStart.getTime() - currentWeekStart.getTime()) / millisecondsPerWeek)
}

export function getPlannerDays(weekOffset) {
  return getWeekDates(new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000)).map((date) => ({
    dateKey: formatDateKey(date),
    label: formatWeekdayLabel(date),
  }))
}

export function deriveAppData({ data, selectedDate, selectedDateKey, taskPlanDate }) {
  const sourcesById = Object.fromEntries(data.sources.map((source) => [source.id, source]))
  const blocksById = Object.fromEntries(data.routine_blocks.map((block) => [block.id, block]))
  const habitLogsByKey = Object.fromEntries(
    data.habit_logs.map((entry) => [`${entry.habit_id}:${entry.target_date}`, entry]),
  )
  const logsById = Object.fromEntries(data.activity_logs.map((log) => [log.id, log]))
  const logsByScheduleItemId = {}
  const activeLogsByScheduleItemId = {}

  const activeTasks = data.task_entries
    .filter((task) => task.plan_date === taskPlanDate && !task.is_completed)
    .sort((left, right) => {
      const rankDiff = getTaskPriorityRank(left.priority) - getTaskPriorityRank(right.priority)
      if (rankDiff !== 0) return rankDiff
      return toTimestamp(left.created_at) - toTimestamp(right.created_at)
    })

  const completedTasks = data.task_entries
    .filter((task) => task.is_completed && task.plan_date && task.plan_date <= taskPlanDate)
    .sort((left, right) => {
      if (left.plan_date !== right.plan_date) {
        return left.plan_date < right.plan_date ? 1 : -1
      }

      const rankDiff = getTaskPriorityRank(left.priority) - getTaskPriorityRank(right.priority)
      if (rankDiff !== 0) return rankDiff

      const completedDiff = toTimestamp(right.completed_at) - toTimestamp(left.completed_at)
      if (completedDiff !== 0) return completedDiff
      return toTimestamp(right.created_at) - toTimestamp(left.created_at)
    })

  const activitySummary = data.activity_logs.reduce(
    (summary, log) => {
      if (log.schedule_item_id && !logsByScheduleItemId[log.schedule_item_id]) {
        logsByScheduleItemId[log.schedule_item_id] = log
      }

      if (
        log.completion_status === 'in_progress' &&
        log.schedule_item_id &&
        !activeLogsByScheduleItemId[log.schedule_item_id]
      ) {
        activeLogsByScheduleItemId[log.schedule_item_id] = log
      }

      if (log.completion_status === 'done') {
        summary.completedCount += 1
      }

      if (Number.isFinite(log.rating)) {
        summary.ratingCount += 1
        summary.ratingSum += log.rating
      }

      return summary
    },
    { completedCount: 0, ratingCount: 0, ratingSum: 0 },
  )

  const historyDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(selectedDate, index - 6)

    return {
      dateKey: formatDateKey(date),
      shortLabel: new Intl.DateTimeFormat('hu-HU', { weekday: 'short' }).format(date),
    }
  })

  const selectedItems = data.schedule_items
    .filter((item) => item.scheduled_date === selectedDateKey)
    .map((item) => {
      const source = sourcesById[item.source_id]
      const activeLog = activeLogsByScheduleItemId[item.id]
      const existingLog = logsByScheduleItemId[item.id]

      return {
        ...item,
        title: source?.name || 'Nincs kiválasztott forrás',
        provider: source?.provider || 'Forrás nélkül',
        statusLabel: getStatusLabel(item.status),
        activeLogId: activeLog?.id || null,
        logId: existingLog?.id || null,
        notes: existingLog?.notes || '',
      }
    })

  const routineCards = data.routine_blocks.map((block) => {
    const activeSchedule = selectedItems.find((item) => item.routine_block_id === block.id)

    return {
      id: block.id,
      name: getRoutineBlockLabel(block.name),
      summary:
        block.mode === 'morning'
          ? 'A reggeli blokk előre el van döntve, hogy ne kelljen újra választanod.'
          : 'Az esti blokk külön marad, de ugyaninnen indítható és zárható.',
      statusLabel: activeSchedule ? getStatusLabel(activeSchedule.status) : 'Erre a napra nincs beosztás',
      cta:
        activeSchedule?.status === 'in_progress'
          ? 'Aktív blokk'
          : activeSchedule?.status === 'done'
            ? 'Blokk lezárva'
            : activeSchedule?.status === 'skipped'
              ? 'Blokk kihagyva'
              : 'Blokk indítása',
      activeSchedule,
    }
  })

  const stats = [
    { label: 'Lezárt blokkok', value: `${activitySummary.completedCount}` },
    { label: 'Összes rögzített blokk', value: `${data.activity_logs.length}` },
    { label: 'Aktív források', value: `${data.sources.filter((item) => item.is_active).length}` },
    {
      label: 'Átlagos értékelés',
      value: activitySummary.ratingCount
        ? `${(activitySummary.ratingSum / activitySummary.ratingCount).toFixed(1)} / 5`
        : 'Nincs adat',
    },
  ]

  const recommendationEntry = data.ai_recommendations.find((item) => item.target_date === selectedDateKey)
  const recommendation = {
    body:
      recommendationEntry?.recommendation_text ||
      data.weekly_plan?.ai_recommendation ||
      'Még nem érkezett napi ajánlás. A kiegészítők oldalon tudod a heti tervet szerkeszteni.',
    confidence: recommendationEntry?.reasoning_summary || 'Napi összegzés',
  }

  return {
    selectedItems,
    routineCards,
    activeScheduleFallback: selectedItems.find((item) => item.status === 'in_progress') || null,
    stats,
    recommendation,
    blocksById,
    logsById,
    logsByScheduleItemId,
    activeTasks,
    completedTasks,
    sourcesById,
    habitLogsByKey,
    historyDays,
  }
}

export function deriveActiveLog({ selectedLogId, selectedScheduleItemId, derived }) {
  const selected = selectedLogId ? derived.logsById[selectedLogId] : null
  if (selected) return selected

  if (!selectedScheduleItemId) {
    return null
  }

  const matchingLog = derived.logsByScheduleItemId[selectedScheduleItemId]
  if (matchingLog) return matchingLog

  const scheduleItem = derived.selectedItems.find((item) => item.id === selectedScheduleItemId)
  if (!scheduleItem) {
    return null
  }

  const derivedCompletionStatus =
    scheduleItem.status === 'in_progress'
      ? 'in_progress'
      : scheduleItem.status === 'skipped'
        ? 'missed'
        : scheduleItem.status === 'done'
          ? 'done'
          : null

  if (!derivedCompletionStatus) {
    return null
  }

  return {
    id: null,
    schedule_item_id: scheduleItem.id,
    routine_block_id: scheduleItem.routine_block_id,
    source_id: scheduleItem.source_id || null,
    completion_status: derivedCompletionStatus,
  }
}
