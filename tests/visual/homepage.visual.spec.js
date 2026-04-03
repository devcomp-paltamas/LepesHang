import { expect, test } from '@playwright/test'
import { attachSupabaseMock } from '../e2e/helpers/supabaseMock.js'

const THEME_PREFERENCE_KEY = 'lepeshang-theme-preference'
const FROZEN_DATE = '2026-03-29T08:30:00.000Z'

test.use({
  viewport: { width: 1440, height: 1024 },
})

test('fooldal desktop vizualis regresszio', async ({ page }) => {
  await page.addInitScript(
    ({ dateIso, themeKey }) => {
      const fixedTime = new Date(dateIso).getTime()
      const RealDate = Date

      class MockDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            super(fixedTime)
            return
          }

          super(...args)
        }

        static now() {
          return fixedTime
        }
      }

      MockDate.parse = RealDate.parse
      MockDate.UTC = RealDate.UTC
      window.Date = MockDate
      window.localStorage.setItem(themeKey, 'day')
    },
    { dateIso: FROZEN_DATE, themeKey: THEME_PREFERENCE_KEY },
  )

  await attachSupabaseMock(page, {
    provider_options: [{ value: 'Spotify' }, { value: 'Mium' }],
    category_options: [{ value: 'Fókusz' }, { value: 'Archív' }],
    routine_blocks: [
      { id: 'block-1', name: 'Reggeli seta', mode: 'morning', theme_mode: 'day', is_active: true },
      { id: 'block-2', name: 'Esti onfejlesztes', mode: 'evening', theme_mode: 'day', is_active: true },
    ],
    sources: [
      {
        id: 'source-1',
        name: 'Mély munka playlist',
        provider: 'Spotify',
        content_type: 'audio',
        url: 'https://example.com/focus',
        category: 'Fókusz',
        difficulty_level: 3,
        notes: 'Rövid tesztjegyzet',
        is_active: true,
      },
      {
        id: 'source-2',
        name: 'Esti reflektív anyag',
        provider: 'Mium',
        content_type: 'article',
        url: 'https://example.com/evening',
        category: 'Archív',
        difficulty_level: 2,
        notes: '',
        is_active: true,
      },
    ],
    schedule_items: [
      {
        id: 'schedule-1',
        week_plan_id: 'plan-1',
        scheduled_date: '2026-03-29',
        routine_block_id: 'block-1',
        source_id: 'source-1',
        status: 'planned',
        started_at: null,
        completed_at: null,
      },
      {
        id: 'schedule-2',
        week_plan_id: 'plan-1',
        scheduled_date: '2026-03-29',
        routine_block_id: 'block-2',
        source_id: 'source-2',
        status: 'in_progress',
        started_at: '2026-03-29T07:40:00.000Z',
        completed_at: null,
      },
    ],
    activity_logs: [
      {
        id: 'activity-2',
        schedule_item_id: 'schedule-2',
        routine_block_id: 'block-2',
        source_id: 'source-2',
        completion_status: 'in_progress',
        notes: '',
        rating: null,
        created_at: '2026-03-29T07:40:00.000Z',
      },
    ],
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'A rutinod ne kérjen újabb döntést hajnalban.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Új szokás felvétele' })).toBeVisible()
  await page.waitForTimeout(900)
  await expect(page).toHaveScreenshot('homepage-desktop.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })
})
