import { test, expect } from '@playwright/test'

test('page loads and shows main menu', async ({ page }) => {
  await page.goto('/en')
  await expect(page).toHaveTitle(/Flight Simulator/)
  await expect(page.getByText('Quick Flight')).toBeVisible()
})

test('language switch EN to AR', async ({ page }) => {
  await page.goto('/en')
  await page.getByText('العربية').click()
  await expect(page).toHaveURL(/\/ar/)
  await expect(page.getByText('محاكي الطيران')).toBeVisible()
})

test('start flight and see HUD', async ({ page }) => {
  await page.goto('/en')
  await page.getByText('Quick Flight').click()
  await page.waitForTimeout(3000)
  // canvas should exist
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
})
