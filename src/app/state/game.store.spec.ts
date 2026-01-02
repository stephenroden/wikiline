import { GameStore } from './game.store';
import type { EventItem, ScoreEntry } from '../models';
import { EventsService } from '../services/events.service';
import { ScoreboardService } from '../services/scoreboard.service';
import { MatSnackBar } from '@angular/material/snack-bar';

const makeEvents = ():
  EventItem[] => [
    { year: 1900, title: 'Event 1900' },
    { year: 1910, title: 'Event 1910' },
    { year: 1920, title: 'Event 1920' },
    { year: 1930, title: 'Event 1930' },
    { year: 1940, title: 'Event 1940' },
  ];

describe('GameStore', () => {
  let store: GameStore;
  let eventsService: jasmine.SpyObj<EventsService>;
  let scoreboardService: jasmine.SpyObj<ScoreboardService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    eventsService = jasmine.createSpyObj('EventsService', ['fetchEventsWithRetry']);
    scoreboardService = jasmine.createSpyObj('ScoreboardService', ['load', 'save', 'clear']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    store = new GameStore(eventsService, scoreboardService, snackBar);
  });

  it('loads scoreboard entries on init', () => {
    const entries: ScoreEntry[] = [
      {
        score: 10,
        elapsedMs: 1000,
        correct: 2,
        attempts: 3,
        bestStreak: 2,
        finishedAt: '2024-01-01',
      },
    ];
    scoreboardService.load.and.returnValue(entries);

    store.init();

    expect(store.scoreboard()).toEqual(entries);
  });

  it('starts a game from preloaded events without refetching', async () => {
    const events = makeEvents();
    store.allEvents.set(events);

    await store.startGame();

    expect(eventsService.fetchEventsWithRetry).not.toHaveBeenCalled();
    expect(store.hasStarted()).toBeTrue();
    expect(store.slots().length).toBe(1);
    expect(store.current()).not.toBeNull();
  });

  it('fetches events when starting with an empty cache', async () => {
    const events = makeEvents();
    eventsService.fetchEventsWithRetry.and.resolveTo(events);

    await store.startGame();

    expect(eventsService.fetchEventsWithRetry).toHaveBeenCalledWith(2);
    expect(store.hasStarted()).toBeTrue();
  });

  it('awards points on a correct placement', async () => {
    const events = makeEvents();
    store.allEvents.set(events);
    spyOn(window, 'setInterval').and.returnValue(1 as unknown as number);
    spyOn(window, 'clearInterval');
    spyOn(Math, 'random').and.returnValue(0);
    spyOn(Date, 'now').and.returnValue(1000);

    await store.startGame();

    const active = store.current();
    expect(active).not.toBeNull();

    store.dropAt(active!, 1);

    expect(store.correct()).toBe(1);
    expect(store.attempts()).toBe(1);
    expect(store.score()).toBeGreaterThan(0);
  });

  it('records an incorrect placement and resets streak', async () => {
    const events = makeEvents();
    store.allEvents.set(events);
    spyOn(window, 'setInterval').and.returnValue(1 as unknown as number);
    spyOn(window, 'clearInterval');
    spyOn(Math, 'random').and.returnValue(0);
    spyOn(Date, 'now').and.returnValue(1000);

    await store.startGame();

    const active = store.current();
    expect(active).not.toBeNull();

    store.dropAt(active!, 0);

    expect(store.streak()).toBe(0);
    expect(store.attempts()).toBe(1);
    expect(store.correct()).toBe(0);
    expect(store.isCorrected(active!)).toBeTrue();
  });

  it('clears scoreboard using the service', () => {
    store.clearScoreboard();

    expect(store.scoreboard()).toEqual([]);
    expect(scoreboardService.clear).toHaveBeenCalled();
  });
});
