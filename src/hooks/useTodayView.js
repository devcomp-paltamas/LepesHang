import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, formatDateKey, formatWeekdayLabel } from '../lib/date.js'
import {
  createDefaultCompletionForm,
  createDefaultHabitForm,
  createDefaultThoughtForm,
  getCompletionFormValues,
} from '../lib/app-state.js'
import {
  buildHabitDraftState,
  buildHabitProgressState,
  deriveActiveLog,
  deriveAppData,
  getSelectedDateWeekOffset,
} from '../lib/app-selectors.js'
import { getRoutineBlockLabel } from '../views/shared.js'
import {
  checkHabitTableAvailability,
  completeRoutine,
  deleteHabit,
  resetHabitTableAvailabilityCache,
  saveHabit,
  saveHabitLog,
  saveThoughtEntry,
  startRoutine,
} from '../lib/store.js'

export default function useTodayView({ data, setData, setError, showToast, reloadState }) {
  const [todayOffset, setTodayOffset] = useState(0)
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [selectedScheduleItemId, setSelectedScheduleItemId] = useState(null)
  const activityPanelRef = useRef(null)
  const [completionValues, setCompletionValues] = useState(() => createDefaultCompletionForm())
  const [habitForm, setHabitForm] = useState(() => createDefaultHabitForm())
  const [thoughtForm, setThoughtForm] = useState(() => createDefaultThoughtForm())
  const [thoughtSaveState, setThoughtSaveState] = useState('idle')
  const [habitDraftValues, setHabitDraftValues] = useState({})
  const [habitProgressValues, setHabitProgressValues] = useState({})

  const selectedDate = useMemo(() => addDays(new Date(), todayOffset), [todayOffset])
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate])
  const selectedDateLabel = useMemo(() => formatWeekdayLabel(selectedDate), [selectedDate])
  const selectedDateWeekOffset = useMemo(() => getSelectedDateWeekOffset(selectedDate), [selectedDate])
  const taskPlanDate = formatDateKey(new Date())

  const derived = useMemo(
    () => deriveAppData({ data, selectedDate, selectedDateKey, taskPlanDate }),
    [data, selectedDate, selectedDateKey, taskPlanDate],
  )

  const activeLog = useMemo(
    () => deriveActiveLog({ selectedLogId, selectedScheduleItemId, derived }),
    [selectedLogId, selectedScheduleItemId, derived],
  )

  const activeLogSourceName = activeLog ? derived.sourcesById[activeLog.source_id]?.name || 'Forrás nélkül' : ''
  const activeLogBlockName = activeLog ? getRoutineBlockLabel(derived.blocksById[activeLog.routine_block_id]?.name || 'Blokk') : ''

  useEffect(() => {
    setHabitProgressValues(buildHabitProgressState(data.habits, data.habit_logs, selectedDateKey))
  }, [data.habits, data.habit_logs, selectedDateKey])

  useEffect(() => {
    setHabitDraftValues(buildHabitDraftState(data.habits))
  }, [data.habits])

  useEffect(() => {
    setSelectedLogId(null)
    setSelectedScheduleItemId(null)
    setCompletionValues(createDefaultCompletionForm())
    setThoughtForm(createDefaultThoughtForm())
    setThoughtSaveState('idle')
  }, [selectedDateKey])

  useEffect(() => {
    setCompletionValues(getCompletionFormValues(activeLog))
  }, [activeLog])

  function applyStartedRoutineLocally(log, scheduleItem) {
    setData((current) => {
      const hasMatchingLog = current.activity_logs.some((entry) => entry.id === log.id)

      return {
        ...current,
        schedule_items: current.schedule_items.map((item) =>
          item.id === scheduleItem.id ? { ...item, status: 'in_progress' } : item,
        ),
        activity_logs: hasMatchingLog
          ? current.activity_logs.map((entry) => (entry.id === log.id ? { ...entry, ...log } : entry))
          : [{ ...log }, ...current.activity_logs],
      }
    })
  }

  function resetTodayOffset() {
    setTodayOffset(0)
  }

  function goToPreviousDay() {
    setTodayOffset((current) => current - 1)
  }

  function goToNextDay() {
    setTodayOffset((current) => current + 1)
  }

  async function handleStart(itemOrBlock) {
    const scheduleItem = itemOrBlock.activeSchedule || itemOrBlock
    const routineBlock = derived.blocksById[scheduleItem.routine_block_id]

    if (!scheduleItem) return

    try {
      setError('')
      const log = await startRoutine({ scheduleItem, routineBlock })
      applyStartedRoutineLocally(log, scheduleItem)

      try {
        await reloadState(selectedDateWeekOffset)
      } catch (reloadError) {
        console.error('A blokk elindult, de az állapot újratöltése nem sikerült.', reloadError)
      }

      showToast('success', 'A blokk elindult.')
    } catch (startError) {
      const details = startError?.message ? ` ${startError.message}` : ''
      setError(`A blokk indítása nem sikerült.${details}`)
      showToast('error', 'A blokk indítása nem sikerült.')
    }
  }

  async function handleComplete() {
    if (!activeLog) return

    try {
      setError('')
      await completeRoutine({
        logId: activeLog.id,
        scheduleItemId: activeLog.schedule_item_id,
        routineBlockId: activeLog.routine_block_id,
        sourceId: activeLog.source_id,
        ...completionValues,
      })
      await reloadState(selectedDateWeekOffset)
      setSelectedLogId(null)
      setSelectedScheduleItemId(null)
      setCompletionValues(createDefaultCompletionForm())
      showToast('success', activeLog.id ? 'A napló frissítve.' : 'A napló rögzítve.')
    } catch {
      setError('A napló rögzítése nem sikerült.')
      showToast('error', 'A napló rögzítése nem sikerült.')
    }
  }

  function handleTodayViewSelectLog(scheduleItem) {
    setSelectedLogId(scheduleItem?.logId || scheduleItem?.activeLogId || null)
    setSelectedScheduleItemId(scheduleItem?.id || null)
    activityPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleThoughtChange(value) {
    setThoughtForm({ content: value })
    setThoughtSaveState('idle')
  }

  async function handleThoughtSave(rawContent = thoughtForm.content) {
    const content = rawContent.trim()

    if (!content) {
      setThoughtSaveState('idle')
      return false
    }

    if (thoughtSaveState === 'saving') {
      return false
    }

    try {
      setError('')
      setThoughtSaveState('saving')
      await saveThoughtEntry({
        entry_date: selectedDateKey,
        content,
      })
      await reloadState(selectedDateWeekOffset)
      setThoughtForm(createDefaultThoughtForm())
      setThoughtSaveState('saved')
      return true
    } catch (saveError) {
      setThoughtSaveState('idle')
      setError(`A gondolat mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A gondolat mentése nem sikerült.')
      return false
    }
  }

  function handleCompletionChange(field, value) {
    setCompletionValues((current) => ({ ...current, [field]: value }))
  }

  function handleHabitFormChange(field, value) {
    setHabitForm((current) => ({ ...current, [field]: value }))
  }

  async function handleHabitCreate() {
    try {
      setError('')
      await saveHabit({
        name: habitForm.name,
        daily_target: habitForm.dailyTarget,
        unit: habitForm.unit,
      })
      await reloadState(selectedDateWeekOffset)
      setHabitForm(createDefaultHabitForm())
      showToast('success', 'A szokás elmentve.')
      return true
    } catch (saveError) {
      setError(`A szokás mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A szokás mentése nem sikerült.')
      return false
    }
  }

  function handleHabitDraftChange(habitId, field, value) {
    setHabitDraftValues((current) => ({
      ...current,
      [habitId]: {
        ...(current[habitId] || {}),
        [field]: value,
      },
    }))
  }

  async function handleHabitSave(habit) {
    const draftValue = habitDraftValues[habit.id]

    if (!draftValue) return

    try {
      setError('')
      await saveHabit({
        id: habit.id,
        name: draftValue.name,
        daily_target: draftValue.dailyTarget,
        unit: draftValue.unit,
        is_active: habit.is_active,
      })
      await reloadState(selectedDateWeekOffset)
      showToast('success', 'A napi cél frissítve.')
    } catch (saveError) {
      setError(`A szokás frissítése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A szokás frissítése nem sikerült.')
    }
  }

  async function handleHabitDelete(habit) {
    if (!window.confirm(`Biztos törölni szeretnéd ezt a szokást: ${habit.name}?`)) {
      return
    }

    try {
      setError('')
      await deleteHabit(habit.id)
      await reloadState(selectedDateWeekOffset)
      showToast('success', 'A szokás törölve.')
    } catch (deleteError) {
      setError(`A szokás törlése nem sikerült. ${deleteError?.message || ''}`.trim())
      showToast('error', 'A szokás törlése nem sikerült.')
    }
  }

  async function handleHabitProgressSave(habit, nextValue = null) {
    const rawValue = nextValue ?? habitProgressValues[habit.id] ?? '0'
    const completedCount = Number(rawValue)

    try {
      setError('')
      await saveHabitLog({
        id: data.habit_logs.find((entry) => entry.habit_id === habit.id && entry.target_date === selectedDateKey)?.id,
        habit_id: habit.id,
        target_date: selectedDateKey,
        completed_count: Number.isFinite(completedCount) ? completedCount : 0,
      })
      setHabitProgressValues((current) => ({
        ...current,
        [habit.id]: String(Math.max(0, Math.floor(completedCount || 0))),
      }))
      await reloadState(selectedDateWeekOffset)
      showToast('success', 'A napi szokásrögzítés elmentve.')
    } catch (saveError) {
      setError(`A napi szokásrögzítés nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A napi szokásrögzítés nem sikerült.')
    }
  }

  function handleHabitProgressChange(habitId, nextValue) {
    setHabitProgressValues((current) => ({ ...current, [habitId]: nextValue }))
  }

  function handleHabitProgressStep(habit, delta) {
    const currentValue = Number(habitProgressValues[habit.id] ?? 0)
    const nextValue = String(Math.max(0, currentValue + delta))
    setHabitProgressValues((current) => ({ ...current, [habit.id]: nextValue }))
    void handleHabitProgressSave(habit, nextValue)
  }

  async function handleHabitAvailabilityRetry() {
    resetHabitTableAvailabilityCache()

    try {
      setError('')
      const isAvailable = await checkHabitTableAvailability()
      await reloadState(selectedDateWeekOffset)
      showToast('success', isAvailable ? 'A szokáskövető aktív.' : 'A szokáskövető táblái még hiányoznak.')
    } catch (loadError) {
      setError(loadError?.message || 'Az újraellenőrzés nem sikerült.')
      showToast('error', 'Az újraellenőrzés nem sikerült.')
    }
  }

  return {
    todayOffset,
    selectedDateKey,
    selectedDateLabel,
    selectedDateWeekOffset,
    taskPlanDate,
    derived,
    activityPanelRef,
    thoughtForm,
    thoughtSaveState,
    completionValues,
    activeLog,
    activeLogSourceName,
    activeLogBlockName,
    habitForm,
    habitDraftValues,
    habitProgressValues,
    resetTodayOffset,
    goToPreviousDay,
    goToNextDay,
    handleStart,
    handleComplete,
    handleTodayViewSelectLog,
    handleThoughtChange,
    handleThoughtSave,
    handleCompletionChange,
    handleHabitFormChange,
    handleHabitCreate,
    handleHabitDraftChange,
    handleHabitSave,
    handleHabitDelete,
    handleHabitProgressChange,
    handleHabitProgressSave,
    handleHabitProgressStep,
    handleHabitAvailabilityRetry,
  }
}
