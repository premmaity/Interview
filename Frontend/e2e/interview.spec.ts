import { expect, test, type Page } from '@playwright/test'

async function registerAndSignIn(page: Page) {
  const unique = Date.now()
  const email = `candidate-${unique}@example.com`
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Username').fill(`candidate${unique}`)
  await page.getByLabel('Password').fill('Correct-Horse-42')
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('Correct-Horse-42')
  await page.getByRole('button', { name: /sign in/i }).click()
}

test('candidate can register, complete a text interview, and revisit the report', async ({ page }) => {
  await registerAndSignIn(page)
  await page.getByRole('link', { name: /start interview/i }).first().click()
  await page.getByLabel('Target role').fill('Backend engineer')
  await page.getByLabel('Questions').fill('1')
  await page.getByRole('button', { name: /begin interview/i }).click()
  await page.getByLabel('Editable answer transcript').fill(
    'I use an idempotency key, a unique constraint, one transaction, and response replay.',
  )
  await page.getByRole('button', { name: /submit answer/i }).click()
  await expect(page.getByRole('heading', { name: /your evidence, organized/i })).toBeVisible()
  await expect(page.getByText(/coaching feedback, not objective hiring decisions/i)).toBeVisible()
})

test('voice mode exposes cross-browser recording, question audio, and editable text', async ({ page }) => {
  test.setTimeout(180_000)
  await registerAndSignIn(page)
  await page.getByRole('link', { name: /start interview/i }).first().click()
  await page.getByLabel('Target role').fill('Backend engineer')
  await page.getByLabel('Questions').fill('1')
  await page.getByLabel(/voice \+ transcript/i).check()
  await page.getByRole('button', { name: /begin interview/i }).click()

  await expect(page.getByRole('button', { name: /read question aloud/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /record answer/i })).toBeEnabled()
  await expect(page.getByText(/works in firefox, chrome, and edge/i)).toBeVisible()
  await expect(page.getByLabel('Editable answer transcript')).toBeEditable()

  if (!process.env.PLAYWRIGHT_AUDIO_FIXTURE) return
  await page.getByRole('button', { name: /record answer/i }).click()
  await expect(page.getByRole('button', { name: /stop recording/i })).toBeVisible()
  await page.waitForTimeout(12_000)
  await page.getByRole('button', { name: /stop recording/i }).click()
  await expect(page.getByLabel('Editable answer transcript')).not.toHaveValue('', {
    timeout: 150_000,
  })
})
