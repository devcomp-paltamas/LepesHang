import { expect, test } from '@playwright/test'
import { attachSupabaseMock } from './helpers/supabaseMock.js'

const FROZEN_DATE = '2026-04-03T08:30:00.000Z'

test('a blokk inditasa nem jelez fals hibat, ha a log mentese valojaban mar sikerult', async ({ page }) => {
  await page.addInitScript(({ dateIso }) => {
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
  }, { dateIso: FROZEN_DATE })

  await attachSupabaseMock(page, {
    simulateActivityLogInsertFailureAfterWrite: true,
    routine_blocks: [
      { id: 'block-1', name: 'Reggeli blokk', mode: 'morning', theme_mode: 'auto', is_active: true },
      { id: 'block-2', name: 'Esti blokk', mode: 'evening', theme_mode: 'auto', is_active: true },
    ],
    sources: [
      {
        id: 'source-1',
        name: 'Mely munka playlist',
        provider: 'Spotify',
        content_type: 'audio',
        url: 'https://example.com/focus',
        category: 'Fokusz',
        difficulty_level: 3,
        notes: '',
        is_active: true,
      },
    ],
    weekly_plan: {
      id: 'plan-1',
      week_start_date: '2026-03-30',
      week_end_date: '2026-04-05',
      status: 'draft',
      ai_recommendation: '',
    },
    schedule_items: [
      {
        id: 'schedule-1',
        weekly_plan_id: 'plan-1',
        scheduled_date: '2026-04-03',
        routine_block_id: 'block-1',
        source_id: 'source-1',
        status: 'planned',
      },
    ],
  })

  await page.goto('/')

  await page.getByRole('button', { name: 'Blokk indítása' }).click()

  await expect(page.getByText('A blokk elindult.')).toBeVisible()
  await expect(page.getByText('A blokk indítása nem sikerült.')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Lezárás' })).toBeVisible()
})
