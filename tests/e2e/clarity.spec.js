import { expect, test } from '@playwright/test'

test('Clarity csak jóváhagyás után inicializálódik', async ({ page }) => {
  await page.route('https://www.clarity.ms/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    })
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Használati analitika engedélyezése' })).toBeVisible()
  await expect(page.locator('#clarity-script')).toHaveCount(0)
  await expect.poll(async () => page.evaluate(() => window.__LEPESHANG_CLARITY__?.status)).toBe('waiting-for-consent')

  await page.getByRole('button', { name: 'Analitika engedélyezése' }).click()

  await expect.poll(async () => page.evaluate(() => window.__LEPESHANG_CLARITY__?.status)).toBe('consent-granted')

  const clarityStatus = await page.evaluate(() => window.__LEPESHANG_CLARITY__)

  expect(clarityStatus).toMatchObject({
    enabled: true,
    status: 'consent-granted',
    consent: 'granted',
  })
  expect(clarityStatus.projectId).toBeTruthy()

  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('lepeshang-analytics-consent'))).toBe('granted')

  const clarityScript = page.locator('#clarity-script')

  await expect(clarityScript).toHaveAttribute(
    'src',
    new RegExp(`https://www\\.clarity\\.ms/tag/${clarityStatus.projectId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?ref=npm`),
  )
})
