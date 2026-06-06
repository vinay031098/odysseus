import { type Page, test } from '@playwright/test'

/** Default Playwright target when a live Odysseus backend serves the SPA. */
export const BACKEND_BASE_URL = 'http://127.0.0.1:7860'

export const E2E_USER = process.env.ODYSSEUS_E2E_USER ?? 'admin'
export const E2E_PASSWORD = process.env.ODYSSEUS_E2E_PASSWORD
export const HAS_E2E_AUTH = Boolean(E2E_PASSWORD)

/** Skip the current test when ODYSSEUS_E2E_PASSWORD is unset (CI without secrets). */
export function skipWithoutE2EAuth(reason?: string): void {
  test.skip(
    !HAS_E2E_AUTH,
    reason ?? 'Set ODYSSEUS_E2E_PASSWORD (and PLAYWRIGHT_BASE_URL=http://127.0.0.1:7860) for authenticated e2e',
  )
}

/** Log in via the SPA login form; skips when credentials are missing. */
export async function loginAsE2EUser(page: Page): Promise<void> {
  skipWithoutE2EAuth()
  await page.goto('/login')
  await page.getByLabel('Username').fill(E2E_USER)
  await page.getByLabel('Password').fill(E2E_PASSWORD!)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/(chat)?/, { timeout: 15_000 })
  await expectMainShell(page)
}

/** Assert the authenticated app shell is visible. */
export async function expectMainShell(page: Page): Promise<void> {
  await page.locator('#main-content').waitFor({ state: 'visible', timeout: 15_000 })
}
