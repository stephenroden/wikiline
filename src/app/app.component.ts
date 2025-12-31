import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, computed, signal, ViewChild } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray, CdkDropList } from '@angular/cdk/drag-drop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

type EventItem = { title: string; year: number; url?: string; thumbnail?: string };
type LoadError = { message: string; status?: number; statusText?: string; url?: string };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DragDropModule, MatSnackBarModule],
  template: `
    <div class="page" cdkDropListGroup>
      <header class="header" #appHeader>
        <div>
          <h1>Wikiline</h1>
        </div>
        <div class="score-card" *ngIf="!showIntro()">
          <div class="score">{{ correct() }} / {{ attempts() }} correct</div>
          <button class="ghost" (click)="reset()">Reset</button>
        </div>
      </header>

      <section class="splash" *ngIf="showIntro()">
        <div class="splash-card">
          <h2>How to play</h2>
          <p class="muted">
            Place events in chronological order. One event starts revealed; drag the next into the correct slot.
          </p>
          <div class="muted" *ngIf="loadError()">
            Could not load events. {{ loadError()?.message }}
            <span *ngIf="loadError()?.status">Status: {{ loadError()?.status }} {{ loadError()?.statusText }}</span>
            <span *ngIf="loadError()?.url">URL: {{ loadError()?.url }}</span>
          </div>
          <button class="primary" (click)="startGame()">Start game</button>
        </div>
      </section>

      <div class="game" *ngIf="!showIntro()">
        <aside class="year-rail">
          <div
            class="year-rail-inner"
            cdkDropList
            #railList="cdkDropList"
            id="railList"
            [cdkDropListData]="slots()"
            [cdkDropListConnectedTo]="railConnections()"
            [cdkDropListEnterPredicate]="canEnter"
            (cdkDropListDropped)="dropOnTimeline($event)"
            cdkDropListSortingDisabled
          >
            <div class="rail-line"></div>
            <div
              class="rail-insert-line"
              *ngIf="railHoverIndex() !== null"
              [style.top.%]="railInsertOffset()"
            ></div>
            <div
              class="year-mark"
              *ngFor="let slot of slots(); let i = index"
              [style.top.%]="markOffset(i)"
              cdkDrag
              [cdkDragDisabled]="true"
            >
              <span class="year-dot"></span>
              <span class="year-text">{{ slot.year }}</span>
            </div>
          </div>
        </aside>

        <div class="game-main">
          <section class="next-card" *ngIf="current(); else doneBlock">
            <div class="muted" *ngIf="loading()">Loading fresh events from Wikipedia…</div>
            <div
              cdkDropList
              #handList="cdkDropList"
              id="handList"
              class="hand"
              [cdkDropListData]="[current()]"
              [cdkDropListConnectedTo]="handConnections()"
            >
              <div
                class="card current-card"
                cdkDrag
                [cdkDragData]="current()"
                (cdkDragMoved)="onDragMoved($event)"
              >
                <div class="card-title">{{ current()?.title }}</div>
              </div>
            </div>
          </section>
          <ng-template #doneBlock>
            <div class="done" *ngIf="loading(); else completionBlock">
              <div class="done-title">Researching fresh events…</div>
              <div class="done-score">Just a moment while we load today’s timeline.</div>
            </div>
            <ng-template #completionBlock>
              <div class="done" *ngIf="showCompletion(); else viewOnlyBlock">
                <div class="done-title">Congrats! Timeline complete.</div>
                <div class="done-score">Score: {{ correct() }} / {{ attempts() }} correct</div>
                <div class="done-actions">
                  <button class="ghost" (click)="viewTimeline()">View timeline</button>
                  <button class="primary" (click)="reset()">Start new game</button>
                </div>
              </div>
            </ng-template>
          </ng-template>
          <ng-template #viewOnlyBlock>
            <div class="done view-only">
              <div class="done-title">Timeline complete.</div>
              <div class="done-score">Score: {{ correct() }} / {{ attempts() }} correct</div>
              <button class="ghost" (click)="reset()">Start new game</button>
            </div>
          </ng-template>

          <section class="board">
            <div
              class="slots"
              cdkDropList
              #timelineList="cdkDropList"
              id="timelineList"
              [cdkDropListData]="slots()"
              [cdkDropListConnectedTo]="timelineConnections()"
              [cdkDropListEnterPredicate]="canEnter"
              (cdkDropListDropped)="dropOnTimeline($event)"
            >
                <div
                  class="timeline-card"
                  *ngFor="let slot of slots(); let i = index"
                  [class.corrected]="isCorrected(slot)"
                  cdkDrag
                  [cdkDragDisabled]="true"
                >
                  <div class="year">{{ slot.year }}</div>
                  <div class="title">
                    <img *ngIf="slot.thumbnail" class="thumb" [src]="slot.thumbnail" [alt]="slot.title" loading="lazy" />
                    <div class="title-text">
                      <div class="title-main">{{ slot.title }}</div>
                      <a
                        *ngIf="slot.url"
                        class="title-link muted"
                        [href]="slot.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ slot.url }}
                      </a>
                    </div>
                  </div>
                </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('appHeader', { static: true }) appHeader?: ElementRef<HTMLElement>;
  @ViewChild('handList') handList?: CdkDropList;
  @ViewChild('timelineList') timelineList?: CdkDropList;
  @ViewChild('railList') railList?: CdkDropList;
  @ViewChild('railList', { read: ElementRef }) railListEl?: ElementRef<HTMLElement>;
  private deck = signal<EventItem[]>([]);
  slots = signal<EventItem[]>([]);
  current = signal<EventItem | null>(null);
  correct = signal(0);
  attempts = signal(0);
  loading = signal(false);
  allEvents = signal<EventItem[]>([]);
  incorrectKeys = signal<string[]>([]);
  showIntro = signal(true);
  showCompletion = signal(true);
  loadError = signal<LoadError | null>(null);
  handConnections = signal<CdkDropList[]>([]);
  timelineConnections = signal<CdkDropList[]>([]);
  railConnections = signal<CdkDropList[]>([]);
  railHoverIndex = signal<number | null>(null);
  private headerObserver?: ResizeObserver;
  private lastHeaderHeight = 0;

  constructor(
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  ngAfterViewInit(): void {
    const header = this.appHeader?.nativeElement;
    if (!header || typeof ResizeObserver === 'undefined') return;
    this.headerObserver = new ResizeObserver(() => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      if (height === this.lastHeaderHeight) return;
      this.lastHeaderHeight = height;
      window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      });
    });
    this.headerObserver.observe(header);
    this.syncDropConnections();
  }

  ngOnDestroy(): void {
    this.headerObserver?.disconnect();
  }

  private syncDropConnections() {
    const hand = this.handList;
    const timeline = this.timelineList;
    const rail = this.railList;
    this.handConnections.set(timeline && rail ? [timeline, rail] : timeline ? [timeline] : []);
    this.timelineConnections.set(hand ? [hand] : []);
    this.railConnections.set(hand ? [hand] : []);
    this.cdr.detectChanges();
  }

  startGame() {
    if (this.loadError()) {
      this.loadEvents();
    }
    this.showIntro.set(false);
  }

  reset() {
    const base = this.allEvents();
    const shuffled = this.shuffle([...base]);
    const first = shuffled.shift();
    if (!first) return;
    this.slots.set([first]);
    this.current.set(shuffled.shift() || null);
    this.deck.set(shuffled);
    this.correct.set(0);
    this.attempts.set(0);
    this.clearFeedback();
    this.showCompletion.set(false);
  }

  canEnter = () => true;

  dropAt(event: CdkDragDrop<any>, position: number) {
    const dragged: EventItem | null = (event.item.data as EventItem) || this.current();
    if (!dragged || !this.current()) return;
    // insert at position
    const updated = [...this.slots()];
    updated.splice(position, 0, dragged);
    const sorted = updated.every((item, i) => i === 0 || updated[i - 1].year <= item.year);
    this.attempts.update((a) => a + 1);
    if (sorted) {
      this.correct.update((c) => c + 1);
      this.showToast('Nice! Placed correctly.', 'success');
    } else {
      // place correctly
      const corrected = [...this.slots()];
      const idx = corrected.findIndex((ev) => ev.year > dragged.year);
      const insertIdx = idx === -1 ? corrected.length : idx;
      corrected.splice(insertIdx, 0, dragged);
      updated.splice(0, updated.length, ...corrected);
      this.markIncorrect(dragged);
      this.showToast('Not quite. Moved to the correct position.', 'warn');
    }
    this.slots.set(updated);
    this.current.set(this.deck().shift() || null);
    if (!this.current()) {
      this.showCompletion.set(true);
    }
  }

  viewTimeline() {
    this.showCompletion.set(false);
    window.requestAnimationFrame(() => {
      const board = document.querySelector('.board');
      board?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  dropOnTimeline(event: CdkDragDrop<EventItem[]>) {
    if (event.previousContainer === event.container) {
      const updated = [...this.slots()];
      moveItemInArray(updated, event.previousIndex, event.currentIndex);
      this.slots.set(updated);
      this.clearRailHover();
      return;
    }
    const hoverIndex = this.railHoverIndex();
    const insertAt = event.container.id === 'railList' && hoverIndex !== null ? hoverIndex : event.currentIndex;
    this.dropAt(event as unknown as CdkDragDrop<any>, insertAt);
    this.clearRailHover();
  }

  private async loadEvents() {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const events = await this.fetchEventsWithRetry(2);
      this.allEvents.set(events);
      this.reset();
    } catch (err) {
      const info = err as LoadError;
      this.loadError.set({
        message: info.message || 'Failed to load events.',
        status: info.status,
        statusText: info.statusText,
        url: info.url,
      });
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchEventsWithRetry(maxAttempts: number) {
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
        const data = await res.json();
        const candidates = (data.events || [])
          .filter((ev: any) => ev.year && ev.text)
          .map((ev: any) => {
            const title = (ev.text as string).replace(/\s+\(.*?\)$/, '');
            const page = Array.isArray(ev.pages) ? ev.pages[0] : null;
            const pageUrl =
              page?.content_urls?.desktop?.page ||
              page?.content_urls?.mobile?.page ||
              this.searchUrl(title);
            const thumbnail = page?.thumbnail?.source || page?.originalimage?.source;
            return { year: ev.year, title, url: pageUrl, thumbnail };
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

  private searchUrl(title: string) {
    return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(title)}`;
  }

  isCorrected(item: EventItem) {
    return this.incorrectKeys().includes(this.keyFor(item));
  }

  markOffset(index: number) {
    const count = this.slots().length;
    if (!count) return 50;
    return ((index + 1) / (count + 1)) * 100;
  }

  railInsertOffset() {
    const count = this.slots().length;
    const index = this.railHoverIndex();
    if (index === null || !count) return 50;
    return ((index + 0.5) / (count + 1)) * 100;
  }

  onDragMoved(event: { pointerPosition: { x: number; y: number } }) {
    const rail = this.railListEl?.nativeElement;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const { x, y } = event.pointerPosition;
    const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (!inside) {
      this.railHoverIndex.set(null);
      return;
    }
    const count = this.slots().length;
    const ratio = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
    const index = Math.min(count, Math.max(0, Math.floor(ratio * (count + 1))));
    this.railHoverIndex.set(index);
  }

  clearRailHover() {
    this.railHoverIndex.set(null);
  }

  private showToast(message: string, type: 'warn' | 'success' = 'warn') {
    this.snackBar.open(message, 'Dismiss', {
      duration: 2400,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [type === 'warn' ? 'snackbar-warn' : 'snackbar-success'],
    });
  }

  private clearFeedback() {
    this.incorrectKeys.set([]);
  }

  private markIncorrect(item: EventItem) {
    const key = this.keyFor(item);
    this.incorrectKeys.update((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }
}
