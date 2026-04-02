import { useEffect, useMemo, useRef, useState } from 'react'
import logo from './assets/logo.png'
import { addDays, formatDateKey, formatWeekdayLabel, getWeekDates, isToday, startOfWeek } from './lib/date.js'
import {
  completeRoutine,
  checkHabitTableAvailability,
  deleteHabit,
  deleteOptionItem,
  deleteThoughtEntry,
  completeTaskEntry,
  loadAppState,
  resetHabitTableAvailabilityCache,
  saveDailyRecommendation,
  saveHabit,
  saveHabitLog,
  saveScheduleItem,
  saveOptionItem,
  saveSource,
  saveTaskEntry,
  saveThoughtEntry,
  saveWeeklyRecommendation,
  setSourceActive,
  startRoutine,
} from './lib/store.js'

const defaultCompletionForm = {
  completionStatus: 'done',
  rating: '5',
  notes: '',
}

const defaultPlannerEntry = {
  id: null,
  sourceId: '',
}

const defaultSourceForm = {
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

const defaultOptionForm = {
  provider: '',
  category: '',
}

const defaultRecommendationForm = {
  id: null,
  target_date: formatDateKey(new Date()),
  recommendation_text: '',
  reasoning_summary: '',
  recommended_source_id: '',
}

const defaultHabitForm = {
  name: '',
  dailyTarget: '1',
  unit: 'db',
}

const defaultThoughtForm = {
  content: '',
}

const defaultTaskForm = {
  priority: 'A1',
  description: '',
}

const taskPriorityOptions = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

const SOURCE_LIBRARY_PAGE_SIZE = 8
const THEME_PREFERENCE_KEY = 'lepeshang-theme-preference'

function getTaskPriorityRank(priority) {
  const normalized = String(priority || '').toUpperCase()
  const rank = taskPriorityOptions.indexOf(normalized)
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank
}

function getCompletionFormValues(log) {
  if (!log || log.completion_status === 'in_progress') {
    return { ...defaultCompletionForm }
  }

  return {
    completionStatus: log.completion_status || 'done',
    rating: log.rating ? String(log.rating) : '5',
    notes: log.notes || '',
  }
}

function getDefaultThemePreference() {
  const now = new Date()
  const totalMinutes = now.getHours() * 60 + now.getMinutes()
  return totalMinutes >= 375 && totalMinutes < 1020 ? 'day' : 'night'
}

function getThemeMode(themePreference) {
  return {
    label: themePreference === 'day' ? 'Nappali mód' : 'Éjjeli mód',
    themeClass: themePreference === 'day' ? 'theme-day' : 'theme-night',
  }
}

function getStatusLabel(status) {
  return (
    {
      planned: 'Tervezve',
      in_progress: 'Folyamatban',
      done: 'Kész',
      skipped: 'Kihagyva',
    }[status] || status
  )
}

function getContentTypeLabel(contentType) {
  return (
    {
      audio: 'Hanganyag',
      video: 'Videó',
      course: 'Kurzus',
      article: 'Cikk',
    }[contentType] || contentType
  )
}

function getRoutineBlockLabel(name) {
  return (
    {
      'Reggeli seta': 'Reggeli séta',
      'Esti onfejlesztes': 'Esti önfejlesztés',
    }[name] || name
  )
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M8 10v7" />
      <path d="M12 10v7" />
      <path d="M16 10v7" />
      <path d="M6 7l1 12h10l1-12" />
    </svg>
  )
}

