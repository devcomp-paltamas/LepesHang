import { useEffect, useRef, useState } from 'react'
import { RichTextContent } from '../components/RichText.jsx'
import { isToday } from '../lib/date.js'
import { hasRichTextContent, stripRichText } from '../lib/rich-text.js'
import { getRoutineBlockLabel } from './shared.js'
import { ChevronIcon, TrashIcon } from './view-icons.jsx'

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
                      <RichTextContent
                        className="block-note-preview rich-text-content rich-text-preview"
                        value={block.activeSchedule.notes}
                        fallback=""
                        title={stripRichText(block.activeSchedule.notes)}
                      />
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
              value={values.notes}
              onChange={(event) => onChange('notes', event.target.value)}
              placeholder="Rövid megjegyzés a blokk lezárásához."
              aria-label="Blokk megjegyzése"
              rows={6}
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

function ThoughtCapture({ isCurrentDay, value, onChange, onSubmit, onBlurSave, saveState, isAvailable }) {
  const statusLabel =
    saveState === 'saving'
      ? 'Mentés...'
      : saveState === 'saved'
        ? 'Mentve'
        : hasRichTextContent(value)
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
        </div>
      </div>

      {isAvailable ? (
        <form className="thought-form">
          <label>
            Mi jár most a fejedben?
            <textarea
              value={value}
              placeholder="Rövid meglátás, felismerés vagy bármi, amit később visszaolvasnál."
              onChange={(event) => onChange(event.target.value)}
              onBlur={() => onBlurSave()}
              aria-label="Mai gondolat szerkesztése"
              rows={5}
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
      )}
    </section>
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
              <div className="habit-card-actions">
                <span className="skeleton-chip" />
                <span className="skeleton-chip" />
              </div>
            </div>
            <div className="habit-card-layout">
              <div className="habit-progress-row skeleton-progress-row">
                <span className="skeleton-chip" />
                <span className="skeleton-input" />
                <span className="skeleton-chip" />
              </div>
              <div className="habit-history">
                {Array.from({ length: 7 }, (_, chipIndex) => (
                  <span className="skeleton-input" key={`habit-history-skeleton-${index}-${chipIndex}`} />
                ))}
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
  const [editingHabitId, setEditingHabitId] = useState(null)
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

  useEffect(() => {
    if (!editingHabitId) return

    const stillExists = habits.some((habit) => habit.id === editingHabitId)
    if (!stillExists) {
      setEditingHabitId(null)
    }
  }, [editingHabitId, habits])

  async function handleHabitCreateSubmit() {
    const result = await onHabitCreate()
    if (result) {
      setIsCreatingHabit(false)
    }
  }

  async function handleHabitEditSave(habit) {
    const result = await onHabitSave(habit)
    if (result) {
      setEditingHabitId(null)
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
                const isEditing = editingHabitId === habit.id
                const progressValue = habitProgressValues[habit.id] ?? '0'
                const completedCount = Number(progressValue) || 0
                const progressPercent = Math.min(100, Math.round((completedCount / habit.daily_target) * 100))

                return (
                  <article className="habit-card" key={habit.id}>
                    <div className="habit-card-head">
                      <div className="habit-card-summary">
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
                          className="ghost-button habit-edit-toggle"
                          aria-expanded={isEditing}
                          onClick={() => setEditingHabitId((current) => (current === habit.id ? null : habit.id))}
                        >
                          {isEditing ? 'Bezárás' : 'Szerkesztés'}
                        </button>
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
                      <div className="habit-progress-row">
                        <div className="habit-stepper">
                          <button type="button" className="ghost-button habit-step-button" onClick={() => onProgressStep(habit, -1)}>
                            -1
                          </button>

                          <label className="habit-count-field">
                            <span>Ma</span>
                            <input
                              aria-label={`Mai teljesítés: ${habit.name}`}
                              type="number"
                              min="0"
                              value={progressValue}
                              onChange={(event) => onProgressChange(habit.id, event.target.value)}
                              onBlur={() => void onProgressSave(habit)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  void onProgressSave(habit)
                                }
                              }}
                            />
                          </label>

                          <button type="button" className="ghost-button habit-step-button" onClick={() => onProgressStep(habit, 1)}>
                            +1
                          </button>
                        </div>
                      </div>

                      <div className="habit-meter" aria-hidden="true">
                        <span style={{ width: `${progressPercent}%` }} />
                      </div>
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

                    {isEditing ? (
                      <div className="habit-edit-panel">
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
                        </div>

                        <div className="habit-edit-actions">
                          <button
                            type="button"
                            className="secondary-button habit-edit-save"
                            onClick={() => void handleHabitEditSave(habit)}
                          >
                            Frissítés
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => setEditingHabitId(null)}
                          >
                            Mégse
                          </button>
                        </div>
                      </div>
                    ) : null}
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

export default function TodayView({ section, loading, hero, content }) {
  const selectedDateKey = hero?.selectedDateKey || content?.selectedDateKey
  const isCurrentDay = isToday(selectedDateKey)

  if (section === 'hero') {
    return loading ? (
      <BlockStripSkeleton
        dateKey={hero.selectedDateKey}
        dateLabel={hero.selectedDateLabel}
        isCurrentDay={isCurrentDay}
      />
    ) : (
      <BlockStrip
        routineCards={hero.routineCards}
        dateKey={hero.selectedDateKey}
        dateLabel={hero.selectedDateLabel}
        isCurrentDay={isCurrentDay}
        loading={loading}
        onPreviousDay={hero.onPreviousDay}
        onNextDay={hero.onNextDay}
        onStart={hero.onStart}
        onSelectLog={hero.onSelectLog}
      />
    )
  }

  return loading ? (
    <>
      <div className="today-top-grid">
        <ThoughtCaptureSkeleton selectedDateKey={selectedDateKey} isCurrentDay={isCurrentDay} />
        <ActivityPanelSkeleton isCurrentDay={isCurrentDay} />
      </div>
      <HabitTrackerSkeleton selectedDateKey={selectedDateKey} isCurrentDay={isCurrentDay} />
    </>
  ) : (
    <>
      <div className="today-top-grid">
        <ThoughtCapture
          isCurrentDay={isCurrentDay}
          value={content.thought.form.content}
          onChange={content.thought.onChange}
          onSubmit={content.thought.onSubmit}
          onBlurSave={() => void content.thought.onSubmit()}
          saveState={content.thought.saveState}
          isAvailable={content.thought.isAvailable}
        />

        <ActivityPanel
          panelRef={content.activity.panelRef}
          activeLog={content.activity.activeLog}
          sourceName={content.activity.sourceName}
          blockName={content.activity.blockName}
          values={content.activity.values}
          onChange={content.activity.onChange}
          onSubmit={content.activity.onSubmit}
          isCurrentDay={isCurrentDay}
        />
      </div>

      <HabitTracker
        habits={content.habits.items}
        isAvailable={content.habits.isAvailable}
        availabilityStatus={content.habits.availabilityStatus}
        selectedDateKey={content.selectedDateKey}
        isCurrentDay={isCurrentDay}
        habitForm={content.habits.form}
        habitDraftValues={content.habits.draftValues}
        habitProgressValues={content.habits.progressValues}
        habitLogsByKey={content.habits.logsByKey}
        historyDays={content.habits.historyDays}
        onHabitFormChange={content.habits.onFormChange}
        onHabitCreate={content.habits.onCreate}
        onHabitDraftChange={content.habits.onDraftChange}
        onHabitSave={content.habits.onSave}
        onHabitDelete={content.habits.onDelete}
        onProgressChange={content.habits.onProgressChange}
        onProgressSave={content.habits.onProgressSave}
        onProgressStep={content.habits.onProgressStep}
        onRetryAvailabilityCheck={content.habits.onRetryAvailabilityCheck}
      />
    </>
  )
}
