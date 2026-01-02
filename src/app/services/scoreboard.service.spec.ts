import { ScoreboardService } from './scoreboard.service';

describe('ScoreboardService', () => {
  let service: ScoreboardService;

  beforeEach(() => {
    service = new ScoreboardService();
  });

  it('loads scoreboard entries from localStorage', () => {
    const payload = JSON.stringify([
      { score: 10, elapsedMs: 1200, correct: 3, attempts: 4, bestStreak: 2, finishedAt: '2024-01-01' },
    ]);
    spyOn(window.localStorage, 'getItem').and.returnValue(payload);

    const entries = service.load();
    expect(entries.length).toBe(1);
    expect(entries[0].score).toBe(10);
  });

  it('saves scoreboard entries to localStorage', () => {
    const setSpy = spyOn(window.localStorage, 'setItem');
    service.save([{ score: 5, elapsedMs: 500, correct: 2, attempts: 3, bestStreak: 1, finishedAt: '2024-01-02' }]);
    expect(setSpy).toHaveBeenCalled();
  });

  it('clears scoreboard entries from localStorage', () => {
    const removeSpy = spyOn(window.localStorage, 'removeItem');
    service.clear();
    expect(removeSpy).toHaveBeenCalled();
  });
});