function ChevronIcon({ direction = 'left' }) {
  const path = direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ThemeIcon({ theme = 'day' }) {
  return theme === 'day' ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2" strokeLinecap="round" />
      <path d="M12 19.3v2.2" strokeLinecap="round" />
      <path d="M4.9 4.9l1.6 1.6" strokeLinecap="round" />
      <path d="M17.5 17.5l1.6 1.6" strokeLinecap="round" />
      <path d="M2.5 12h2.2" strokeLinecap="round" />
      <path d="M19.3 12h2.2" strokeLinecap="round" />
      <path d="M4.9 19.1l1.6-1.6" strokeLinecap="round" />
      <path d="M17.5 6.5l1.6-1.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M18.5 14.6A7.5 7.5 0 0 1 9.4 5.5 8.6 8.6 0 1 0 18.5 14.6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AppHeader({ loading, activeView, onViewChange }) {
  return (
    <header className="app-header">
      <div className="header-grid">
        <div>
          <p className="eyebrow">LepesHang</p>
          <h1>A rutinod ne kérjen újabb döntést hajnalban.</h1>
          <p className="intro">
            A nyitó nézet csak a mai blokkjaidat mutatja. A tervezés és a forráskarbantartás külön felületen marad.
          </p>
        </div>

        <div className="header-side">
          <div className="hero-meta">
            <span className="pill">{loading ? 'Betöltés' : 'Adatbázis-kapcsolat aktív'}</span>
          </div>

          <div className="view-switcher" role="tablist" aria-label="Fő nézetek">
            <button
              type="button"
              className={activeView === 'today' ? 'view-button active' : 'view-button'}
              onClick={() => onViewChange('today')}
            >
              Mai nap
            </button>
            <button
              type="button"
              className={activeView === 'thoughts' ? 'view-button active' : 'view-button'}
              onClick={() => onViewChange('thoughts')}
            >
              Gondolatok + tervezés
            </button>
            <button
              type="button"
              className={activeView === 'details' ? 'view-button active' : 'view-button'}
              onClick={() => onViewChange('details')}
            >
              Kiegészítők
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function BlockStrip({
  routineCards,
  dateKey,
  dateLabel,
  isCurrentDay,
  loading,
  onPreviousDay,
  onNextDay,
  onStart,
  onSelectLog,
}) {
  return (
    <section className="today-strip-shell" aria-label="Napi rutin blokkok">
      <button
        type="button"
        className="day-nav-button"
        aria-label="Előző nap"
        onClick={onPreviousDay}
        disabled={loading}
      >
        <ChevronIcon direction="left" />
      </button>

      <div className="today-strip-main">
        <div className="today-strip-heading">
          <div>
            <p className="eyebrow">{isCurrentDay ? 'Mai nézet' : 'Napi nézet'}</p>
            <h2>{dateLabel}</h2>
          </div>
          <span className="pill">{isCurrentDay ? 'Ma' : dateKey}</span>
        </div>

        <div className="block-strip">
          {routineCards.map((block) => (
            <article className="block-panel" key={block.id}>
              <div className="block-topline">
                <span>{getRoutineBlockLabel(block.name)}</span>
                <span>{block.statusLabel}</span>
              </div>
              <p className="block-summary">{block.summary}</p>

              {block.activeSchedule ? (
                <div className="block-item">
                  <div className="block-item-main">
                    <strong>{block.activeSchedule.title}</strong>
                    <p>{block.activeSchedule.provider}</p>
                    {block.activeSchedule.notes ? (
                      <p className="block-note-preview" title={block.activeSchedule.notes}>
                        {block.activeSchedule.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="block-footer">
                    {block.activeSchedule.status === 'in_progress' ? (
                      <button type="button" onClick={() => onSelectLog(block.activeSchedule)}>
                        Lezárás
                      </button>
                    ) : block.activeSchedule.status === 'planned' ? (
                      <button type="button" onClick={() => onStart(block)}>
                        {block.cta}
                      </button>
                    ) : (
                      <button type="button" className="secondary-button" onClick={() => onSelectLog(block.activeSchedule)}>
                        Megjegyzés szerkesztése
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="empty-state">Ehhez a blokkhoz erre a napra nincs kijelölt forrás.</p>
              )}
            </article>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="day-nav-button"
        aria-label="Következő nap"
        onClick={onNextDay}
        disabled={loading}
      >
        <ChevronIcon direction="right" />
      </button>
    </section>
  )
}

function WeekSwitcher({ weekOffset, onChange }) {
  return (
    <section className="surface week-switcher">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Heti nézet</p>
          <h2>Melyik hetet szerkeszted?</h2>
        </div>
      </div>
      <div className="week-switcher-actions">
        <button
          type="button"
          className={weekOffset === 0 ? 'toggle-button active' : 'toggle-button'}
          onClick={() => onChange(0)}
        >
          Aktuális hét
        </button>
        <button
          type="button"
          className={weekOffset === 1 ? 'toggle-button active' : 'toggle-button'}
          onClick={() => onChange(1)}
        >
          Következő hét
        </button>
      </div>
    </section>
  )
}

function ActivityPanel({ activeLog, sourceName, blockName, values, onChange, onSubmit, panelRef, isCurrentDay }) {
  const isEditingCompletedLog = activeLog && activeLog.completion_status !== 'in_progress'
  const panelClassName = activeLog ? 'surface activity-panel' : 'surface activity-panel activity-panel-collapsed'

  return (
    <section className={panelClassName} ref={panelRef}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isCurrentDay ? 'Mai rögzítés' : 'Napi rögzítés'}</p>
          <h2>
            {activeLog
              ? isEditingCompletedLog
                ? 'Lezárt blokk megjegyzése'
                : 'Aktív blokk lezárása'
              : 'A napi blokkok itt zárhatók le'}
          </h2>
        </div>
        {activeLog ? <span className="pill">{isEditingCompletedLog ? 'Szerkesztés' : 'Naplóbejegyzés aktív'}</span> : null}
      </div>

      {activeLog ? (
        <form
          className="completion-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className="log-highlight">
            <strong>{blockName}</strong>
            <span>{sourceName}</span>
          </div>

          <div className="form-grid">
            <label>
              Állapot
              <select
                value={values.completionStatus}
                onChange={(event) => onChange('completionStatus', event.target.value)}
              >
                <option value="done">Kész</option>
                <option value="partial">Részleges</option>
                <option value="missed">Kimaradt</option>
              </select>
            </label>

            <label>
              Értékelés
              <select value={values.rating} onChange={(event) => onChange('rating', event.target.value)}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} csillag
                  </option>
                ))}
              </select>
            </label>

          </div>

          <label>
            Megjegyzés
            <textarea
              rows="4"
              value={values.notes}
              onChange={(event) => onChange('notes', event.target.value)}
            />
          </label>

          <button type="submit">{isEditingCompletedLog ? 'Módosítás mentése' : 'Rögzítés'}</button>
        </form>
      ) : (
        <p className="empty-state">Indíts el egy mai blokkot, és itt tudod majd lezárni a rögzítést.</p>
      )}
    </section>
  )
}

function BlockStripSkeleton({ dateKey, dateLabel, isCurrentDay }) {
  return (
    <section className="today-strip-shell skeleton-shell" aria-label="Napi rutin blokkok betöltése">
      <div className="day-nav-button skeleton-block" aria-hidden="true" />

      <div className="today-strip-main">
        <div className="today-strip-heading">
          <div>
            <p className="eyebrow">{isCurrentDay ? 'Mai nézet' : 'Napi nézet'}</p>
            <h2>{dateLabel}</h2>
          </div>
          <span className="pill">{isCurrentDay ? 'Ma' : dateKey}</span>
        </div>

        <div className="block-strip">
          {Array.from({ length: 2 }, (_, index) => (
            <article className="block-panel" key={`block-skeleton-${index}`}>
              <div className="block-topline">
                <span className="skeleton-line skeleton-line-short" />
                <span className="skeleton-line skeleton-line-tiny" />
              </div>
              <div className="skeleton-copy">
                <span className="skeleton-line skeleton-line-full" />
                <span className="skeleton-line skeleton-line-medium" />
              </div>

              <div className="block-item">
                <div className="block-item-main">
                  <span className="skeleton-line skeleton-line-medium" />
                  <span className="skeleton-line skeleton-line-short" />
                </div>
                <div className="block-footer">
                  <span className="skeleton-chip" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="day-nav-button skeleton-block" aria-hidden="true" />
    </section>
  )
}

function ThoughtCapture({ selectedDateKey, isCurrentDay, value, onChange, onSubmit, onBlurSave, saveState, isAvailable }) {
  const statusLabel =
    saveState === 'saving'
      ? 'Mentés...'
      : saveState === 'saved'
        ? 'Mentve'
        : value.trim()
          ? 'Kilépéskor mentjük'
          : 'Üres jegyzet'

  return (
    <section className="surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isCurrentDay ? 'Mai gondolat' : 'Napi gondolat'}</p>
        </div>
        <div className="thought-meta">
          <span className={saveState === 'saved' ? 'pill thought-status-pill saved' : 'pill thought-status-pill'}>
            {statusLabel}
          </span>
          {/* <span className="pill">{selectedDateKey}</span> */}
        </div>
      </div>

      {isAvailable ? (
        <form className="thought-form">
          <label>
            Mi jár most a fejedben?
            <textarea
              rows="2"
              value={value}
              placeholder="Rövid meglátás, felismerés vagy bármi, amit később visszaolvasnál."
              onChange={(event) => onChange(event.target.value)}
              onBlur={() => onBlurSave()}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  onSubmit()
                }
              }}
            />
          </label>
          <p className="micro-copy" style={{ margin: 0 }}>Kilépéskor automatikusan mentjük. Gyors mentés: `Ctrl/Cmd + Enter`.</p>
        </form>
      ) : (
        <div className="thought-unavailable">
          <p>A gondolatnapló táblája még nincs létrehozva az adatbázisban. Futtasd le a frissített `supabase/schema.sql` migrációt.</p>
        </div>
      )
      }
    </section >
  )
}

function ThoughtCaptureSkeleton({ selectedDateKey, isCurrentDay }) {
  return (
    <section className="surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isCurrentDay ? 'Mai gondolat' : 'Napi gondolat'}</p>
          <h2>Gyors jegyzet</h2>
        </div>
        <div className="thought-meta">
          <span className="skeleton-chip" />
          <span className="pill">{selectedDateKey}</span>
        </div>
      </div>

      <div className="thought-form">
        <span className="skeleton-line skeleton-line-short" />
        <div className="skeleton-textarea" />
        <span className="skeleton-line skeleton-line-medium" />
      </div>
    </section>
  )
}

function ThoughtsArchive({ entries, isAvailable, onDelete }) {
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
        <div className="thought-list">
          {entries.map((entry) => {
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
              <div className="task-history-list">
                {completedTasks.map((task) => {
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

function HabitTrackerSkeleton({ selectedDateKey, isCurrentDay }) {
  return (
    <section className="surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isCurrentDay ? 'Mai szokások' : 'Napi szokások'}</p>
          <h2>Szokáskövető</h2>
        </div>
        <span className="pill">{selectedDateKey}</span>
      </div>

      <div className="habit-list">
        {Array.from({ length: 2 }, (_, index) => (
          <article className="habit-card" key={`habit-skeleton-${index}`}>
            <div className="habit-card-head">
              <div className="skeleton-copy">
                <span className="skeleton-line skeleton-line-short" />
                <span className="skeleton-line skeleton-line-tiny" />
              </div>
              <span className="skeleton-chip" />
            </div>
            <div className="habit-card-layout">
              <div className="habit-settings-row skeleton-grid-three">
                <span className="skeleton-input" />
                <span className="skeleton-input" />
                <span className="skeleton-input" />
                <span className="skeleton-chip" />
              </div>
              <div className="habit-progress-row skeleton-progress-row">
                <span className="skeleton-chip" />
                <span className="skeleton-input" />
                <span className="skeleton-chip" />
                <span className="skeleton-chip" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ActivityPanelSkeleton({ isCurrentDay }) {
  return (
    <section className="surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isCurrentDay ? 'Mai rögzítés' : 'Napi rögzítés'}</p>
          <h2>A napi blokkok itt zárhatók le</h2>
        </div>
        <span className="skeleton-chip" />
      </div>

      <div className="completion-form">
        <div className="log-highlight">
          <div className="skeleton-copy">
            <span className="skeleton-line skeleton-line-short" />
            <span className="skeleton-line skeleton-line-medium" />
          </div>
        </div>
        <div className="form-grid">
          <span className="skeleton-input" />
          <span className="skeleton-input" />
        </div>
        <div className="skeleton-textarea" />
        <span className="skeleton-chip" />
      </div>
    </section>
  )
}

function DetailsViewSkeleton() {
  return (
    <>
      <section className="surface week-switcher">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Heti nézet</p>
            <h2>Melyik hetet szerkeszted?</h2>
          </div>
        </div>
        <div className="week-switcher-actions">
          <span className="skeleton-chip skeleton-chip-wide" />
          <span className="skeleton-chip skeleton-chip-wide" />
        </div>
      </section>

      <section className="surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tervezés</p>
            <h2>Heti beosztás</h2>
          </div>
          <span className="skeleton-chip" />
        </div>
        <div className="planner-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <article className="planner-day" key={`planner-skeleton-${index}`}>
              <div className="planner-day-head">
                <span className="skeleton-line skeleton-line-short" />
                <span className="skeleton-line skeleton-line-tiny" />
              </div>
              <div className="planner-slot">
                <span className="skeleton-line skeleton-line-short" />
                <span className="skeleton-input" />
              </div>
              <div className="planner-slot">
                <span className="skeleton-line skeleton-line-short" />
                <span className="skeleton-input" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="details-grid">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="surface" key={`details-skeleton-${index}`}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Betöltés</p>
                <h2>Tartalom előkészítése</h2>
              </div>
            </div>
            <div className="skeleton-copy">
              <span className="skeleton-line skeleton-line-full" />
              <span className="skeleton-line skeleton-line-full" />
              <span className="skeleton-line skeleton-line-medium" />
            </div>
          </div>
        ))}
      </section>
    </>
  )
}

function HabitTracker({
  habits,
  isAvailable,
  availabilityStatus,
  selectedDateKey,
  isCurrentDay,
  habitForm,
  habitDraftValues,
  habitProgressValues,
  habitLogsByKey,
  historyDays,
  onHabitFormChange,
  onHabitCreate,
  onHabitDraftChange,
  onHabitSave,
  onHabitDelete,
  onProgressChange,
  onProgressSave,
  onProgressStep,
  onRetryAvailabilityCheck,
}) {
  const [isCreatingHabit, setIsCreatingHabit] = useState(false)
  const newHabitNameInputRef = useRef(null)

  const availabilityMessage =
    availabilityStatus === 'missing'
      ? 'A szokáskövető táblák még nincsenek létrehozva a Supabase adatbázisban. Futtasd le a frissített `supabase/schema.sql` migrációt, és utána ellenőrizd újra.'
      : 'A szokáskövető jelenleg nincs aktiválva. Ha már lefuttattad a migrációt a Supabase adatbázison, ellenőrizd itt az elérhetőségét.'
  const availabilityButtonLabel = availabilityStatus === 'missing' ? 'Újraellenőrzés' : 'Szokáskövető ellenőrzése'

  useEffect(() => {
    if (!isCreatingHabit || !newHabitNameInputRef.current) return undefined

    const frameId = window.requestAnimationFrame(() => {
      newHabitNameInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isCreatingHabit])

  async function handleHabitCreateSubmit() {
    const result = await onHabitCreate()
    if (result) {
      setIsCreatingHabit(false)
    }
  }

  return (
    <section className="surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isCurrentDay ? 'Mai szokások' : 'Napi szokások'}</p>
          <h2>Szokáskövető</h2>
        </div>
        <span className="pill">{selectedDateKey}</span>
      </div>

      {!isAvailable ? (
        <div className="habit-unavailable">
          <p>{availabilityMessage}</p>
          <button type="button" className="secondary-button" onClick={onRetryAvailabilityCheck}>
            {availabilityButtonLabel}
          </button>
        </div>
      ) : null}

      {isAvailable ? (
        <>
          {isCreatingHabit ? (
            <form
              className="habit-form"
              onSubmit={(event) => {
                event.preventDefault()
                void handleHabitCreateSubmit()
              }}
            >
              <div className="habit-form-head">
                <div>
                  <strong>Új szokás</strong>
                  <p className="micro-copy">Rövid, napi célú szokásokat érdemes ide felvenni.</p>
                </div>
                <button
                  type="button"
                  className="ghost-button habit-form-cancel"
                  onClick={() => setIsCreatingHabit(false)}
                >
                  Mégse
                </button>
              </div>

              <div className="habit-form-grid">
                <label>
                  Szokás neve
                  <input
                    ref={newHabitNameInputRef}
                    value={habitForm.name}
                    placeholder="Például: Médium cikk olvasása"
                    onChange={(event) => onHabitFormChange('name', event.target.value)}
                  />
                </label>

                <label>
                  Napi cél
                  <input
                    type="number"
                    min="1"
                    value={habitForm.dailyTarget}
                    onChange={(event) => onHabitFormChange('dailyTarget', event.target.value)}
                  />
                </label>

                <label>
                  Mértékegység
                  <input
                    value={habitForm.unit}
                    placeholder="db"
                    onChange={(event) => onHabitFormChange('unit', event.target.value)}
                  />
                </label>
              </div>

              <button type="submit" className="habit-inline-submit">Hozzáad</button>
            </form>
          ) : (
            <div className="habit-create-toggle">
              <button
                type="button"
                className="secondary-button habit-create-button"
                onClick={() => setIsCreatingHabit(true)}
              >
                Új szokás felvétele
              </button>
            </div>
          )}

          <div className="habit-list">
            {habits.length ? (
              habits.map((habit) => {
                const draftValue = habitDraftValues[habit.id] || {
                  name: habit.name,
                  dailyTarget: String(habit.daily_target),
                  unit: habit.unit,
                }
                const progressValue = habitProgressValues[habit.id] ?? '0'
                const completedCount = Number(progressValue) || 0
                const progressPercent = Math.min(100, Math.round((completedCount / habit.daily_target) * 100))

                return (
                  <article className="habit-card" key={habit.id}>
                    <div className="habit-card-head">
                      <div>
                        <h3>{habit.name}</h3>
                        <p className="habit-card-meta">
                          Cél: {habit.daily_target} {habit.unit} / nap
                        </p>
                      </div>
                      <div className="habit-card-actions">
                        <span className="pill">
                          {completedCount}/{habit.daily_target} {habit.unit}
                        </span>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Szokás törlése: ${habit.name}`}
                          title="Szokás törlése"
                          onClick={() => onHabitDelete(habit)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div className="habit-card-layout">
                      <div className="habit-settings-row">
                        <label>
                          Szokás neve
                          <input
                            value={draftValue.name}
                            onChange={(event) => onHabitDraftChange(habit.id, 'name', event.target.value)}
                          />
                        </label>

                        <label>
                          Napi cél
                          <input
                            type="number"
                            min="1"
                            value={draftValue.dailyTarget}
                            onChange={(event) => onHabitDraftChange(habit.id, 'dailyTarget', event.target.value)}
                          />
                        </label>

                        <label>
                          Mértékegység
                          <input
                            value={draftValue.unit}
                            onChange={(event) => onHabitDraftChange(habit.id, 'unit', event.target.value)}
                          />
                        </label>

                        <button type="button" className="secondary-button habit-edit-save" onClick={() => onHabitSave(habit)}>
                          Frissítés
                        </button>
                      </div>

                      <div className="habit-progress-row">
                        <button type="button" className="ghost-button" onClick={() => onProgressStep(habit, -1)}>
                          -1
                        </button>

                        <label className="habit-count-field">
                          Teljesített
                          <input
                            type="number"
                            min="0"
                            value={progressValue}
                            onChange={(event) => onProgressChange(habit.id, event.target.value)}
                          />
                        </label>

                        <button type="button" className="ghost-button" onClick={() => onProgressStep(habit, 1)}>
                          +1
                        </button>

                        <button type="button" className="habit-save-button" onClick={() => onProgressSave(habit)}>
                          Mentés
                        </button>
                      </div>
                    </div>

                    <div className="habit-meter" aria-hidden="true">
                      <span style={{ width: `${progressPercent}%` }} />
                    </div>

                    <div className="habit-history">
                      {historyDays.map((day) => {
                        const log = habitLogsByKey[`${habit.id}:${day.dateKey}`]
                        const count = log?.completed_count || 0
                        const isDone = count >= habit.daily_target
                        const chipClass = isDone ? 'habit-day-chip done' : count ? 'habit-day-chip partial' : 'habit-day-chip'

                        return (
                          <div className={chipClass} key={`${habit.id}:${day.dateKey}`}>
                            <strong>{day.shortLabel}</strong>
                            <span>
                              {count}/{habit.daily_target}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </article>
                )
              })
            ) : (
              <p className="empty-state">
                Még nincs felvett szokás ehhez a naplóhoz. Például rögzítheted, hogy naponta 4 Médium cikket olvasol.
              </p>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}

function WeeklyPlanner({ days, routineBlocks, sourceOptions, plannerValues, onChange, onSave }) {
  const activeSourceOptions = sourceOptions.filter((source) => source.is_active)

  return (
    <section className="surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tervezés</p>
          <h2>Heti beosztás</h2>
        </div>
        <span className="pill">Külön szerkesztőnézet</span>
      </div>

      <div className="planner-grid">
        {days.map((day) => (
          <article className="planner-day" key={day.dateKey}>
            <div className="planner-day-head">
              <strong>{day.label}</strong>
              <span>{isToday(day.dateKey) ? 'Ma' : day.dateKey}</span>
            </div>

            {routineBlocks.map((block) => {
              const plannerKey = `${day.dateKey}:${block.id}`
              const value = plannerValues[plannerKey] || {
                ...defaultPlannerEntry,
              }
              const selectedSource = sourceOptions.find((source) => source.id === value.sourceId)
              const hasInactiveSelectedSource = selectedSource && !selectedSource.is_active

              return (
                <div className="planner-slot" key={plannerKey}>
                  <div className="planner-slot-head">
                    <div>
                      <h3>{getRoutineBlockLabel(block.name)}</h3>
                    </div>
                  </div>

                  <label>
                    Forrás
                    <select
                      value={value.sourceId}
                      onChange={(event) => {
                        const nextSourceId = event.target.value
                        onChange(plannerKey, 'sourceId', nextSourceId)
                        onSave(day.dateKey, block.id, { ...value, sourceId: nextSourceId })
                      }}
                    >
                      <option value="">Válassz tartalmat</option>
                      {hasInactiveSelectedSource ? (
                        <option value={selectedSource.id} disabled>
                          {selectedSource.provider} • {selectedSource.name} (inaktív)
                        </option>
                      ) : null}
                      {activeSourceOptions.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.provider} • {source.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )
            })}
          </article>
        ))}
      </div>
    </section>
  )
}

function SourceManager({
  stats,
  sourceLibrary,
  sourceForm,
  weeklyRecommendation,
  dailyRecommendationForm,
  providerOptions,
  categoryOptions,
  optionForm,
  onSourceChange,
  onSourceSubmit,
  onWeeklyRecommendationChange,
  onWeeklyRecommendationSave,
  onDailyRecommendationChange,
  onDailyRecommendationSave,
  onEditSource,
  onToggleSource,
  onOptionChange,
  onOptionSave,
  onOptionDelete,
}) {
  const [sourcePage, setSourcePage] = useState(1)
  const sourceTitleInputRef = useRef(null)
  const activeSourceLibrary = sourceLibrary.filter((item) => item.is_active)
  const selectedRecommendedSource = sourceLibrary.find((item) => item.id === dailyRecommendationForm.recommended_source_id)
  const hasInactiveRecommendedSource = selectedRecommendedSource && !selectedRecommendedSource.is_active

  const providerUsageCounts = sourceLibrary.reduce((counts, item) => {
    if (!item.provider) return counts
    counts[item.provider] = (counts[item.provider] || 0) + 1
    return counts
  }, {})

  const categoryUsageCounts = sourceLibrary.reduce((counts, item) => {
    if (!item.category) return counts
    counts[item.category] = (counts[item.category] || 0) + 1
    return counts
  }, {})

  const sortedSourceLibrary = useMemo(
    () =>
      [...sourceLibrary].sort((left, right) => {
        if (left.is_active !== right.is_active) {
          return left.is_active ? -1 : 1
        }

        const providerDiff = (left.provider || '').localeCompare(right.provider || '', 'hu')
        if (providerDiff !== 0) return providerDiff

        return (left.name || '').localeCompare(right.name || '', 'hu')
      }),
    [sourceLibrary],
  )

  const totalSourcePages = Math.max(1, Math.ceil(sortedSourceLibrary.length / SOURCE_LIBRARY_PAGE_SIZE))
  const currentSourcePage = Math.min(sourcePage, totalSourcePages)
  const sourcePageStart = (currentSourcePage - 1) * SOURCE_LIBRARY_PAGE_SIZE
  const visibleSources = sortedSourceLibrary.slice(sourcePageStart, sourcePageStart + SOURCE_LIBRARY_PAGE_SIZE)
  const visibleSourceStart = sortedSourceLibrary.length ? sourcePageStart + 1 : 0
  const visibleSourceEnd = sourcePageStart + visibleSources.length

  useEffect(() => {
    setSourcePage((current) => Math.min(current, totalSourcePages))
  }, [totalSourcePages])

  useEffect(() => {
    if (!sourceForm.id) return

    const index = sortedSourceLibrary.findIndex((item) => item.id === sourceForm.id)
    if (index === -1) return

    setSourcePage(Math.floor(index / SOURCE_LIBRARY_PAGE_SIZE) + 1)
  }, [sourceForm.id, sortedSourceLibrary])

  useEffect(() => {
    if (!sourceForm.id || !sourceTitleInputRef.current) return undefined

    const frameId = window.requestAnimationFrame(() => {
      sourceTitleInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [sourceForm.id])

  return (
    <section className="details-grid">
      <div className="surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Áttekintés</p>
            <h2>Rutin teljesítés</h2>
          </div>
        </div>
        <div className="stats-grid">
          {stats.map((item) => (
            <div className="stat-line" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="option-managers">
          <form
            className="option-form"
            onSubmit={(event) => {
              event.preventDefault()
              onWeeklyRecommendationSave()
            }}
          >
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Heti ajánlás</p>
                <h2>Heti szöveges irány</h2>
              </div>
            </div>
            <textarea
              rows="4"
              placeholder="Ide írhatod a heti ajánlást."
              value={weeklyRecommendation}
              onChange={(event) => onWeeklyRecommendationChange(event.target.value)}
            />
            <button type="submit">Heti ajánlás mentése</button>
          </form>

          <form
            className="option-form"
            onSubmit={(event) => {
              event.preventDefault()
              onDailyRecommendationSave()
            }}
          >
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Napi ajánlás</p>
                <h2>Napi szöveg és forrás</h2>
              </div>
            </div>
            <label>
              Dátum
              <input
                type="date"
                value={dailyRecommendationForm.target_date}
                onChange={(event) => onDailyRecommendationChange('target_date', event.target.value)}
              />
            </label>
            <label>
              Kapcsolt forrás
              <select
                value={dailyRecommendationForm.recommended_source_id}
                onChange={(event) => onDailyRecommendationChange('recommended_source_id', event.target.value)}
              >
                <option value="">Nincs konkrét forrás</option>
                {hasInactiveRecommendedSource ? (
                  <option value={selectedRecommendedSource.id} disabled>
                    {selectedRecommendedSource.provider} • {selectedRecommendedSource.name} (inaktív)
                  </option>
                ) : null}
                {activeSourceLibrary.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.provider} • {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Címke
              <input
                value={dailyRecommendationForm.reasoning_summary}
                placeholder="Például: Mai fókusz"
                onChange={(event) => onDailyRecommendationChange('reasoning_summary', event.target.value)}
              />
            </label>
            <label>
              Ajánlás szövege
              <textarea
                rows="4"
                placeholder="Mit érdemes ma hallgatni, és miért?"
                value={dailyRecommendationForm.recommendation_text}
                onChange={(event) => onDailyRecommendationChange('recommendation_text', event.target.value)}
              />
            </label>
            <button type="submit">Napi ajánlás mentése</button>
          </form>

          <form
            className="option-form"
            aria-label="Szolgáltatók kezelése"
            onSubmit={(event) => {
              event.preventDefault()
              onOptionSave('provider')
            }}
          >
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Szolgáltatók listája</p>
                <h2>Szolgáltatók</h2>
              </div>
            </div>
            <div className="option-inline">
              <input
                value={optionForm.provider}
                placeholder="Új szolgáltató"
                onChange={(event) => onOptionChange('provider', event.target.value)}
              />
              <button type="submit">Hozzáad</button>
            </div>
            <div className="option-chip-list">
              {providerOptions.map((item) => {
                const usageCount = providerUsageCounts[item] || 0

                return (
                  <div className="option-chip" key={item}>
                    <span>{item}</span>
                    {usageCount ? <span className="option-chip-state">{usageCount} forrás használja</span> : null}
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Szolgáltató törlése: ${item}`}
                      title={usageCount ? `${usageCount} forrás használja, ezért nem törölhető` : 'Törlés'}
                      onClick={() => onOptionDelete('provider', item)}
                      disabled={usageCount > 0}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )
              })}
            </div>
          </form>

          <form
            className="option-form"
            aria-label="Kategóriák kezelése"
            onSubmit={(event) => {
              event.preventDefault()
              onOptionSave('category')
            }}
          >
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Kategórialista</p>
                <h2>Kategóriák</h2>
              </div>
            </div>
            <div className="option-inline">
              <input
                value={optionForm.category}
                placeholder="Új kategória"
                onChange={(event) => onOptionChange('category', event.target.value)}
              />
              <button type="submit">Hozzáad</button>
            </div>
            <div className="option-chip-list">
              {categoryOptions.map((item) => {
                const usageCount = categoryUsageCounts[item] || 0

                return (
                  <div className="option-chip" key={item}>
                    <span>{item}</span>
                    {usageCount ? <span className="option-chip-state">{usageCount} forrás használja</span> : null}
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Kategória törlése: ${item}`}
                      title={usageCount ? `${usageCount} forrás használja, ezért nem törölhető` : 'Törlés'}
                      onClick={() => onOptionDelete('category', item)}
                      disabled={usageCount > 0}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )
              })}
            </div>
          </form>
        </div>
      </div>

      <div className="surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Forráskarbantartás</p>
            <h2>Kiegészítő adatok</h2>
          </div>
          <span className="pill">Adatbázisba mentve</span>
        </div>

        <form
          className="source-form"
          aria-label="Források kezelése"
          onSubmit={(event) => {
            event.preventDefault()
            onSourceSubmit()
          }}
        >
          <div className="form-grid">
            <label>
              Cím
              <input
                ref={sourceTitleInputRef}
                value={sourceForm.name}
                onChange={(event) => onSourceChange('name', event.target.value)}
              />
            </label>

            <label>
              Szolgáltató
              <select value={sourceForm.provider} onChange={(event) => onSourceChange('provider', event.target.value)}>
                <option value="">Válassz szolgáltatót</option>
                {providerOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Típus
              <select
                value={sourceForm.content_type}
                onChange={(event) => onSourceChange('content_type', event.target.value)}
              >
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="course">Kurzus</option>
                <option value="article">Cikk</option>
              </select>
            </label>

            <label>
              Kategória
              <select value={sourceForm.category} onChange={(event) => onSourceChange('category', event.target.value)}>
                <option value="">Válassz kategóriát</option>
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nehézség
              <select
                value={sourceForm.difficulty_level}
                onChange={(event) => onSourceChange('difficulty_level', event.target.value)}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}/5
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            URL
            <input value={sourceForm.url} onChange={(event) => onSourceChange('url', event.target.value)} />
          </label>

          <label>
            Megjegyzés
            <textarea
              rows="3"
              value={sourceForm.notes}
              onChange={(event) => onSourceChange('notes', event.target.value)}
            />
          </label>

          <div className="source-form-actions">
            <button type="submit">{sourceForm.id ? 'Forrás frissítése' : 'Új forrás mentése'}</button>
            {sourceForm.id ? (
              <button type="button" className="secondary-button" onClick={() => onEditSource(null)}>
                Új forrás
              </button>
            ) : null}
          </div>
        </form>

        <div className="library-toolbar">
          <p className="micro-copy pagination-meta">
            {sortedSourceLibrary.length
              ? `${visibleSourceStart}-${visibleSourceEnd}. elem / ${sortedSourceLibrary.length}`
              : 'Még nincs felvett forrás.'}
          </p>

          <div className="pagination-controls" aria-label="Forráslista lapozása">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setSourcePage((current) => Math.max(1, current - 1))}
              disabled={currentSourcePage === 1}
            >
              Előző oldal
            </button>
            <span className="pill subtle-pill">
              {currentSourcePage}/{totalSourcePages}
            </span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setSourcePage((current) => Math.min(totalSourcePages, current + 1))}
              disabled={currentSourcePage === totalSourcePages}
            >
              Következő oldal
            </button>
          </div>
        </div>

        <div className="library-list">
          {visibleSources.map((item) => (
            <article className="library-row library-row-editable" key={item.id}>
              <div className="library-card-main">
                <div className="library-card-head">
                  <span className="pill subtle-pill">{item.provider}</span>
                  <span className={item.is_active ? 'library-state-badge active' : 'library-state-badge inactive'}>
                    {item.is_active ? 'Aktív forrás' : 'Inaktív forrás'}
                  </span>
                </div>
                <h3>{item.name}</h3>
                <div className="library-tag-row">
                  <span className="library-tag">{getContentTypeLabel(item.content_type)}</span>
                  <span className="library-tag">{item.category || 'Általános'}</span>
                  <span className="library-tag">Nehézség: {item.difficulty_level || '-'}/5</span>
                </div>
                <p className="library-notes-preview" title={item.notes || 'Nincs megjegyzés'}>
                  {item.notes || 'Nincs megjegyzés'}
                </p>
              </div>
              <div className="library-actions">
                <button type="button" className="library-edit-button" onClick={() => onEditSource(item)}>
                  Szerkeszt
                </button>
                <button type="button" className="ghost-button" onClick={() => onToggleSource(item)}>
                  {item.is_active ? 'Inaktivál' : 'Aktivál'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function buildPlannerState(scheduleItems, routineBlocks, sources, weekOffset = 0) {
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

function buildHabitProgressState(habits, habitLogs, selectedDateKey) {
  return habits.reduce((state, habit) => {
    const log = habitLogs.find((entry) => entry.habit_id === habit.id && entry.target_date === selectedDateKey)
    state[habit.id] = String(log?.completed_count ?? 0)
    return state
  }, {})
}

function buildHabitDraftState(habits) {
  return habits.reduce((state, habit) => {
    state[habit.id] = {
      name: habit.name || '',
      dailyTarget: String(habit.daily_target ?? 1),
      unit: habit.unit || 'db',
    }
    return state
  }, {})
}

export default function App() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [todayOffset, setTodayOffset] = useState(0)
  const [activeView, setActiveView] = useState('today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [data, setData] = useState({
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
  })
  const [plannerValues, setPlannerValues] = useState({})
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [selectedScheduleItemId, setSelectedScheduleItemId] = useState(null)
  const activityPanelRef = useRef(null)
  const [completionValues, setCompletionValues] = useState(defaultCompletionForm)
  const [sourceForm, setSourceForm] = useState(defaultSourceForm)
  const [optionForm, setOptionForm] = useState(defaultOptionForm)
  const [weeklyRecommendation, setWeeklyRecommendation] = useState('')
  const [dailyRecommendationForm, setDailyRecommendationForm] = useState(defaultRecommendationForm)
  const [habitForm, setHabitForm] = useState(defaultHabitForm)
  const [thoughtForm, setThoughtForm] = useState(defaultThoughtForm)
  const [thoughtSaveState, setThoughtSaveState] = useState('idle')
  const [taskForm, setTaskForm] = useState(defaultTaskForm)
  const [completingTaskIds, setCompletingTaskIds] = useState({})
  const [updatingTaskIds, setUpdatingTaskIds] = useState({})
  const [themePreference, setThemePreference] = useState(() => {
    if (typeof window === 'undefined') {
      return getDefaultThemePreference()
    }

    const storedValue = window.localStorage.getItem(THEME_PREFERENCE_KEY)
    return storedValue === 'day' || storedValue === 'night' ? storedValue : getDefaultThemePreference()
  })
  const [habitDraftValues, setHabitDraftValues] = useState({})
  const [habitProgressValues, setHabitProgressValues] = useState({})
  const selectedDate = useMemo(() => addDays(new Date(), todayOffset), [todayOffset])
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate])
  const selectedDateLabel = useMemo(() => formatWeekdayLabel(selectedDate), [selectedDate])
  const taskPlanDate = formatDateKey(new Date())
  const selectedDateWeekOffset = useMemo(() => {
    const currentWeekStart = startOfWeek(new Date())
    const selectedWeekStart = startOfWeek(selectedDate)
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000
    return Math.round((selectedWeekStart.getTime() - currentWeekStart.getTime()) / millisecondsPerWeek)
  }, [selectedDate])
  const dataWeekOffset = activeView === 'today' ? selectedDateWeekOffset : weekOffset

  useEffect(() => {
    let cancelled = false

    async function boot() {
      setLoading(true)
      setError('')

      try {
        const nextState = await loadAppState(dataWeekOffset)

        if (cancelled) return

        setData(nextState)
        setPlannerValues(
          buildPlannerState(nextState.schedule_items, nextState.routine_blocks, nextState.sources, dataWeekOffset),
        )
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Az adatok betöltése nem sikerült.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    boot()

    return () => {
      cancelled = true
    }
  }, [dataWeekOffset])

  useEffect(() => {
    if (!data.routine_blocks.length) return

    setPlannerValues(buildPlannerState(data.schedule_items, data.routine_blocks, data.sources, weekOffset))
  }, [weekOffset, data.routine_blocks, data.schedule_items, data.sources])

  useEffect(() => {
    setHabitProgressValues(buildHabitProgressState(data.habits, data.habit_logs, selectedDateKey))
  }, [data.habits, data.habit_logs, selectedDateKey])

  useEffect(() => {
    setHabitDraftValues(buildHabitDraftState(data.habits))
  }, [data.habits])

  useEffect(() => {
    setSelectedLogId(null)
    setSelectedScheduleItemId(null)
    setCompletionValues({ ...defaultCompletionForm })
    setThoughtForm(defaultThoughtForm)
    setThoughtSaveState('idle')
  }, [selectedDateKey])

  useEffect(() => {
    setWeeklyRecommendation(data.weekly_plan?.ai_recommendation || '')
  }, [data.weekly_plan])

  useEffect(() => {
    const selectedDate = dailyRecommendationForm.target_date || formatDateKey(new Date())
    const match = data.ai_recommendations.find((item) => item.target_date === selectedDate)

    setDailyRecommendationForm({
      id: match?.id || null,
      target_date: selectedDate,
      recommendation_text: match?.recommendation_text || '',
      reasoning_summary: match?.reasoning_summary || '',
      recommended_source_id: match?.recommended_source_id || '',
    })
  }, [data.ai_recommendations, dailyRecommendationForm.target_date])

  useEffect(() => {
    if (!toast) return undefined

    const timeoutId = window.setTimeout(() => {
      setToast(null)
    }, 2600)

    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(THEME_PREFERENCE_KEY, themePreference)
  }, [themePreference])

  const mode = getThemeMode(themePreference)

  const derived = useMemo(() => {
    const sourcesById = Object.fromEntries(data.sources.map((source) => [source.id, source]))
    const blocksById = Object.fromEntries(data.routine_blocks.map((block) => [block.id, block]))
    const habitLogsByKey = Object.fromEntries(
      data.habit_logs.map((entry) => [`${entry.habit_id}:${entry.target_date}`, entry]),
    )
    const logsById = Object.fromEntries(data.activity_logs.map((log) => [log.id, log]))
    const logsByScheduleItemId = {}
    const activeLogsByScheduleItemId = {}
    const toTimestamp = (rawDate) => {
      const value = rawDate ? new Date(rawDate).getTime() : 0
      return Number.isFinite(value) ? value : 0
    }
    const activeTasks = data.task_entries
      .filter((task) => task.plan_date === taskPlanDate && !task.is_completed)
      .sort((left, right) => {
        const rankDiff = getTaskPriorityRank(left.priority) - getTaskPriorityRank(right.priority)
        if (rankDiff !== 0) return rankDiff
        return toTimestamp(left.created_at) - toTimestamp(right.created_at)
      })
    const completedTasks = data.task_entries
      .filter((task) => task.is_completed)
      .sort((left, right) => {
        const completedDiff = toTimestamp(right.completed_at) - toTimestamp(left.completed_at)
        if (completedDiff !== 0) return completedDiff
        return toTimestamp(right.created_at) - toTimestamp(left.created_at)
      })
    const activitySummary = data.activity_logs.reduce(
      (summary, log) => {
        if (log.schedule_item_id && !logsByScheduleItemId[log.schedule_item_id]) {
          logsByScheduleItemId[log.schedule_item_id] = log
        }

        if (log.completion_status === 'in_progress' && log.schedule_item_id && !activeLogsByScheduleItemId[log.schedule_item_id]) {
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
  }, [data, selectedDate, selectedDateKey, taskPlanDate])

  const activeLog = useMemo(
    () => {
      const selected = selectedLogId ? derived.logsById[selectedLogId] : null
      if (selected) return selected

      const selectedScheduleId = selectedScheduleItemId
      if (selectedScheduleId) {
        const matchingLog = derived.logsByScheduleItemId[selectedScheduleId]
        if (matchingLog) return matchingLog

        const scheduleItem = derived.selectedItems.find((item) => item.id === selectedScheduleId)
        if (scheduleItem) {
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
      }

      return null
    },
    [selectedLogId, selectedScheduleItemId, derived.logsById, derived.logsByScheduleItemId, derived.selectedItems],
  )

  useEffect(() => {
    setCompletionValues(getCompletionFormValues(activeLog))
  }, [activeLog?.id, activeLog?.schedule_item_id, activeLog?.completion_status, activeLog?.rating, activeLog?.notes])

  async function reloadState() {
    const nextState = await loadAppState(dataWeekOffset)
    setData(nextState)
    setPlannerValues(
      buildPlannerState(nextState.schedule_items, nextState.routine_blocks, nextState.sources, dataWeekOffset),
    )
  }

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

  function showToast(kind, message) {
    setToast({ kind, message })
  }

  function handleViewChange(nextView) {
    if (nextView === 'today') {
      setTodayOffset(0)
    }

    setActiveView(nextView)
  }

  function updatePlannerValue(key, field, nextValue) {
    setPlannerValues((current) => {
      const next = { ...current[key], [field]: nextValue }
      return { ...current, [key]: next }
    })
  }

  async function handlePlannerSave(dateKey, routineBlockId, overrideValue = null) {
    const plannerKey = `${dateKey}:${routineBlockId}`
    const value = overrideValue || plannerValues[plannerKey]
    const source = data.sources.find((item) => item.id === value.sourceId)
    const routineBlock = data.routine_blocks.find((item) => item.id === routineBlockId)

    if (!routineBlock) return

    try {
      setError('')
      await saveScheduleItem({
        id: value.id,
        weekly_plan_id: data.weekly_plan?.id,
        weekly_plan: data.weekly_plan,
        routine_block_id: routineBlockId,
        source_id: value.sourceId || null,
        scheduled_date: dateKey,
        source,
      })
      await reloadState()
      showToast('success', 'A heti terv elmentve.')
    } catch {
      setError('A heti terv mentése nem sikerült.')
      showToast('error', 'A heti terv mentése nem sikerült.')
    }
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
        await reloadState()
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
      await reloadState()
      setSelectedLogId(null)
      setSelectedScheduleItemId(null)
      setCompletionValues({ ...defaultCompletionForm })
      showToast('success', activeLog.id ? 'A napló frissítve.' : 'A napló rögzítve.')
    } catch {
      setError('A napló rögzítése nem sikerült.')
      showToast('error', 'A napló rögzítése nem sikerült.')
    }
  }

  async function handleSourceSubmit() {
    try {
      setError('')
      await saveSource(sourceForm)
      await reloadState()
      setSourceForm(defaultSourceForm)
      showToast('success', 'A forrás elmentve.')
    } catch (submitError) {
      setError(`A forrás mentése nem sikerült. ${submitError?.message || ''}`.trim())
      showToast('error', 'A forrás mentése nem sikerült.')
    }
  }

  function handleEditSource(source) {
    if (!source) {
      setSourceForm(defaultSourceForm)
      return
    }

    setSourceForm({
      id: source.id,
      name: source.name || '',
      provider: source.provider || '',
      content_type: source.content_type || 'audio',
      url: source.url || '',
      category: source.category || '',
      difficulty_level: source.difficulty_level ? String(source.difficulty_level) : '3',
      notes: source.notes || '',
      is_active: source.is_active ?? true,
    })
    setActiveView('details')
  }

  async function handleToggleSource(source) {
    try {
      setError('')
      await setSourceActive(source.id, !source.is_active)
      await reloadState()
      if (sourceForm.id === source.id) {
        setSourceForm((current) => ({ ...current, is_active: !source.is_active }))
      }
      showToast('success', source.is_active ? 'A forrás inaktiválva.' : 'A forrás aktiválva.')
    } catch {
      setError('A forrás állapotváltása nem sikerült.')
      showToast('error', 'A forrás állapotváltása nem sikerült.')
    }
  }

  async function handleOptionSave(kind) {
    try {
      setError('')
      await saveOptionItem(kind, optionForm[kind])
      await reloadState()
      setOptionForm((current) => ({ ...current, [kind]: '' }))
      showToast('success', 'A listaelem elmentve.')
    } catch (optionError) {
      setError(`A listaelem mentése nem sikerült. ${optionError?.message || ''}`.trim())
      showToast('error', 'A listaelem mentése nem sikerült.')
    }
  }

  async function handleOptionDelete(kind, value) {
    const label = kind === 'provider' ? 'szolgáltatót' : 'kategóriát'

    if (!window.confirm(`Biztos törölni szeretnéd ezt a ${label}: ${value}?`)) {
      return
    }

    try {
      setError('')
      await deleteOptionItem(kind, value)
      await reloadState()
      if (kind === 'provider' && sourceForm.provider === value) {
        setSourceForm((current) => ({ ...current, provider: '' }))
      }
      if (kind === 'category' && sourceForm.category === value) {
        setSourceForm((current) => ({ ...current, category: '' }))
      }
      showToast('success', 'A listaelem törölve.')
    } catch (optionError) {
      setError(`A listaelem törlése nem sikerült. ${optionError?.message || ''}`.trim())
      showToast('error', 'A listaelem törlése nem sikerült.')
    }
  }

  async function handleWeeklyRecommendationSave() {
    if (!data.weekly_plan) {
      setError('Nincs aktív heti terv.')
      showToast('error', 'Nincs aktív heti terv.')
      return
    }

    try {
      setError('')
      await saveWeeklyRecommendation({
        id: data.weekly_plan.id,
        week_start_date: data.weekly_plan.week_start_date,
        week_end_date: data.weekly_plan.week_end_date,
        status: data.weekly_plan.status,
        ai_recommendation: weeklyRecommendation,
      })
      await reloadState()
      showToast('success', 'A heti ajánlás elmentve.')
    } catch (saveError) {
      setError(`A heti ajánlás mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A heti ajánlás mentése nem sikerült.')
    }
  }

  async function handleDailyRecommendationSave() {
    try {
      setError('')
      await saveDailyRecommendation({
        id: dailyRecommendationForm.id,
        weekly_plan_id: data.weekly_plan?.id || null,
        target_date: dailyRecommendationForm.target_date,
        recommendation_text: dailyRecommendationForm.recommendation_text,
        reasoning_summary: dailyRecommendationForm.reasoning_summary,
        recommended_source_id: dailyRecommendationForm.recommended_source_id,
      })
      await reloadState()
      showToast('success', 'A napi ajánlás elmentve.')
    } catch (saveError) {
      setError(`A napi ajánlás mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A napi ajánlás mentése nem sikerült.')
    }
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
      await reloadState()
      setThoughtForm(defaultThoughtForm)
      setThoughtSaveState('saved')
      return true
    } catch (saveError) {
      setThoughtSaveState('idle')
      setError(`A gondolat mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A gondolat mentése nem sikerült.')
      return false
    }
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

  async function handleHabitCreate() {
    try {
      setError('')
      await saveHabit({
        name: habitForm.name,
        daily_target: habitForm.dailyTarget,
        unit: habitForm.unit,
      })
      await reloadState()
      setHabitForm(defaultHabitForm)
      showToast('success', 'A szokás elmentve.')
      return true
    } catch (saveError) {
      setError(`A szokás mentése nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A szokás mentése nem sikerült.')
      return false
    }
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
      await reloadState()
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
      await reloadState()
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
      setHabitProgressValues((current) => ({ ...current, [habit.id]: String(Math.max(0, Math.floor(completedCount || 0))) }))
      await reloadState()
      showToast('success', 'A napi szokásrögzítés elmentve.')
    } catch (saveError) {
      setError(`A napi szokásrögzítés nem sikerült. ${saveError?.message || ''}`.trim())
      showToast('error', 'A napi szokásrögzítés nem sikerült.')
    }
  }

  function handleHabitProgressChange(habitId, nextValue) {
    setHabitProgressValues((current) => ({ ...current, [habitId]: nextValue }))
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
      await reloadState()
      showToast('success', isAvailable ? 'A szokáskövető aktív.' : 'A szokáskövető táblái még hiányoznak.')
    } catch (loadError) {
      setError(loadError?.message || 'Az újraellenőrzés nem sikerült.')
      showToast('error', 'Az újraellenőrzés nem sikerült.')
    }
  }

  const plannerDays = useMemo(
    () =>
      getWeekDates(new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000)).map((date) => ({
        dateKey: formatDateKey(date),
        label: formatWeekdayLabel(date),
      })),
    [weekOffset],
  )

  return (
    <main className={`app-shell ${mode.themeClass}`}>
      {toast ? (
        <div className={`toast ${toast.kind === 'error' ? 'toast-error' : 'toast-success'}`} role="status" aria-live="polite">
          <span>{toast.message}</span>
          <button type="button" className="toast-close" aria-label="Értesítés bezárása" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      ) : null}

      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero">
        <nav className="topbar">
          <img className="brand brand-image" src={logo} alt="LepesHang" />
          <div className="topbar-actions">
            <span className="mode-badge">{mode.label}</span>
            <button
              type="button"
              className="theme-toggle-button"
              aria-label={themePreference === 'day' ? 'Váltás éjjeli módra' : 'Váltás nappali módra'}
              title={themePreference === 'day' ? 'Váltás éjjeli módra' : 'Váltás nappali módra'}
              onClick={() => setThemePreference((current) => (current === 'day' ? 'night' : 'day'))}
            >
              <ThemeIcon theme={themePreference} />
            </button>
          </div>
        </nav>

        <AppHeader
          loading={loading}
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        {activeView === 'today' ? (
          loading ? (
            <BlockStripSkeleton
              dateKey={selectedDateKey}
              dateLabel={selectedDateLabel}
              isCurrentDay={isToday(selectedDateKey)}
            />
          ) : (
            <BlockStrip
              routineCards={derived.routineCards}
              dateKey={selectedDateKey}
              dateLabel={selectedDateLabel}
              isCurrentDay={isToday(selectedDateKey)}
              loading={loading}
              onPreviousDay={() => setTodayOffset((current) => current - 1)}
              onNextDay={() => setTodayOffset((current) => current + 1)}
              onStart={handleStart}
              onSelectLog={(scheduleItem) => {
                setSelectedLogId(scheduleItem?.logId || scheduleItem?.activeLogId || null)
                setSelectedScheduleItemId(scheduleItem?.id || null)
                activityPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          )
        ) : null}
      </section>

      <div className="content-stack">
        {error ? <div className="error-banner">{error}</div> : null}

        {activeView === 'today' ? (
          loading ? (
            <>
              <div className="today-top-grid">
                <ThoughtCaptureSkeleton
                  selectedDateKey={selectedDateKey}
                  isCurrentDay={isToday(selectedDateKey)}
                />
                <ActivityPanelSkeleton isCurrentDay={isToday(selectedDateKey)} />
              </div>
              <HabitTrackerSkeleton
                selectedDateKey={selectedDateKey}
                isCurrentDay={isToday(selectedDateKey)}
              />
            </>
          ) : (
            <>
              <div className="today-top-grid">
                <ThoughtCapture
                  selectedDateKey={selectedDateKey}
                  isCurrentDay={isToday(selectedDateKey)}
                  value={thoughtForm.content}
                  onChange={(value) => {
                    setThoughtForm({ content: value })
                    setThoughtSaveState('idle')
                  }}
                  onSubmit={handleThoughtSave}
                  onBlurSave={() => void handleThoughtSave()}
                  saveState={thoughtSaveState}
                  isAvailable={data.thought_entries_available}
                />

                <ActivityPanel
                  panelRef={activityPanelRef}
                  activeLog={activeLog}
                  sourceName={activeLog ? derived.sourcesById[activeLog.source_id]?.name || 'Forrás nélkül' : ''}
                  blockName={activeLog ? getRoutineBlockLabel(derived.blocksById[activeLog.routine_block_id]?.name || 'Blokk') : ''}
                  values={completionValues}
                  onChange={(field, value) => setCompletionValues((current) => ({ ...current, [field]: value }))}
                  onSubmit={handleComplete}
                  isCurrentDay={isToday(selectedDateKey)}
                />
              </div>

              <HabitTracker
                habits={data.habits}
                isAvailable={data.habit_tracking_available}
                availabilityStatus={data.habit_tracking_status}
                selectedDateKey={selectedDateKey}
                isCurrentDay={isToday(selectedDateKey)}
                habitForm={habitForm}
                habitDraftValues={habitDraftValues}
                habitProgressValues={habitProgressValues}
                habitLogsByKey={derived.habitLogsByKey}
                historyDays={derived.historyDays}
                onHabitFormChange={(field, value) => setHabitForm((current) => ({ ...current, [field]: value }))}
                onHabitCreate={handleHabitCreate}
                onHabitDraftChange={handleHabitDraftChange}
                onHabitSave={handleHabitSave}
                onHabitDelete={handleHabitDelete}
                onProgressChange={handleHabitProgressChange}
                onProgressSave={handleHabitProgressSave}
                onProgressStep={handleHabitProgressStep}
                onRetryAvailabilityCheck={handleHabitAvailabilityRetry}
              />
            </>
          )
        ) : activeView === 'details' ? (
          loading ? (
            <DetailsViewSkeleton />
          ) : (
            <>
              <WeekSwitcher weekOffset={weekOffset} onChange={setWeekOffset} />

              <WeeklyPlanner
                days={plannerDays}
                routineBlocks={data.routine_blocks}
                sourceOptions={data.sources}
                plannerValues={plannerValues}
                onChange={updatePlannerValue}
                onSave={handlePlannerSave}
              />

              <SourceManager
                stats={derived.stats}
                sourceLibrary={data.sources}
                sourceForm={sourceForm}
                weeklyRecommendation={weeklyRecommendation}
                dailyRecommendationForm={dailyRecommendationForm}
                providerOptions={data.provider_options}
                categoryOptions={data.category_options}
                optionForm={optionForm}
                onSourceChange={(field, value) => setSourceForm((current) => ({ ...current, [field]: value }))}
                onSourceSubmit={handleSourceSubmit}
                onWeeklyRecommendationChange={setWeeklyRecommendation}
                onWeeklyRecommendationSave={handleWeeklyRecommendationSave}
                onDailyRecommendationChange={(field, value) =>
                  setDailyRecommendationForm((current) => ({ ...current, [field]: value }))
                }
                onDailyRecommendationSave={handleDailyRecommendationSave}
                onEditSource={handleEditSource}
                onToggleSource={handleToggleSource}
                onOptionChange={(field, value) => setOptionForm((current) => ({ ...current, [field]: value }))}
                onOptionSave={handleOptionSave}
                onOptionDelete={handleOptionDelete}
              />
            </>
          )
        ) : (
          loading ? (
            <>
              <TaskPlannerSkeleton />
              <ThoughtsArchiveSkeleton />
            </>
          ) : (
            <>
              <TaskPlanner
                planDate={taskPlanDate}
                activeTasks={derived.activeTasks}
                completedTasks={derived.completedTasks}
                isAvailable={data.task_entries_available}
                formValues={taskForm}
                completingTaskIds={completingTaskIds}
                updatingTaskIds={updatingTaskIds}
                onFormChange={(field, value) => setTaskForm((current) => ({ ...current, [field]: value }))}
                onSubmit={handleTaskCreate}
                onComplete={handleTaskComplete}
                onPriorityChange={handleTaskPriorityChange}
                onDescriptionSave={handleTaskDescriptionChange}
              />
              <ThoughtsArchive
                entries={data.thought_entries}
                isAvailable={data.thought_entries_available}
                onDelete={handleThoughtDelete}
              />
            </>
          )
        )}
      </div>
    </main>
  )
}
