import { test, expect } from '@playwright/test'
import { expectMainShell, loginAsE2EUser } from './helpers/auth'

test.describe('email wave 24', { tag: '@auth' }, () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2EUser(page)
  })

  test('email page shows compose and account strip', async ({ page }) => {
    await page.goto('/email')
    await expectMainShell(page)
    await expect(page.getByRole('button', { name: /compose/i })).toBeVisible()
    await expect(page.getByRole('group', { name: /email accounts/i })).toBeVisible()
  })

  test('compose opens WYSIWYG editor', async ({ page }) => {
    await page.goto('/email')
    await page.getByRole('button', { name: /compose/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('textbox', { name: /write your message/i })).toBeVisible()
    await expect(page.getByRole('toolbar', { name: /formatting/i })).toBeVisible()
  })

  test('writing style panel is present', async ({ page }) => {
    await page.goto('/email')
    await expect(page.getByText(/writing style/i)).toBeVisible()
  })
})
