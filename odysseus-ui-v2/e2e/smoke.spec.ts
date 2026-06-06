import { test, expect } from '@playwright/test'
import { expectMainShell, HAS_E2E_AUTH, loginAsE2EUser } from './helpers/auth'

const ROUTES = [
  { path: '/chat', heading: /chat/i },
  { path: '/group-chat', heading: /group/i },
  { path: '/agents', heading: /agent|skill/i },
  { path: '/notes', heading: /note/i },
  { path: '/tasks', heading: /task/i },
  { path: '/calendar', heading: /calendar/i },
  { path: '/memory', heading: /memory/i },
  { path: '/compare', heading: /compare/i },
  { path: '/research', heading: /research/i },
  { path: '/cookbook', heading: /cookbook|recipe/i },
  { path: '/email', heading: /email|mail/i },
  { path: '/gallery', heading: /gallery|photo/i },
  { path: '/library', heading: /document/i },
  { path: '/settings', heading: /settings/i },
] as const

const PROTECTED_PATHS = ['/', '/chat', '/settings', '/library'] as const

test.describe('v2 smoke', () => {
  test.describe('unauthenticated', () => {
    test('login page loads', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByRole('heading', { name: 'Odysseus' })).toBeVisible()
      await expect(page.getByLabel('Username')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeEnabled()
    })

    test('login page has document title', async ({ page }) => {
      await page.goto('/login')
      await expect(page).toHaveTitle(/Odysseus/)
    })

    test('login page has no main shell before auth', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('#main-content')).toHaveCount(0)
    })

    test('login form keeps HTML5 validation without credentials', async ({ page }) => {
      await page.goto('/login')
      await page.getByRole('button', { name: /sign in|log in/i }).click()
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByLabel('Username')).toBeVisible()
    })

    test('login username field accepts input', async ({ page }) => {
      await page.goto('/login')
      const username = page.getByLabel('Username')
      await username.fill('admin')
      await expect(username).toHaveValue('admin')
    })

    for (const path of PROTECTED_PATHS) {
      test(`unauthenticated ${path} redirects to login`, async ({ page }) => {
        await page.goto(path)
        await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
        await expect(page.getByRole('heading', { name: 'Odysseus' })).toBeVisible()
      })
    }

    test('unknown route shows login or app shell without crashing', async ({ page }) => {
      await page.goto('/this-route-does-not-exist')
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('#root')).toBeVisible()
    })

    test('SPA root renders without JavaScript errors on login', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))
      await page.goto('/login')
      await expect(page.getByRole('heading', { name: 'Odysseus' })).toBeVisible()
      expect(errors).toEqual([])
    })
  })

  test.describe('authenticated routes', { tag: '@auth' }, () => {
    test.beforeEach(async ({ page }) => {
      if (!HAS_E2E_AUTH) {
        test.skip(true, 'Set ODYSSEUS_E2E_PASSWORD to run authenticated smoke tests')
      }
      await loginAsE2EUser(page)
    })

    test('lands on chat after login', async ({ page }) => {
      await expectMainShell(page)
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    })

    for (const { path, heading } of ROUTES) {
      test(`navigates to ${path}`, async ({ page }) => {
        await page.goto(path)
        await expectMainShell(page)
        await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({
          timeout: 10_000,
        })
      })
    }

    test('cookbook tabs render', async ({ page }) => {
      await page.goto('/cookbook')
      await expect(page.getByRole('tab', { name: 'Presets' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Download' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'What Fits' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Running' })).toBeVisible()
      await page.getByRole('tab', { name: 'Download' }).click()
      await expect(page.getByRole('heading', { name: 'Download models' })).toBeVisible()
      await page.getByRole('tab', { name: 'What Fits' }).click()
      await expect(page.getByRole('heading', { name: 'What fits?' })).toBeVisible()
    })
  })
})
