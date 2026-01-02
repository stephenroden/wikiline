import { Injectable } from '@angular/core';
import type { EventItem, LoadError } from '../models';

type WikipediaPage = {
  content_urls?: {
    desktop?: { page?: string };
    mobile?: { page?: string };
  };
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

type WikipediaEvent = {
  year?: number;
  text?: string;
  pages?: WikipediaPage[];
};

type WikipediaResponse = {
  events?: WikipediaEvent[];
};

@Injectable({ providedIn: 'root' })
export class EventsService {
  async fetchEventsWithRetry(maxAttempts: number): Promise<EventItem[]> {
    let lastError: LoadError | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          throw { message: 'Bad response from Wikipedia.', status: res.status, statusText: res.statusText, url };
        }
        const data = (await res.json()) as WikipediaResponse;
        const candidates = (data.events || [])
          .filter((ev) => typeof ev.year === 'number' && typeof ev.text === 'string')
          .map((ev) => {
            const title = ev.text!.replace(/\s+\(.*?\)$/, '');
            const page = Array.isArray(ev.pages) ? ev.pages[0] : null;
            const pageUrl =
              page?.content_urls?.desktop?.page ||
              page?.content_urls?.mobile?.page ||
              this.searchUrl(title);
            const thumbnail = page?.thumbnail?.source || page?.originalimage?.source;
            return { year: ev.year, title, url: pageUrl, thumbnail } as EventItem;
          });
        const seen = new Set<string>();
        const uniq: EventItem[] = [];
        for (const ev of candidates) {
          if (seen.has(ev.title)) continue;
          seen.add(ev.title);
          uniq.push(ev);
        }
        const chosen = this.shuffle(uniq).slice(0, 10);
        if (chosen.length >= 5) return chosen;
        throw { message: 'Not enough events from Wikipedia.', url };
      } catch (err) {
        lastError = err as LoadError;
      }
    }
    throw lastError || { message: 'Failed to load events.' };
  }

  private searchUrl(title: string) {
    return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(title)}`;
  }

  private shuffle(list: EventItem[]) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
