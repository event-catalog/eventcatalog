import { test, expect } from '@playwright/test';

test.describe('Specifications', () => {
  test('OpenAPI', async ({ page }) => {
    const pageUrl = '/docs/services/OrdersService/0.0.3';

    await page.goto(pageUrl);

    const specLink = page.getByRole('link', { name: 'OpenAPI spec', exact: true });
    await expect(specLink).toBeVisible();

    await specLink.click();

    await page.waitForURL(`${pageUrl}/spec`);

    const title = page.getByText('Simple Task - API 1.0.2');
    await expect(title).toBeVisible();
  });

  test('AsyncAPI', async ({ page }) => {
    const pageUrl = '/docs/services/OrdersService/0.0.3';
    await page.goto(pageUrl);

    const specLink = page.getByRole('link', { name: 'AsyncAPI spec', exact: true });
    await expect(specLink).toBeVisible();

    await specLink.click();

    await page.waitForURL(`${pageUrl}/asyncapi`);

    const title = page.locator('#introduction').getByText('Order service 1.0.0');
    await expect(title).toBeVisible();
  });
});
