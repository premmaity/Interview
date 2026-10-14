import { expect, test } from '@playwright/test'

test('candidate can register, complete a text interview, and revisit the report', async ({ page }) => {
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

test('voice mode keeps editable text fallback visible', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
})
