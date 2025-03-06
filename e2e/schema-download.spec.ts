import { test, expect } from '@playwright/test';

test.describe('Schema Download', () => {
  test('Should download schema file from message page', async ({ page }) => {
    // Navigate to the message page
    await page.goto('/docs/commands/AddInventory/0.0.3');

    // Wait for the schema link to be visible
    const schemaLink = page.getByRole('link', { name: 'Download schema' });
    await expect(schemaLink).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click the schema link
    await schemaLink.click();

    // Wait for the download to start
    const download = await downloadPromise;

    // Verify the downloaded file name
    expect(download.suggestedFilename()).toBe('Add inventory(0.0.3)-schema.json');

    // Ensure the download completes successfully
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
  });

  test('Should download schema file from service page', async ({ page }) => {
    // Navigate to the service page
    await page.goto('/docs/services/OrdersService/0.0.3');

    // Wait for the schema link to be visible
    const schemaLink = page.getByRole('link', { name: 'Download schema' });
    await expect(schemaLink).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click the schema link
    await schemaLink.click();

    // Wait for the download to start
    const download = await downloadPromise;

    // Verify the downloaded file name
    expect(download.suggestedFilename()).toBe('Orders Service(0.0.3)-openapi.yml');

    // Ensure the download completes successfully
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
  });
});
