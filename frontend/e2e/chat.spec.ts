import { test, expect } from '@playwright/test'
import { expectMainShell, loginAsE2EUser } from './helpers/auth'

test.describe('chat parity', { tag: '@auth' }, () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2EUser(page)
    await page.goto('/chat')
    await expectMainShell(page)
  })

  test('composer shows chat parity toggles', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Chat' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agent' })).toBeVisible()
    await expect(page.getByText('Web', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Voice input' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Insert emoji' })).toBeVisible()
  })

  test('agent mode reveals shell and plan toggles', async ({ page }) => {
    await page.getByRole('button', { name: 'Agent' }).click()
    await expect(page.getByText('Shell')).toBeVisible()
    await expect(page.getByText('Plan', { exact: true })).toBeVisible()
  })

  test('compare-in-chat mode can be toggled', async ({ page }) => {
    const compareBtn = page.getByRole('button', { name: 'Compare' })
    await compareBtn.click()
    await expect(compareBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByText('Compare mode is on. Send a message to stream the same prompt to two models side by side.'),
    ).toBeVisible()
  })

  test('document dock toggle opens session document panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const showBtn = page.getByRole('button', { name: 'Show document panel' })
    await expect(showBtn).toBeVisible()
    await showBtn.click()
    await expect(page.getByRole('button', { name: 'Hide document panel' })).toBeVisible()
    await expect(page.getByText('Documents', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /library/i })).toBeVisible()
    await expect(page.getByText('Select a document to edit alongside chat.')).toBeVisible()
  })
})
