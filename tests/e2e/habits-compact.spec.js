import { expect, test } from '@playwright/test'
import { attachSupabaseMock } from './helpers/supabaseMock.js'

test('a szokaskoveto kompakt marad, a szerkesztes lenyithato es mentheto', async ({ page }) => {
  const selectedDateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(new Date())

  await page.addInitScript(() => {
    window.localStorage.setItem('lepeshang-habit-tables-available', 'available')
  })

  await attachSupabaseMock(page, {
    habits: [
      {
        id: 'habit-1',
        name: 'Médium olvasás',
        daily_target: 4,
        unit: 'db',
        is_active: true,
        created_at: '2026-03-29T08:00:00.000Z',
      },
    ],
    habit_logs: [
      {
        id: 'habit-log-1',
        habit_id: 'habit-1',
        target_date: selectedDateKey,
        completed_count: 2,
        notes: '',
        created_at: '2026-03-29T08:30:00.000Z',
      },
    ],
  })

  await page.goto('/')

  const habitCard = page.locator('.habit-card').first()
  await expect(habitCard.getByText('Médium olvasás')).toBeVisible()
  await expect(habitCard.getByRole('button', { name: 'Szerkesztés' })).toBeVisible()
  await expect(habitCard.locator('.habit-edit-panel')).toHaveCount(0)
  await expect(habitCard.getByRole('button', { name: '-1' })).toBeVisible()
  await expect(habitCard.getByRole('button', { name: '+1' })).toBeVisible()

  const progressInput = habitCard.getByLabel('Mai teljesítés: Médium olvasás')
  await progressInput.fill('3')
  await progressInput.blur()
  await expect(page.getByText('A napi szokásrögzítés elmentve.')).toBeVisible()

  await habitCard.getByRole('button', { name: 'Szerkesztés' }).click()
  await expect(habitCard.locator('.habit-edit-panel')).toBeVisible()

  await habitCard.getByLabel('Szokás neve').fill('Médium rövid blokk')
  await habitCard.getByRole('button', { name: 'Frissítés' }).click()

  await expect(page.getByText('A napi cél frissítve.')).toBeVisible()
  await expect(habitCard.locator('.habit-edit-panel')).toHaveCount(0)
  await expect(habitCard.getByText('Médium rövid blokk')).toBeVisible()
})
