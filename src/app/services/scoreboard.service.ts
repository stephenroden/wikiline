import { Injectable } from '@angular/core';
import type { ScoreEntry } from '../models';

@Injectable({ providedIn: 'root' })
export class ScoreboardService {
  private storageKey = 'wikiline-scoreboard';

  load(): ScoreEntry[] {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ScoreEntry[];
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch {
      return [];
    }
  }

  save(entries: ScoreEntry[]) {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch {
      // Ignore storage failures in private mode.
    }
  }

  clear() {
    try {
      window.localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage failures in private mode.
    }
  }
}
