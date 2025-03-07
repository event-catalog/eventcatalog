import { test, expect } from '@playwright/test';

test.describe('Schema Viewer', () => {
  test('Should render schema viewer correctly', async ({ page }) => {
    const pageUrl = '/docs/queries/GetSubscriptionStatus/0.0.2';

    await page.goto(pageUrl);

    await expect(page.locator('#GetSubscriptionStatus-SchemaViewer-portal')).toContainText('The unique identifier for the user.');
  });
});
