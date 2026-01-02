import { Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { EventItem, LoadError, ScoreEntry } from '../models';
import { EventsService } from '../services/events.service';
import { ScoreboardService } from '../services/scoreboard.service';

@Injectable({ providedIn: 'root' })
export class GameStore {
  private deck = signal<EventItem[]>([]);
  slots = signal<EventItem[]>([]);
  current = signal<EventItem | null>(null);
  correct = signal(0);
  attempts = signal(0);
  score = signal(0);
  streak = signal(0);
  bestStreak = signal(0);
  loading = signal(false);
  allEvents = signal<EventItem[]>([]);
  incorrectKeys = signal<string[]>([]);
  incorrectMessages = signal<Record<string, string>>({});
  elapsedMs = signal(0);
  elapsedLabel = signal('0:00');
  scoreboard = signal<ScoreEntry[]>([]);
  showIntroOverlay = signal(true);
  hasStarted = signal(false);
  showCompletion = signal(true);
  loadError = signal<LoadError | null>(null);
  demoMode = signal(false);

  private cardStart = 0;
  private startRequested = false;
  private roundStartMs = 0;
  private timerId: number | null = null;

  constructor(
    private eventsService: EventsService,
    private scoreboardService: ScoreboardService,
    private snackBar: MatSnackBar,
  ) {}

  init() {
    this.loadEvents(false);
    this.loadScoreboard();
  }

  dispose() {
    this.stopTimer();
  }

  async startGame() {
    this.endDemoState();
    this.startRequested = true;
    this.showIntroOverlay.set(false);
    if (this.loading()) return;
    if (this.loadError()) {
      await this.loadEvents(true);
      return;
    }
    if (this.allEvents().length) {
      this.startRound(this.allEvents());
      this.hasStarted.set(true);
      this.startRequested = false;
      return;
    }
    await this.loadEvents(true);
  }

  async startDemo() {
    this.demoMode.set(true);
    this.startRequested = true;
    this.showIntroOverlay.set(false);
    if (this.loading()) return;
    if (this.loadError()) {
      await this.loadEvents(true);
      return;
    }
    if (this.allEvents().length) {
      this.startRound(this.allEvents());
      this.hasStarted.set(true);
      this.startRequested = false;
      return;
    }
    await this.loadEvents(true);
  }

  notifyDemoStart() {
    this.showToast('Demo: we will drag a few cards into the right spots.', 'success');
  }

  endDemoState() {
    this.demoMode.set(false);
    this.showIntroOverlay.set(true);
    this.startRequested = false;
  }

  async reset() {
    this.endDemoState();
    this.showIntroOverlay.set(false);
    this.stopTimer();
    await this.loadEvents(true);
  }

  setSlots(updated: EventItem[]) {
    this.slots.set(updated);
  }

  dropAt(dragged: EventItem | null, position: number) {
    if (!dragged || !this.current()) return;
    const updated = [...this.slots()];
    updated.splice(position, 0, dragged);
    const sorted = updated.every((item, i) => i === 0 || updated[i - 1].year <= item.year);
    const elapsedSeconds = Math.max(0, (Date.now() - this.cardStart) / 1000);
    const timeBonus = Math.max(0, Math.round(6 - elapsedSeconds));
    const basePoints = 10;
    this.attempts.update((a) => a + 1);
    if (sorted) {
      const nextStreak = this.streak() + 1;
      const streakBonus = nextStreak * 2;
      const points = Math.max(0, basePoints + streakBonus + timeBonus);
      this.streak.set(nextStreak);
      if (nextStreak > this.bestStreak()) {
        this.bestStreak.set(nextStreak);
      }
      this.score.update((s) => s + points);
      this.correct.update((c) => c + 1);
      this.showToast(`Nice! +${points} points.`, 'success');
    } else {
      const message = this.placementMessage(dragged, position, updated);
      const corrected = [...this.slots()];
      const idx = corrected.findIndex((ev) => ev.year > dragged.year);
      const insertIdx = idx === -1 ? corrected.length : idx;
      corrected.splice(insertIdx, 0, dragged);
      updated.splice(0, updated.length, ...corrected);
      this.markIncorrect(dragged);
      this.markIncorrectMessage(dragged, message);
      const points = Math.max(0, Math.floor(basePoints / 2) + timeBonus);
      this.streak.set(0);
      this.score.update((s) => s + points);
      const toast = points
        ? `Not quite. ${message} +${points} points.`
        : `Not quite. ${message} Moved to the correct position.`;
      this.showToast(toast, 'warn');
    }
    this.slots.set(updated);
    const deck = this.deck();
    const [next, ...rest] = deck;
    this.current.set(next || null);
    this.deck.set(rest);
    this.cardStart = Date.now();
    if (!this.current()) {
      this.showCompletion.set(true);
      this.stopTimer();
      this.saveScoreboardEntry();
    }
  }

  isCorrected = (item: EventItem) => {
    return this.incorrectKeys().includes(this.keyFor(item));
  };

  incorrectMessage = (item: EventItem) => {
    const key = this.keyFor(item);
    return this.incorrectMessages()[key] || null;
  };

  private async loadEvents(autoStart: boolean) {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const events = await this.eventsService.fetchEventsWithRetry(2);
      this.allEvents.set(events);
      if (autoStart || this.startRequested) {
        this.startRound(events);
        this.hasStarted.set(true);
        this.showIntroOverlay.set(false);
        this.startRequested = false;
      }
    } catch (err) {
      const info = err as LoadError;
      this.loadError.set({
        message: info.message || 'Failed to load events.',
        status: info.status,
        statusText: info.statusText,
        url: info.url,
      });
      this.showIntroOverlay.set(true);
      this.hasStarted.set(false);
      this.showCompletion.set(false);
      this.current.set(null);
      this.slots.set([]);
      this.deck.set([]);
      this.startRequested = false;
      this.endDemoState();
    } finally {
      this.loading.set(false);
    }
  }

  private startRound(events: EventItem[]) {
    const shuffled = this.shuffle([...events]);
    const [first, ...rest] = shuffled;
    if (!first) return;
    this.slots.set([first]);
    const [next, ...deck] = rest;
    this.current.set(next || null);
    this.deck.set(deck);
    this.correct.set(0);
    this.attempts.set(0);
    this.score.set(0);
    this.streak.set(0);
    this.bestStreak.set(0);
    this.cardStart = Date.now();
    this.clearFeedback();
    this.showCompletion.set(false);
    this.startTimer();
  }

  private shuffle(list: EventItem[]) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private keyFor(item: EventItem) {
    return `${item.year}-${item.title}`;
  }

  private clearFeedback() {
    this.incorrectKeys.set([]);
    this.incorrectMessages.set({});
  }

  private startTimer() {
    this.roundStartMs = Date.now();
    this.elapsedMs.set(0);
    this.elapsedLabel.set('0:00');
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
    }
    this.timerId = window.setInterval(() => {
      const elapsed = Date.now() - this.roundStartMs;
      this.elapsedMs.set(elapsed);
      this.elapsedLabel.set(this.formatElapsed(elapsed));
    }, 250);
  }

  private stopTimer() {
    if (this.timerId === null) return;
    window.clearInterval(this.timerId);
    this.timerId = null;
  }

  private formatElapsed(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private loadScoreboard() {
    this.scoreboard.set(this.scoreboardService.load());
  }

  private saveScoreboardEntry() {
    if (this.demoMode()) return;
    const entry: ScoreEntry = {
      score: this.score(),
      elapsedMs: this.elapsedMs(),
      correct: this.correct(),
      attempts: this.attempts(),
      bestStreak: this.bestStreak(),
      finishedAt: new Date().toISOString(),
    };
    const updated = [entry, ...this.scoreboard()].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.elapsedMs - b.elapsedMs;
    });
    const trimmed = updated.slice(0, 10);
    this.scoreboard.set(trimmed);
    this.scoreboardService.save(trimmed);
  }

  clearScoreboard() {
    this.scoreboard.set([]);
    this.scoreboardService.clear();
  }

  private placementMessage(item: EventItem, placedIndex: number, placedList: EventItem[]) {
    const year = item.year;
    const prev = placedIndex > 0 ? placedList[placedIndex - 1] : null;
    const next = placedIndex < placedList.length - 1 ? placedList[placedIndex + 1] : null;
    if (!prev && next) {
      return `This event was ${year} and you placed it before ${next.year}.`;
    }
    if (prev && !next) {
      return `This event was ${year} and you placed it after ${prev.year}.`;
    }
    if (prev && next) {
      return `This event was ${year} and you placed it between ${prev.year} and ${next.year}.`;
    }
    return `This event was ${year}.`;
  }

  private markIncorrectMessage(item: EventItem, message: string) {
    const key = this.keyFor(item);
    this.incorrectMessages.update((messages) => ({ ...messages, [key]: message }));
  }

  private markIncorrect(item: EventItem) {
    const key = this.keyFor(item);
    this.incorrectKeys.update((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }

  private showToast(message: string, type: 'warn' | 'success' = 'warn') {
    this.snackBar.open(message, 'Dismiss', {
      duration: 2400,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [type === 'warn' ? 'snackbar-warn' : 'snackbar-success'],
    });
  }
}
