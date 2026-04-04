import { useEffect, useMemo, useState } from 'react'

const THOUGHTS_PAGE_SIZE = 5
const TASK_HISTORY_PAGE_SIZE = 3

export function useThoughtsArchive(entries) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(entries.length / THOUGHTS_PAGE_SIZE))

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  const visibleEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * THOUGHTS_PAGE_SIZE
    return entries.slice(startIndex, startIndex + THOUGHTS_PAGE_SIZE)
  }, [currentPage, entries])

  const visibleStart = entries.length ? (currentPage - 1) * THOUGHTS_PAGE_SIZE + 1 : 0
  const visibleEnd = Math.min(currentPage * THOUGHTS_PAGE_SIZE, entries.length)

  return {
    currentPage,
    totalPages,
    visibleEntries,
    visibleStart,
    visibleEnd,
    goToPreviousPage: () => setCurrentPage((page) => Math.max(1, page - 1)),
    goToNextPage: () => setCurrentPage((page) => Math.min(totalPages, page + 1)),
  }
}

export function useTaskPlannerUi({ activeTasks, completedTasks, onDescriptionSave }) {
  const nextTask = activeTasks[0] || null
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [taskHistoryPage, setTaskHistoryPage] = useState(1)
  const totalTaskHistoryPages = Math.max(1, Math.ceil(completedTasks.length / TASK_HISTORY_PAGE_SIZE))

  useEffect(() => {
    setTaskHistoryPage((page) => Math.min(page, totalTaskHistoryPages))
  }, [totalTaskHistoryPages])

  const visibleCompletedTasks = useMemo(() => {
    const startIndex = (taskHistoryPage - 1) * TASK_HISTORY_PAGE_SIZE
    return completedTasks.slice(startIndex, startIndex + TASK_HISTORY_PAGE_SIZE)
  }, [completedTasks, taskHistoryPage])

  const visibleTaskHistoryStart = completedTasks.length ? (taskHistoryPage - 1) * TASK_HISTORY_PAGE_SIZE + 1 : 0
  const visibleTaskHistoryEnd = Math.min(taskHistoryPage * TASK_HISTORY_PAGE_SIZE, completedTasks.length)

  useEffect(() => {
    if (!editingTaskId) return

    const stillActive = activeTasks.some((task) => task.id === editingTaskId)
    if (!stillActive) {
      setEditingTaskId(null)
      setDescriptionDraft('')
    }
  }, [activeTasks, editingTaskId])

  function startDescriptionEdit(task) {
    if (!task?.id) return
    setEditingTaskId(task.id)
    setDescriptionDraft(task.description || '')
  }

  function cancelDescriptionEdit() {
    setEditingTaskId(null)
    setDescriptionDraft('')
  }

  async function submitDescriptionEdit(task) {
    const nextDescription = descriptionDraft.trim()
    const currentDescription = task.description?.trim() || ''

    if (!nextDescription) {
      return false
    }

    if (nextDescription === currentDescription) {
      cancelDescriptionEdit()
      return true
    }

    const isSaved = await onDescriptionSave(task, nextDescription)
    if (isSaved) {
      cancelDescriptionEdit()
    }

    return isSaved
  }

  return {
    nextTask,
    editingTaskId,
    descriptionDraft,
    setDescriptionDraft,
    taskHistoryPage,
    totalTaskHistoryPages,
    visibleCompletedTasks,
    visibleTaskHistoryStart,
    visibleTaskHistoryEnd,
    startDescriptionEdit,
    cancelDescriptionEdit,
    submitDescriptionEdit,
    goToPreviousHistoryPage: () => setTaskHistoryPage((page) => Math.max(1, page - 1)),
    goToNextHistoryPage: () => setTaskHistoryPage((page) => Math.min(totalTaskHistoryPages, page + 1)),
  }
}
