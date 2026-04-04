import { expect, test } from '@playwright/test'
import { attachSupabaseMock } from './helpers/supabaseMock.js'

test('gondolat rögzíthető, visszanézhető és törölhető', async ({ page }) => {
  await attachSupabaseMock(page)
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/')

  const thoughtField = page.getByLabel('Mai gondolat szerkesztése')
  await thoughtField.fill('Ma érdemes lassabban, de fókuszáltabban haladni.')
  await thoughtField.blur()

  await page.getByRole('button', { name: 'Gondolatok + tervezés' }).click()
  await expect(page.getByRole('heading', { name: 'Korábbi bejegyzések' })).toBeVisible()
  await expect(page.getByText('Ma érdemes lassabban, de fókuszáltabban haladni.')).toBeVisible()

  await page.getByRole('button', { name: /Gondolat törlése:/ }).click()
  await expect(page.getByText('A gondolat törölve.')).toBeVisible()
  await expect(page.getByText('Ma érdemes lassabban, de fókuszáltabban haladni.')).toHaveCount(0)
})
