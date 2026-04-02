import { expect, test } from '@playwright/test'
import { attachSupabaseMock } from './helpers/supabaseMock.js'

test('szolgáltató és kategória kezelése stabil marad a források mellett', async ({ page }) => {
  await attachSupabaseMock(page, {
    provider_options: [{ value: 'Spotify' }, { value: 'Mium' }],
    category_options: [{ value: 'Fókusz' }, { value: 'Archív' }],
    routine_blocks: [
      { id: 'block-1', name: 'Reggeli blokk', mode: 'morning', theme_mode: 'auto', is_active: true },
      { id: 'block-2', name: 'Esti blokk', mode: 'evening', theme_mode: 'auto', is_active: true },
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
        notes: 'Tesztforrás',
        is_active: true,
      },
    ],
  })
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/')
  await page.getByRole('button', { name: 'Kiegészítők' }).click()

  const providerForm = page.getByRole('form', { name: 'Szolgáltatók kezelése' })
  const categoryForm = page.getByRole('form', { name: 'Kategóriák kezelése' })
  const sourceForm = page.getByRole('form', { name: 'Források kezelése' })

  await providerForm.getByPlaceholder('Új szolgáltató').fill('Pocket Casts')
  await providerForm.getByRole('button', { name: 'Hozzáad' }).click()

  await expect(providerForm.getByText('Pocket Casts')).toBeVisible()
  await expect(sourceForm.getByLabel('Szolgáltató')).toContainText('Pocket Casts')

  await expect(providerForm.getByRole('button', { name: 'Szolgáltató törlése: Spotify' })).toBeDisabled()
  await expect(providerForm.getByText('1 forrás használja')).toBeVisible()

  await expect(categoryForm.getByRole('button', { name: 'Kategória törlése: Fókusz' })).toBeDisabled()
  await categoryForm.getByRole('button', { name: 'Kategória törlése: Archív' }).click()
  await expect(categoryForm.getByText('Archív')).toHaveCount(0)
})
