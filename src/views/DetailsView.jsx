import { useEffect, useMemo, useRef, useState } from 'react'
import { isToday } from '../lib/date.js'
import {
  defaultPlannerEntry,
  getContentTypeLabel,
  getRoutineBlockLabel,
  SOURCE_LIBRARY_PAGE_SIZE,
} from './shared.js'
import { TrashIcon } from './view-icons.jsx'

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

export default function DetailsView({ loading, switcher, planner, library }) {
  return loading ? (
    <DetailsViewSkeleton />
  ) : (
    <>
      <WeekSwitcher weekOffset={switcher.weekOffset} onChange={switcher.onWeekOffsetChange} />

      <WeeklyPlanner
        days={planner.days}
        routineBlocks={planner.routineBlocks}
        sourceOptions={planner.sourceOptions}
        plannerValues={planner.values}
        onChange={planner.onChange}
        onSave={planner.onSave}
      />

      <SourceManager
        stats={library.stats}
        sourceLibrary={library.sourceLibrary}
        sourceForm={library.sourceForm}
        weeklyRecommendation={library.weeklyRecommendation}
        dailyRecommendationForm={library.dailyRecommendationForm}
        providerOptions={library.providerOptions}
        categoryOptions={library.categoryOptions}
        optionForm={library.optionForm}
        onSourceChange={library.onSourceChange}
        onSourceSubmit={library.onSourceSubmit}
        onWeeklyRecommendationChange={library.onWeeklyRecommendationChange}
        onWeeklyRecommendationSave={library.onWeeklyRecommendationSave}
        onDailyRecommendationChange={library.onDailyRecommendationChange}
        onDailyRecommendationSave={library.onDailyRecommendationSave}
        onEditSource={library.onEditSource}
        onToggleSource={library.onToggleSource}
        onOptionChange={library.onOptionChange}
        onOptionSave={library.onOptionSave}
        onOptionDelete={library.onOptionDelete}
      />
    </>
  )
}
