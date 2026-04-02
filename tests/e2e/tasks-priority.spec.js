import { expect, test } from '@playwright/test'
import { attachSupabaseMock } from './helpers/supabaseMock.js'

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
  await expect(page.locator('.task-history-list').getByText('Legfontosabb sürgős feladat')).toBeVisible()
})
