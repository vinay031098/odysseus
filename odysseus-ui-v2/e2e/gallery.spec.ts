import { test, expect } from '@playwright/test'
import { expectMainShell, loginAsE2EUser } from './helpers/auth'

test.describe('gallery', { tag: '@auth' }, () => {
  test.beforeEach(async ({ page }) => {
    await loginAsE2EUser(page)
  })

  test('gallery page shows grid and select mode', async ({ page }) => {
    await page.goto('/gallery')
    await expectMainShell(page)
    await expect(page.getByTestId('gallery-grid').or(page.getByTestId('gallery-drop-zone'))).toBeVisible()
    await page.getByTestId('gallery-select-btn').click()
    await expect(page.getByTestId('gallery-bulk-bar')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel selection' }).click()
    await expect(page.getByTestId('gallery-bulk-bar')).not.toBeVisible()
  })

  test('tag filter chips render when tags exist', async ({ page }) => {
    await page.goto('/gallery')
    const filters = page.getByTestId('gallery-tag-filters')
    if (await filters.count()) {
      await expect(filters).toBeVisible()
    }
  })

  test('editor opens from detail when photo selected', async ({ page }) => {
    await page.goto('/gallery')
    const tile = page.getByTestId('gallery-tile').first()
    if (!(await tile.count())) {
      test.skip(true, 'No gallery photos to test editor entry')
      return
    }
    await tile.click()
    await expect(page.getByTestId('gallery-image-detail')).toBeVisible()
    const editBtn = page.getByRole('button', { name: 'Edit in canvas editor' })
    if (await editBtn.count()) {
      await editBtn.click()
      await expect(page.getByTestId('gallery-editor')).toBeVisible()
      await page.getByRole('button', { name: 'Close editor' }).click()
      await expect(page.getByTestId('gallery-editor')).not.toBeVisible()
    }
  })
})
