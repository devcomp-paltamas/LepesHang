import { useState } from 'react'
import { createDefaultTaskForm } from '../lib/app-state.js'
import {
  completeTaskEntry,
  deleteThoughtEntry,
  saveTaskEntry,
} from '../lib/store.js'

export default function usePlanningView({
  activeTasks,
  completedTasks,
  data,
  taskPlanDate,
  setError,
  showToast,
  reloadState,
}) {
  const [taskForm, setTaskForm] = useState(() => createDefaultTaskForm())
  const [completingTaskIds, setCompletingTaskIds] = useState({})
  const [updatingTaskIds, setUpdatingTaskIds] = useState({})

  function handleTaskFormChange(field, value) {
    setTaskForm((current) => ({ ...current, [field]: value }))
  }

  async function handleThoughtDelete(entry) {
    if (!window.confirm('Biztos törölni szeretnéd ezt a gondolatot?')) {
      return
    }

    try {
      setError('')
      await deleteThoughtEntry(entry.id)
      await reloadState()
      showToast('success', 'A gondolat törölve.')
    } catch (deleteError) {
      setError(`A gondolat törlése nem sikerült. ${deleteError?.message || ''}`.trim())
      showToast('error', 'A gondolat törlése nem sikerült.')
    }
  }

  async function handleTaskCreate() {
    try {
      setError('')
      await saveTaskEntry({
        plan_date: taskPlanDate,
        priority: taskForm.priority,
        description: taskForm.description,
      })
      await reloadState()
      setTaskForm((current) => ({ ...current, description: '' }))
      showToast('success', 'A feladat elmentve.')
      return true
    } catch (saveError) {
      setError(`A feladat mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A feladat mentése nem sikerült.')
      return false
    }
  }

  async function handleTaskComplete(task) {
    if (!task?.id || completingTaskIds[task.id]) return

    setCompletingTaskIds((current) => ({ ...current, [task.id]: true }))

    try {
      setError('')
      await completeTaskEntry(task.id)
      await reloadState()
      showToast('success', 'A feladat lezárva.')
    } catch (completeError) {
      setError(`A feladat lezárása nem sikerült. ${completeError?.message || ''}`.trim())
      showToast('error', 'A feladat lezárása nem sikerült.')
    } finally {
      setCompletingTaskIds((current) => {
        const next = { ...current }
        delete next[task.id]
        return next
      })
    }
  }

  async function handleTaskUpdate(task, payload, messages) {
    if (!task?.id || updatingTaskIds[task.id]) return

    const nextDescription = payload.description?.trim() || ''
    if (!nextDescription) {
      return false
    }

    setUpdatingTaskIds((current) => ({ ...current, [task.id]: true }))

    try {
      setError('')
      await saveTaskEntry({
        id: task.id,
        plan_date: task.plan_date || taskPlanDate,
        priority: payload.priority,
        description: nextDescription,
        is_completed: false,
      })
      await reloadState()
      if (messages?.successMessage) {
        showToast('success', messages.successMessage)
      }
      return true
    } catch (saveError) {
      const errorMessage = messages?.errorMessage || 'A feladat mentése nem sikerült.'
      setError(`${errorMessage} ${saveError?.message || ''}`.trim())
      showToast('error', errorMessage)
      return false
    } finally {
      setUpdatingTaskIds((current) => {
        const next = { ...current }
        delete next[task.id]
        return next
      })
    }
  }

  async function handleTaskPriorityChange(task, nextPriority) {
    return handleTaskUpdate(task, {
      priority: nextPriority,
      description: task.description,
    }, {
      successMessage: 'A prioritás frissítve.',
      errorMessage: 'A prioritás mentése nem sikerült.',
    })
  }

  async function handleTaskDescriptionChange(task, nextDescription) {
    return handleTaskUpdate(task, {
      priority: task.priority,
      description: nextDescription,
    }, {
      successMessage: 'A leírás frissítve.',
      errorMessage: 'A leírás mentése nem sikerült.',
    })
  }

  return {
    tasks: {
      planDate: taskPlanDate,
      activeItems: activeTasks,
      completedItems: completedTasks,
      isAvailable: data.task_entries_available,
      form: taskForm,
      completingIds: completingTaskIds,
      updatingIds: updatingTaskIds,
      onFormChange: handleTaskFormChange,
      onSubmit: handleTaskCreate,
      onComplete: handleTaskComplete,
      onPriorityChange: handleTaskPriorityChange,
      onDescriptionSave: handleTaskDescriptionChange,
    },
    thoughts: {
      entries: data.thought_entries,
      isAvailable: data.thought_entries_available,
      onDelete: handleThoughtDelete,
    },
  }
}
