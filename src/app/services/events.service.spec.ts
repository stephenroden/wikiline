import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(() => {
    service = new EventsService();
  });

  it('returns events when the API response is valid', async () => {
    const makeEvent = (year: number) => ({
      year,
      text: `Example event ${year} (detail)`,
      pages: [
        {
          content_urls: { desktop: { page: `https://example.com/page-${year}` } },
          thumbnail: { source: `https://example.com/thumb-${year}.jpg` },
        },
      ],
    });
    const mockResponse = {
      ok: true,
      json: async () => ({
        events: [1980, 1981, 1982, 1983, 1984].map(makeEvent),
      }),
    } as Response;

    spyOn(window, 'fetch').and.resolveTo(mockResponse);

    const events = await service.fetchEventsWithRetry(1);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].title).toContain('Example event');
    expect(events[0].url).toContain('https://example.com/page');
    expect(events[0].thumbnail).toContain('https://example.com/thumb');
  });

  it('throws after retrying when the API response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Server Error',
    } as Response;

    spyOn(window, 'fetch').and.resolveTo(mockResponse);

    await expectAsync(service.fetchEventsWithRetry(1)).toBeRejected();
  });
});
