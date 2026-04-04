import { useEffect, useState } from 'react'
import logo from './assets/logo.png'
import {
  createInitialAppData,
  getDefaultThemePreference,
  getThemeMode,
  THEME_PREFERENCE_KEY,
} from './lib/app-state.js'
import {
  buildDetailsViewModel,
  buildTodayContentViewModel,
  buildTodayHeroViewModel,
} from './lib/app-view-models.js'
import useDetailsView from './hooks/useDetailsView.js'
import usePlanningView from './hooks/usePlanningView.js'
import useTodayView from './hooks/useTodayView.js'
import TodayView from './views/TodayView.jsx'
import PlanningView from './views/PlanningView.jsx'
import DetailsView from './views/DetailsView.jsx'
import {
  loadAppState,
} from './lib/store.js'

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


export default function App() {
  const [activeView, setActiveView] = useState('today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [data, setData] = useState(() => createInitialAppData())
  const [themePreference, setThemePreference] = useState(() => {
    if (typeof window === 'undefined') {
      return getDefaultThemePreference()
    }

    const storedValue = window.localStorage.getItem(THEME_PREFERENCE_KEY)
    return storedValue === 'day' || storedValue === 'night' ? storedValue : getDefaultThemePreference()
  })

  function showToast(kind, message) {
    setToast({ kind, message })
  }

  async function reloadState(weekOffsetToLoad = activeView === 'today' ? todayView.selectedDateWeekOffset : detailsView.weekOffset) {
    const nextState = await loadAppState(weekOffsetToLoad)
    setData(nextState)
  }

  const todayView = useTodayView({
    data,
    setData,
    setError,
    showToast,
    reloadState,
  })

  const detailsView = useDetailsView({
    data,
    setError,
    showToast,
    reloadState,
  })

  const planningView = usePlanningView({
    activeTasks: todayView.derived.activeTasks,
    completedTasks: todayView.derived.completedTasks,
    data,
    taskPlanDate: todayView.taskPlanDate,
    setError,
    showToast,
    reloadState,
  })

  const dataWeekOffset = activeView === 'today' ? todayView.selectedDateWeekOffset : detailsView.weekOffset

  useEffect(() => {
    let cancelled = false

    async function boot() {
      setLoading(true)
      setError('')

      try {
        const nextState = await loadAppState(dataWeekOffset)

        if (cancelled) return

        setData(nextState)
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

  function handleViewChange(nextView) {
    if (nextView === 'today') {
      todayView.resetTodayOffset()
    }

    setActiveView(nextView)
  }

  const todayHero = buildTodayHeroViewModel(todayView)
  const todayContent = buildTodayContentViewModel({ data, todayView })
  const detailsViewModel = buildDetailsViewModel({ data, detailsView, todayView })

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
          <TodayView
            section="hero"
            loading={loading}
            hero={todayHero}
          />
        ) : null}
      </section>

      <div className="content-stack">
        {error ? <div className="error-banner">{error}</div> : null}

        {activeView === 'today' ? (
          <TodayView
            section="content"
            loading={loading}
            content={todayContent}
          />
        ) : activeView === 'details' ? (
          <DetailsView
            loading={loading}
            switcher={detailsViewModel.switcher}
            planner={detailsViewModel.planner}
            library={detailsViewModel.library}
          />
        ) : (
          <PlanningView
            loading={loading}
            tasks={planningView.tasks}
            thoughts={planningView.thoughts}
          />
        )}
      </div>
    </main>
  )
}
