import { test, expect } from './fixtures';

test('intro waits for start game click', async ({ page }) => {
  const mockEvents = {
    events: [
      {
        year: 1969,
        text: 'Apollo 11 lands on the Moon.',
        pages: [
          {
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/Apollo_11' },
            },
            thumbnail: { source: 'https://upload.wikimedia.org/placeholder.png' },
          },
        ],
      },
      {
        year: 1989,
        text: 'The World Wide Web is proposed.',
        pages: [
          {
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/World_Wide_Web' },
            },
          },
        ],
      },
      {
        year: 1997,
        text: 'Mars Pathfinder lands on Mars.',
        pages: [
          {
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/Mars_Pathfinder' },
            },
          },
        ],
      },
      {
        year: 2007,
        text: 'The first iPhone is released.',
        pages: [
          {
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/IPhone_(1st_generation)' },
            },
          },
        ],
      },
      {
        year: 2012,
        text: 'Curiosity rover lands on Mars.',
        pages: [
          {
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/Curiosity_(rover)' },
            },
          },
        ],
      },
    ],
  };

  await page.route(/https:\/\/en\.wikipedia\.org\/api\/rest_v1\/feed\/onthisday\/events\/\d+\/\d+/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEvents),
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();

  await page.waitForResponse(/\/api\/rest_v1\/feed\/onthisday\/events\//);
  await expect(page.locator('.game')).toHaveCount(0);

  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByText('Next event')).toBeVisible();
});
