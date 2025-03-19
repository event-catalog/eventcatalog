import { test, expect } from '@playwright/test';

test.describe('Changelog', () => {
  test(
    'render versions correctly',
    {
      annotation: {
        type: 'issue',
        description: 'https://github.com/event-catalog/eventcatalog/issues/1200#issuecomment-2733012789',
      },
    },
    async ({ page }) => {
      await page.goto('/docs/services/OrdersService/0.0.3/changelog');

      await Promise.all([
        expect(page.getByRole('link', { name: '0.0.3' })).toBeVisible(), // version
        expect(page.getByText('openapi.yml CHANGED')).toBeVisible(), // file diff
        expect(page.getByRole('link', { name: '0.0.2' })).toBeVisible(), // version
      ]);
    }
  );
});
