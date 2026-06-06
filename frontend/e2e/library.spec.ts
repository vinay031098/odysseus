import { test, expect } from '@playwright/test'
import { expectMainShell, loginAsE2EUser } from './helpers/auth'

test.describe('library', { tag: '@auth' }, () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2EUser(page)
  })

  test('library page loads with document controls', async ({ page }) => {
    await page.goto('/library')
    await expectMainShell(page)
    await expect(page.getByRole('heading', { name: /documents/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^new$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /bulk select/i })).toBeVisible()
    await expect(page.getByText(/select a document to edit/i)).toBeVisible()
  })

  test('creates a markdown document and opens editor tab', async ({ page }) => {
    await page.goto('/library')
    await page.getByRole('button', { name: /^new$/i }).click()
    await expect(page.getByRole('tab', { name: /untitled/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByLabel('Document content')).toBeVisible()
  })

  test('bulk select mode toggles checkboxes', async ({ page }) => {
    await page.goto('/library')
    await page.getByRole('button', { name: /bulk select/i }).click()
    await expect(page.getByRole('button', { name: /bulk select/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('creates canvas document', async ({ page }) => {
    await page.goto('/library')
    await page.getByRole('button', { name: /new canvas/i }).click()
    await expect(page.getByRole('tab', { name: /canvas/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/layers/i).first()).toBeVisible()
  })
})
