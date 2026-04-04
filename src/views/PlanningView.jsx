import { RichTextContent } from '../components/RichText.jsx'
import { useTaskPlannerUi, useThoughtsArchive } from '../hooks/usePlanningUi.js'
import { stripRichText } from '../lib/rich-text.js'
import { taskPriorityOptions } from './shared.js'
import { ChevronIcon, TrashIcon } from './view-icons.jsx'

function formatHungarianDateTime(value) {
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function ThoughtsArchive({ entries, isAvailable, onDelete }) {
  const {
    currentPage,
    totalPages,
    visibleEntries,
    visibleStart,
    visibleEnd,
    goToPreviousPage,
    goToNextPage,
  } = useThoughtsArchive(entries)

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
          <div className="library-toolbar thought-pagination-toolbar">
            <p className="micro-copy pagination-meta">
              {visibleStart}-{visibleEnd}. elem / {entries.length}
            </p>

            <div className="pagination-controls thought-pagination-controls" aria-label="Gondolatnapló lapozása">
              <button
                type="button"
                className="icon-button pagination-icon-button"
                aria-label="Előző oldal"
                title="Előző oldal"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronIcon direction="left" />
              </button>
              <span className="pill subtle-pill">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                className="icon-button pagination-icon-button"
                aria-label="Következő oldal"
                title="Következő oldal"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronIcon direction="right" />
              </button>
            </div>
          </div>

          <div className="thought-list">
            {visibleEntries.map((entry) => {
              const createdAtLabel = formatHungarianDateTime(entry.created_at)

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
                  <RichTextContent
                    className="rich-text-content rich-text-preview"
                    value={entry.content}
                    title={stripRichText(entry.content)}
                  />
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
  deletingTaskIds,
  onFormChange,
  onSubmit,
  onComplete,
  onDelete,
  onPriorityChange,
  onDescriptionSave,
}) {
  const {
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
    goToPreviousHistoryPage,
    goToNextHistoryPage,
  } = useTaskPlannerUi({
    activeTasks,
    completedTasks,
    onDescriptionSave,
  })

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
                  const isDeleting = Boolean(deletingTaskIds[task.id])
                  const isEditingDescription = editingTaskId === task.id

                  return (
                    <article className={index === 0 ? 'task-item task-item-next' : 'task-item'} key={task.id}>
                      <label className="task-check">
                        <input
                          type="checkbox"
                          checked={isCompleting}
                          disabled={isCompleting || isUpdating || isDeleting}
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
                              disabled={isCompleting || isUpdating || isDeleting}
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
                            disabled={isCompleting || isUpdating || isDeleting}
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
                            disabled={isCompleting || isUpdating || isDeleting}
                            onClick={() => startDescriptionEdit(task)}
                          >
                            {task.description}
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        className="icon-button task-delete-button"
                        aria-label="Feladat törlése"
                        title="Feladat törlése"
                        disabled={isCompleting || isUpdating || isDeleting}
                        onClick={() => void onDelete(task)}
                      >
                        <TrashIcon />
                      </button>
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
              <strong>Lezárt feladatok</strong>
              <span className="pill">{completedTasks.length} db</span>
            </div>

            {completedTasks.length ? (
              <>
                <div className="library-toolbar task-pagination-toolbar">
                  <p className="micro-copy pagination-meta">
                    {visibleTaskHistoryStart}-{visibleTaskHistoryEnd}. elem / {completedTasks.length}
                  </p>

                  <div className="pagination-controls task-pagination-controls" aria-label="Lezárt feladatok lapozása">
                    <button
                      type="button"
                      className="icon-button pagination-icon-button"
                      aria-label="Előző oldal"
                      title="Előző oldal"
                      onClick={goToPreviousHistoryPage}
                      disabled={taskHistoryPage === 1}
                    >
                      <ChevronIcon direction="left" />
                    </button>
                    <span className="pill subtle-pill">
                      {taskHistoryPage}/{totalTaskHistoryPages}
                    </span>
                    <button
                      type="button"
                      className="icon-button pagination-icon-button"
                      aria-label="Következő oldal"
                      title="Következő oldal"
                      onClick={goToNextHistoryPage}
                      disabled={taskHistoryPage === totalTaskHistoryPages}
                    >
                      <ChevronIcon direction="right" />
                    </button>
                  </div>
                </div>

                <div className="task-history-list">
                  {visibleCompletedTasks.map((task) => {
                    const completedLabel = task.completed_at
                      ? formatHungarianDateTime(task.completed_at)
                      : 'Lezárás ideje nem ismert'
                    const isDeleting = Boolean(deletingTaskIds[task.id])

                    return (
                      <article className="task-history-item" key={task.id}>
                        <div className="task-history-head">
                          <div className="task-meta">
                            <span className="pill subtle-pill task-priority-pill">{task.priority}</span>
                            <span>{task.plan_date || '-'} • {completedLabel}</span>
                          </div>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Feladat törlése"
                            title="Feladat törlése"
                            disabled={isDeleting}
                            onClick={() => void onDelete(task)}
                          >
                            <TrashIcon />
                          </button>
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

export default function PlanningView({ loading, tasks, thoughts }) {
  return loading ? (
    <>
      <TaskPlannerSkeleton />
      <ThoughtsArchiveSkeleton />
    </>
  ) : (
    <>
      <TaskPlanner
        planDate={tasks.planDate}
        activeTasks={tasks.activeItems}
        completedTasks={tasks.completedItems}
        isAvailable={tasks.isAvailable}
        formValues={tasks.form}
        completingTaskIds={tasks.completingIds}
        updatingTaskIds={tasks.updatingIds}
        deletingTaskIds={tasks.deletingIds}
        onFormChange={tasks.onFormChange}
        onSubmit={tasks.onSubmit}
        onComplete={tasks.onComplete}
        onDelete={tasks.onDelete}
        onPriorityChange={tasks.onPriorityChange}
        onDescriptionSave={tasks.onDescriptionSave}
      />
      <ThoughtsArchive
        entries={thoughts.entries}
        isAvailable={thoughts.isAvailable}
        onDelete={thoughts.onDelete}
      />
    </>
  )
}
