import { expect, test } from '@playwright/test'
import { attachSupabaseMock } from './helpers/supabaseMock.js'

function shiftDate(dateKey, days) {
  const value = new Date(`${dateKey}T12:00:00`)
  value.setDate(value.getDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(value)
}

test('prioritásos feladatlista helyesen rendez és kipipáláskor archívál', async ({ page }) => {
  async function getActivePriorities() {
    return page
      .locator('.task-list-block')
      .first()
      .locator('.task-item .task-priority-select')
      .evaluateAll((nodes) => nodes.map((node) => node.value))
  }

  const planDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(new Date())

  await attachSupabaseMock(page, {
    task_entries: [
      {
        id: 'task-c3',
        plan_date: planDate,
        priority: 'C3',
        description: 'Későbbi backlog feladat',
        is_completed: false,
        created_at: '2026-03-29T11:00:00.000Z',
      },
      {
        id: 'task-a1',
        plan_date: planDate,
        priority: 'A1',
        description: 'Legfontosabb sürgős feladat',
        is_completed: false,
        created_at: '2026-03-29T08:00:00.000Z',
      },
      {
        id: 'task-b1',
        plan_date: planDate,
        priority: 'B1',
        description: 'Második körös feladat',
        is_completed: false,
        created_at: '2026-03-29T09:00:00.000Z',
      },
      {
        id: 'task-done',
        plan_date: '2026-03-29',
        priority: 'A2',
        description: 'Már kész feladat',
        is_completed: true,
        completed_at: '2026-03-29T10:30:00.000Z',
        created_at: '2026-03-29T07:30:00.000Z',
      },
    ],
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Gondolatok + tervezés' }).click()

  await expect.poll(async () => getActivePriorities()).toEqual(['A1', 'B1', 'C3'])
  await expect(page.getByText('Legfontosabb sürgős feladat')).toBeVisible()

  await page.locator('.task-form').getByLabel('Prioritás').selectOption('A3')
  await page.locator('.task-form').getByLabel('Feladat leírása').fill('Új közepes fontosságú feladat')
  await page.getByRole('button', { name: 'Feladat rögzítése' }).click()

  await expect(page.getByText('A feladat elmentve.')).toBeVisible()
  await expect.poll(async () => getActivePriorities()).toEqual(['A1', 'A3', 'B1', 'C3'])

  const backlogItem = page.locator('.task-item').filter({ hasText: 'Későbbi backlog feladat' }).first()
  await backlogItem.getByRole('combobox').selectOption('A2')
  await expect(page.getByText('A prioritás frissítve.')).toBeVisible()
  await expect.poll(async () => getActivePriorities()).toEqual(['A1', 'A2', 'A3', 'B1'])

  const editedRow = page.locator('.task-list-block').first().locator('.task-item').nth(1)
  await editedRow.locator('.task-description-trigger').click()
  const descriptionInput = editedRow.locator('.task-description-input')
  await descriptionInput.waitFor()
  await descriptionInput.fill('Későbbi backlog feladat javítva')
  await descriptionInput.press('Enter')
  await expect(page.getByText('A leírás frissítve.')).toBeVisible()
  await expect(editedRow.getByRole('button', { name: 'Későbbi backlog feladat javítva' })).toBeVisible()

  await page.locator('.task-list-block').first().locator('.task-item').first().locator('input[type="checkbox"]').check()

  await expect(page.getByText('A feladat lezárva.')).toBeVisible()
  await expect.poll(async () => getActivePriorities()).toEqual(['A2', 'A3', 'B1'])
  await expect(page.locator('.task-history-list').getByText('Már kész feladat')).toBeVisible()
  await expect(page.locator('.task-history-list').getByText('Legfontosabb sürgős feladat')).toBeVisible()
})

test('a mai napon kipipalt feladat azonnal megjelenik a lezart feladatok listajaban', async ({ page }) => {
  const planDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(new Date())

  await attachSupabaseMock(page, {
    task_entries: [
      {
        id: 'task-a1-today',
        plan_date: planDate,
        priority: 'A1',
        description: 'Mai kipipalando feladat',
        is_completed: false,
        created_at: '2026-03-29T08:00:00.000Z',
      },
    ],
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Gondolatok + tervezés' }).click()

  await page.locator('.task-list-block').first().locator('.task-item').first().locator('input[type="checkbox"]').check()

  await expect(page.getByText('A feladat lezárva.')).toBeVisible()
  await expect(page.locator('.task-list-block').first()).not.toContainText('Mai kipipalando feladat')
  await expect(page.locator('.task-history-list').getByText('Mai kipipalando feladat')).toBeVisible()
})

test('a felvett feladatok torolhetok az aktiv listabol es az elozmenyek kozul is', async ({ page }) => {
  const planDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(new Date())
  const previousDate = shiftDate(planDate, -1)

  await attachSupabaseMock(page, {
    task_entries: [
      {
        id: 'task-active-delete',
        plan_date: planDate,
        priority: 'A2',
        description: 'Torlendo aktiv feladat',
        is_completed: false,
        created_at: '2026-03-29T08:00:00.000Z',
      },
      {
        id: 'task-active-keep',
        plan_date: planDate,
        priority: 'B1',
        description: 'Marado aktiv feladat',
        is_completed: false,
        created_at: '2026-03-29T09:00:00.000Z',
      },
      {
        id: 'task-history-delete',
        plan_date: previousDate,
        priority: 'C1',
        description: 'Torlendo archiv feladat',
        is_completed: true,
        completed_at: `${previousDate}T10:00:00.000Z`,
        created_at: `${previousDate}T08:30:00.000Z`,
      },
    ],
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Gondolatok + tervezés' }).click()

  await page.on('dialog', (dialog) => dialog.accept())

  const activeRow = page.locator('.task-item').filter({ hasText: 'Torlendo aktiv feladat' }).first()
  await activeRow.getByRole('button', { name: 'Feladat törlése' }).click()

  await expect(page.getByText('A feladat törölve.')).toBeVisible()
  await expect(page.locator('.task-list-block').first()).not.toContainText('Torlendo aktiv feladat')
  await expect(page.locator('.task-list-block').first()).toContainText('Marado aktiv feladat')

  const historyRow = page.locator('.task-history-item').filter({ hasText: 'Torlendo archiv feladat' }).first()
  await historyRow.getByRole('button', { name: 'Feladat törlése' }).click()

  await expect(page.getByText('Még nincs lezárt feladat.')).toBeVisible()
})

test('lezárt feladatok listaja a mait is mutatja, prioritás szerint rendez és lapozható', async ({ page }) => {
  const planDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(new Date())
  const previousDate = shiftDate(planDate, -1)
  const olderDate = shiftDate(planDate, -2)

  await attachSupabaseMock(page, {
    task_entries: [
      {
        id: 'task-completed-today',
        plan_date: planDate,
        priority: 'A1',
        description: 'Mai lezárt feladat',
        is_completed: true,
        completed_at: `${planDate}T08:30:00.000Z`,
        created_at: `${planDate}T07:30:00.000Z`,
      },
      {
        id: 'task-prev-b2',
        plan_date: previousDate,
        priority: 'B2',
        description: 'Előző napi B2 feladat',
        is_completed: true,
        completed_at: `${previousDate}T11:00:00.000Z`,
        created_at: `${previousDate}T08:00:00.000Z`,
      },
      {
        id: 'task-prev-a1',
        plan_date: previousDate,
        priority: 'A1',
        description: 'Előző napi A1 feladat',
        is_completed: true,
        completed_at: `${previousDate}T12:00:00.000Z`,
        created_at: `${previousDate}T07:00:00.000Z`,
      },
      {
        id: 'task-prev-c1',
        plan_date: previousDate,
        priority: 'C1',
        description: 'Előző napi C1 feladat',
        is_completed: true,
        completed_at: `${previousDate}T10:00:00.000Z`,
        created_at: `${previousDate}T09:00:00.000Z`,
      },
      {
        id: 'task-older-a2',
        plan_date: olderDate,
        priority: 'A2',
        description: 'Régebbi A2 feladat',
        is_completed: true,
        completed_at: `${olderDate}T10:30:00.000Z`,
        created_at: `${olderDate}T08:30:00.000Z`,
      },
    ],
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Gondolatok + tervezés' }).click()

  const historyItems = page.locator('.task-history-list .task-history-item')
  await expect(historyItems).toHaveCount(3)
  await expect(historyItems.nth(0)).toContainText('Mai lezárt feladat')
  await expect(historyItems.nth(1)).toContainText('Előző napi A1 feladat')
  await expect(historyItems.nth(2)).toContainText('Előző napi B2 feladat')
  await expect(page.locator('.task-history-list')).not.toContainText('Régebbi A2 feladat')
  await expect(page.locator('.task-history-list')).not.toContainText('Előző napi C1 feladat')

  await page.getByRole('button', { name: 'Régebbiek' }).click()

  await expect(historyItems).toHaveCount(2)
  await expect(historyItems.nth(0)).toContainText('Előző napi C1 feladat')
  await expect(historyItems.nth(1)).toContainText('Régebbi A2 feladat')
})
