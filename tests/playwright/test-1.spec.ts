import { test, expect } from '../hook-2';

test('File 1: Test 1', async ({ page }) => {
  await expect(page).toHaveTitle(/Playwright/);
  console.log(`${test.info().status?.toUpperCase()}`);
});

// test('File 1: Test 2', async ({ page }) => {
//   await expect(page).toHaveTitle(/Playwright/);
//   console.log(`${test.info().status?.toUpperCase()}`);
// });

// test('File 1: Test 3', async ({ page }) => {
//   await expect(page).toHaveTitle(/Playwright/);
//   console.log(`${test.info().status?.toUpperCase()}`);
// });

// test('File 1: Test 4', async ({ page }) => {
//   await expect(page).toHaveTitle(/Playwright/);
//   console.log(`${test.info().status?.toUpperCase()}`);
// });

// test.skip('File 1: Test 5', async ({ page }) => {
//   await expect(page).toHaveTitle(/Playwright/);
//   console.log(`${test.info().status?.toUpperCase()}`);
// });

test('File 1: Test 6', async ({ }) => {
  throw new Error("This test failed on purpose!");
});
