import { useEffect, useMemo, useState } from 'react'
import { taskPriorityOptions } from './shared.js'
import { TrashIcon } from './view-icons.jsx'

const THOUGHTS_PAGE_SIZE = 5
const TASK_HISTORY_PAGE_SIZE = 3

function ThoughtsArchive({ entries, isAvailable, onDelete }) {
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

  return (
    <section className="surface thought-archive">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gondolatnapló</p>
          <h2>Korábbi bejegyzések</h2>
        </div>
        <span className="pill">{entries.length} bejegyzés</span>
      </div>

      {!isAvailable ? (
        <div className="thought-unavailable">
          <p>A gondolatnapló táblája még nincs létrehozva az adatbázisban. Futtasd le a frissített `supabase/schema.sql` migrációt.</p>
        </div>
      ) : entries.length ? (
        <>
          <div className="library-toolbar">
            <p className="micro-copy pagination-meta">
              {visibleStart}-{visibleEnd}. elem / {entries.length}
            </p>

            <div className="pagination-controls" aria-label="Gondolatnapló lapozása">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Előző oldal
              </button>
              <span className="pill subtle-pill">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Következő oldal
              </button>
            </div>
          </div>

          <div className="thought-list">
            {visibleEntries.map((entry) => {
              const createdAtLabel = new Intl.DateTimeFormat('hu-HU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(entry.created_at))

              return (
                <article className="thought-card" key={entry.id}>
                  <div className="thought-card-head">
                    <div className="thought-card-meta">
                      <span className="pill subtle-pill">{entry.entry_date}</span>
                      <span>{createdAtLabel}</span>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Gondolat törlése: ${entry.entry_date}`}
                      title="Gondolat törlése"
                      onClick={() => onDelete(entry)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <p>{entry.content}</p>
                </article>
              )
            })}
          </div>
        </>
      ) : (
        <p className="empty-state">Még nincs rögzített gondolat. A főoldalon tudsz gyorsan felvenni új bejegyzést.</p>
      )}
    </section>
  )
}

function TaskPlanner({
  planDate,
  activeTasks,
  completedTasks,
  isAvailable,
  formValues,
  completingTaskIds,
  updatingTaskIds,
  onFormChange,
  onSubmit,
  onComplete,
  onPriorityChange,
  onDescriptionSave,
}) {
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

  return (
    <section className="surface task-planner">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tervezés</p>
          <h2>Prioritásos feladatlista</h2>
        </div>
        <span className="pill">{planDate}</span>
      </div>

      {!isAvailable ? (
        <div className="task-unavailable">
          <p>A feladatlista táblája még nincs létrehozva az adatbázisban. Futtasd le a frissített `supabase/schema.sql` migrációt.</p>
        </div>
      ) : (
        <>
          <div className="task-list-block">
            <div className="task-list-head">
              <strong>Aktív feladatok</strong>
              {nextTask ? <span className="pill subtle-pill">Következő: {nextTask.priority}</span> : <span className="pill subtle-pill">Nincs aktív</span>}
            </div>

            {activeTasks.length ? (
              <div className="task-list">
                {activeTasks.map((task, index) => {
                  const isCompleting = Boolean(completingTaskIds[task.id])
                  const isUpdating = Boolean(updatingTaskIds[task.id])
                  const isEditingDescription = editingTaskId === task.id

                  return (
                    <article className={index === 0 ? 'task-item task-item-next' : 'task-item'} key={task.id}>
                      <label className="task-check">
                        <input
                          type="checkbox"
                          checked={isCompleting}
                          disabled={isCompleting}
                          onChange={(event) => {
                            if (event.target.checked) {
                              void onComplete(task)
                            }
                          }}
                        />
                        <span />
                      </label>
                      <div className="task-main">
                        <div className="task-meta">
                          <div className="task-priority-control">
                            <select
                              className="task-priority-select"
                              value={task.priority}
                              disabled={isCompleting || isUpdating}
                              onChange={(event) => {
                                void onPriorityChange(task, event.target.value)
                              }}
                            >
                              {taskPriorityOptions.map((priorityOption) => (
                                <option key={priorityOption} value={priorityOption}>
                                  {priorityOption}
                                </option>
                              ))}
                            </select>
                          </div>
                          {index === 0 ? <span className="task-next-label">Most ez van soron</span> : null}
                        </div>
                        {isEditingDescription ? (
                          <input
                            className="task-description-input"
                            type="text"
                            value={descriptionDraft}
                            disabled={isCompleting || isUpdating}
                            autoFocus
                            onChange={(event) => setDescriptionDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                void submitDescriptionEdit(task)
                              }

                              if (event.key === 'Escape') {
                                event.preventDefault()
                                cancelDescriptionEdit()
                              }
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="task-description-trigger"
                            title="Leírás szerkesztése"
                            disabled={isCompleting || isUpdating}
                            onClick={() => startDescriptionEdit(task)}
                          >
                            {task.description}
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="empty-state">Nincs aktív feladat. Minden feladat lezárva.</p>
            )}
          </div>

          <form
            className="task-form"
            onSubmit={(event) => {
              event.preventDefault()
              void onSubmit()
            }}
          >
            <label>
              Prioritás
              <select value={formValues.priority} onChange={(event) => onFormChange('priority', event.target.value)}>
                {taskPriorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Feladat leírása
              <textarea
                rows="2"
                placeholder="Mit kell pontosan megcsinálni?"
                value={formValues.description}
                onChange={(event) => onFormChange('description', event.target.value)}
              />
            </label>

            <button type="submit">Feladat rögzítése</button>
          </form>

          <div className="task-list-block">
            <div className="task-list-head">
              <strong>Lezárt feladatok előzménye</strong>
              <span className="pill">{completedTasks.length} db</span>
            </div>

            {completedTasks.length ? (
              <>
                <div className="library-toolbar">
                  <p className="micro-copy pagination-meta">
                    {visibleTaskHistoryStart}-{visibleTaskHistoryEnd}. elem / {completedTasks.length}
                  </p>

                  <div className="pagination-controls" aria-label="Lezárt feladatok lapozása">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setTaskHistoryPage((page) => Math.max(1, page - 1))}
                      disabled={taskHistoryPage === 1}
                    >
                      Előző oldal
                    </button>
                    <span className="pill subtle-pill">
                      {taskHistoryPage}/{totalTaskHistoryPages}
                    </span>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setTaskHistoryPage((page) => Math.min(totalTaskHistoryPages, page + 1))}
                      disabled={taskHistoryPage === totalTaskHistoryPages}
                    >
                      Régebbiek
                    </button>
                  </div>
                </div>

                <div className="task-history-list">
                  {visibleCompletedTasks.map((task) => {
                    const completedLabel = task.completed_at
                      ? new Intl.DateTimeFormat('hu-HU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(task.completed_at))
                      : 'Lezárás ideje nem ismert'

                    return (
                      <article className="task-history-item" key={task.id}>
                        <div className="task-meta">
                          <span className="pill subtle-pill task-priority-pill">{task.priority}</span>
                          <span>{task.plan_date || '-'} • {completedLabel}</span>
                        </div>
                        <p>{task.description}</p>
                      </article>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="empty-state">Még nincs lezárt feladat.</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function ThoughtsArchiveSkeleton() {
  return (
    <section className="surface thought-archive">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gondolatnapló</p>
          <h2>Korábbi bejegyzések</h2>
        </div>
        <span className="skeleton-chip" />
      </div>

      <div className="thought-list">
        {Array.from({ length: 4 }, (_, index) => (
          <article className="thought-card" key={`thought-skeleton-${index}`}>
            <div className="thought-card-head">
              <span className="skeleton-chip" />
              <span className="skeleton-line skeleton-line-short" />
            </div>
            <div className="skeleton-copy">
              <span className="skeleton-line skeleton-line-full" />
              <span className="skeleton-line skeleton-line-full" />
              <span className="skeleton-line skeleton-line-medium" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function TaskPlannerSkeleton() {
  return (
    <section className="surface task-planner">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tervezés</p>
          <h2>Prioritásos feladatlista</h2>
        </div>
        <span className="skeleton-chip" />
      </div>

      <div className="task-form">
        <span className="skeleton-input" />
        <div className="skeleton-textarea" />
        <span className="skeleton-chip" />
      </div>

      <div className="task-list">
        {Array.from({ length: 3 }, (_, index) => (
          <article className="task-item" key={`task-skeleton-${index}`}>
            <span className="skeleton-chip" />
            <div className="skeleton-copy">
              <span className="skeleton-line skeleton-line-short" />
              <span className="skeleton-line skeleton-line-full" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function PlanningView({
  loading,
  taskPlanDate,
  activeTasks,
  completedTasks,
  taskEntriesAvailable,
  taskForm,
  completingTaskIds,
  updatingTaskIds,
  onTaskFormChange,
  onTaskSubmit,
  onTaskComplete,
  onTaskPriorityChange,
  onTaskDescriptionSave,
  thoughtEntries,
  thoughtEntriesAvailable,
  onThoughtDelete,
}) {
  return loading ? (
    <>
      <TaskPlannerSkeleton />
      <ThoughtsArchiveSkeleton />
    </>
  ) : (
    <>
      <TaskPlanner
        planDate={taskPlanDate}
        activeTasks={activeTasks}
        completedTasks={completedTasks}
        isAvailable={taskEntriesAvailable}
        formValues={taskForm}
        completingTaskIds={completingTaskIds}
        updatingTaskIds={updatingTaskIds}
        onFormChange={onTaskFormChange}
        onSubmit={onTaskSubmit}
        onComplete={onTaskComplete}
        onPriorityChange={onTaskPriorityChange}
        onDescriptionSave={onTaskDescriptionSave}
      />
      <ThoughtsArchive
        entries={thoughtEntries}
        isAvailable={thoughtEntriesAvailable}
        onDelete={onThoughtDelete}
      />
    </>
  )
}
