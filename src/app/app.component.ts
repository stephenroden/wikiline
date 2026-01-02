import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray, CdkDropList } from '@angular/cdk/drag-drop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppHeaderComponent } from './components/app-header.component';
import { GameDoneComponent } from './components/game-done.component';
import { IntroPanelComponent } from './components/intro-panel.component';
import { TimelineListComponent } from './components/timeline-list.component';
import { TimelineRailComponent } from './components/timeline-rail.component';
import type { EventItem, LoadError } from './models';

type ScoreEntry = {
  score: number;
  elapsedMs: number;
  correct: number;
  attempts: number;
  bestStreak: number;
  finishedAt: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    MatSnackBarModule,
    AppHeaderComponent,
    IntroPanelComponent,
    GameDoneComponent,
    TimelineRailComponent,
    TimelineListComponent,
  ],
  template: `
      <div class="page" cdkDropListGroup>
      <app-header
        #appHeader
        [showIntro]="showIntroOverlay()"
        [elapsedLabel]="elapsedLabel()"
        (reset)="reset()"
      ></app-header>

      <intro-panel
        *ngIf="showIntroOverlay()"
        [loadError]="loadError()"
        (startGame)="startGame()"
        (startDemo)="startDemo()"
        class="intro-overlay"
      ></intro-panel>

      <div class="loading-overlay" *ngIf="loading()">
        <div class="loading-card">
          <div class="loading-title">Loading events</div>
          <div class="muted">Fetching fresh timelines from Wikipedia…</div>
        </div>
      </div>

      <div class="game" *ngIf="hasStarted()">
          <timeline-rail
            #railList
            [slots]="slots()"
            [connections]="railConnections()"
            [canEnter]="canEnter"
            [railHoverIndex]="railHoverIndex()"
            (dropOnTimeline)="dropOnTimeline($event)"
          ></timeline-rail>

        <div class="game-main">
          <div class="demo-banner" *ngIf="demoMode()">
            <div>
              <strong>Demo mode</strong> — we will drag a few cards into place so you can see how it works.
            </div>
            <button class="ghost" (click)="endDemo()">End</button>
          </div>
          <section class="next-card" *ngIf="current(); else doneBlock">
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
                  [style.transform]="demoCardTransform()"
                  [class.demo-dragging]="demoMode() && demoCardTransform()"
                >
                <div class="card-meta">
                  <span class="muted">Next event</span>
                </div>
                <div class="card-title">{{ current()?.title }}</div>
              </div>
            </div>
          </section>
          <ng-template #doneBlock>
          <game-done
            [loading]="loading()"
            [showCompletion]="showCompletion()"
            [correct]="correct()"
            [attempts]="attempts()"
            [score]="score()"
            [bestStreak]="bestStreak()"
            [elapsedMs]="elapsedMs()"
            [scoreboard]="scoreboard()"
            (clearScores)="clearScoreboard()"
            (viewTimeline)="viewTimeline()"
            (reset)="reset()"
          ></game-done>
          </ng-template>

          <timeline-list
            #timelineList
            [slots]="slots()"
            [connections]="timelineConnections()"
            [canEnter]="canEnter"
            [isCorrected]="isCorrected.bind(this)"
            [incorrectMessage]="incorrectMessage.bind(this)"
            [insertIndex]="timelineInsertIndex()"
            [insertHeight]="insertHeight()"
            [insertTopPx]="insertTopPx()"
            (dropOnTimeline)="dropOnTimeline($event)"
          ></timeline-list>
        </div>
      </div>
      <div class="demo-hand" *ngIf="demoHand() as hand" [style.left.px]="hand.x" [style.top.px]="hand.y"></div>
    </div>
  `,
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('appHeader', { static: true }) appHeader?: AppHeaderComponent;
  @ViewChild('handList') handList?: CdkDropList;
  @ViewChild('timelineList') timelineList?: TimelineListComponent;
  @ViewChild('railList') railList?: TimelineRailComponent;
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
  demoHand = signal<{ x: number; y: number } | null>(null);
  demoCardTransform = signal<string | null>(null);
  private cardStart = 0;
  private startRequested = false;
  private demoTimers: number[] = [];
  private demoSpeed = 2;
  private roundStartMs = 0;
  private timerId: number | null = null;
  handConnections = signal<CdkDropList[]>([]);
  timelineConnections = signal<CdkDropList[]>([]);
  railConnections = signal<CdkDropList[]>([]);
  railHoverIndex = signal<number | null>(null);
  timelineInsertIndex = signal<number | null>(null);
  insertHeight = signal(0);
  insertTopPx = signal<number | null>(null);
  private headerObserver?: ResizeObserver;
  private lastHeaderHeight = 0;

  constructor(
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadEvents(false);
    this.loadScoreboard();
  }

  ngAfterViewInit(): void {
    const header = this.appHeader?.headerEl?.nativeElement;
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
    this.stopTimer();
  }

  private syncDropConnections() {
    const hand = this.handList;
    const timeline = this.timelineList?.dropList;
    const rail = this.railList?.dropList;
    this.handConnections.set(timeline && rail ? [timeline, rail] : timeline ? [timeline] : []);
    this.timelineConnections.set(hand ? [hand] : []);
    this.railConnections.set(hand ? [hand] : []);
    this.cdr.detectChanges();
  }

  startGame() {
    this.endDemo();
    this.startRequested = true;
    this.showIntroOverlay.set(false);
    if (this.loading()) return;
    if (this.loadError()) {
      this.loadEvents(true);
      return;
    }
    if (this.allEvents().length) {
      this.startRound(this.allEvents());
      this.hasStarted.set(true);
      this.startRequested = false;
      this.runDemoSequence();
      return;
    }
    this.loadEvents(true);
  }

  startDemo() {
    this.demoMode.set(true);
    this.startRequested = true;
    this.showIntroOverlay.set(false);
    if (this.loading()) return;
    if (this.loadError()) {
      this.loadEvents(true);
      return;
    }
    if (this.allEvents().length) {
      this.startRound(this.allEvents());
      this.hasStarted.set(true);
      this.startRequested = false;
      this.runDemoSequence();
      return;
    }
    this.loadEvents(true);
  }

  endDemo() {
    this.demoMode.set(false);
    this.clearDemoTimers();
    this.demoHand.set(null);
    this.demoCardTransform.set(null);
    this.showIntroOverlay.set(true);
  }

  reset() {
    this.endDemo();
    this.showIntroOverlay.set(false);
    this.stopTimer();
    this.loadEvents(true);
  }

  canEnter = () => true;

  dropAt(event: CdkDragDrop<any>, position: number) {
    const dragged: EventItem | null = (event.item.data as EventItem) || this.current();
    if (!dragged || !this.current()) return;
    // insert at position
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
      // place correctly
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
    this.current.set(this.deck().shift() || null);
    this.cardStart = Date.now();
    if (!this.current()) {
      this.showCompletion.set(true);
      this.stopTimer();
      this.saveScoreboardEntry();
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
      this.clearTimelineHover();
      return;
    }
    const hoverIndex = this.railHoverIndex();
    const insertAt = event.container.id === 'railList' && hoverIndex !== null ? hoverIndex : event.currentIndex;
    this.dropAt(event as unknown as CdkDragDrop<any>, insertAt);
    this.clearRailHover();
    this.clearTimelineHover();
  }

  private async loadEvents(autoStart: boolean) {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const events = await this.fetchEventsWithRetry(2);
      this.allEvents.set(events);
      if (autoStart || this.startRequested) {
        this.startRound(events);
        this.hasStarted.set(true);
        this.showIntroOverlay.set(false);
        this.startRequested = false;
        this.runDemoSequence();
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
      this.endDemo();
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

  private startRound(events: EventItem[]) {
    const shuffled = this.shuffle([...events]);
    const first = shuffled.shift();
    if (!first) return;
    this.slots.set([first]);
    this.current.set(shuffled.shift() || null);
    this.deck.set(shuffled);
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

  private runDemoSequence() {
    if (!this.demoMode()) return;
    this.clearDemoTimers();
    const maxMoves = 3;
    const runStep = (step: number) => {
      if (!this.demoMode()) return;
      const active = this.current();
      if (!active) {
        this.endDemo();
        return;
      }
      if (step === 0) {
        this.showToast('Demo: we will drag a few cards into the right spots.', 'success');
      }
      const insertIdx = this.findInsertIndex(active);
      const dragDuration = this.showGhostDrag(active, insertIdx);
      this.queueDemoStep(() => {
        if (!this.demoMode()) return;
        this.dropAt({ item: { data: active } } as unknown as CdkDragDrop<any>, insertIdx);
      }, dragDuration);
      const stepDelay = Math.round(1200 * this.demoSpeed);
      if (step + 1 < maxMoves && this.current()) {
        this.queueDemoStep(() => runStep(step + 1), dragDuration + stepDelay);
      } else {
        this.queueDemoStep(() => this.endDemo(), dragDuration + stepDelay);
      }
    };
    this.queueDemoStep(() => runStep(0), Math.round(900 * this.demoSpeed));
  }

  private showGhostDrag(item: EventItem, insertIdx: number) {
    if (!this.demoMode()) return 0;
    const cardEl = document.querySelector<HTMLElement>('.current-card');
    if (!cardEl) return 0;
    this.ensureInsertVisible(insertIdx);
    const fromRect = cardEl.getBoundingClientRect();
    const target = this.getDemoTargetPoint(insertIdx, fromRect);
    if (!target) return 0;
    const height = Math.ceil(fromRect.height);
    this.insertHeight.set(height);
    const insertTop = this.getInsertTopPx(insertIdx, height);
    if (insertTop !== null) {
      this.timelineInsertIndex.set(insertIdx);
      this.insertTopPx.set(insertTop);
    }
    this.railHoverIndex.set(insertIdx);
    this.demoHand.set({
      x: Math.round(window.innerWidth / 2),
      y: Math.round(window.innerHeight / 2),
    });
    const approachDelay = Math.round(60 * this.demoSpeed);
    const approachDuration = Math.round(1200 * this.demoSpeed);
    const grabDelay = Math.round(220 * this.demoSpeed);
    const dragDuration = Math.round(1200 * this.demoSpeed);
    const clearDelay = approachDelay + approachDuration + grabDelay + dragDuration + Math.round(200 * this.demoSpeed);
    this.queueDemoStep(() => {
      const hand = this.demoHand();
      if (hand) {
        this.demoHand.set({
          x: Math.round(fromRect.left + fromRect.width / 2 - 24),
          y: Math.round(fromRect.top + fromRect.height / 2 - 24),
        });
      }
    }, approachDelay);
    this.queueDemoStep(() => {
      const hand = this.demoHand();
      const dx = Math.round(target.x - fromRect.left);
      const dy = Math.round(target.y - fromRect.top);
      this.demoCardTransform.set(`translate(${dx}px, ${dy}px)`);
      if (hand) {
        this.demoHand.set({
          x: target.x + fromRect.width / 2 - 24,
          y: target.y + fromRect.height / 2 - 24,
        });
      }
    }, approachDelay + approachDuration + grabDelay);
    this.queueDemoStep(() => {
      this.demoHand.set(null);
      this.demoCardTransform.set(null);
      this.clearTimelineHover();
      this.clearRailHover();
    }, clearDelay);
    return clearDelay;
  }

  private ensureInsertVisible(insertIdx: number) {
    const listEl = this.timelineList?.listEl?.nativeElement;
    const cards = this.timelineList?.cardEls?.toArray() || [];
    if (!listEl) return;
    if (!cards.length) {
      listEl.scrollTop = 0;
      return;
    }
    const first = cards[0].nativeElement;
    const last = cards[cards.length - 1].nativeElement;
    const maxScroll = Math.max(0, listEl.scrollHeight - listEl.clientHeight);
    let targetOffset = 0;
    if (insertIdx <= 0) {
      targetOffset = 0;
    } else if (insertIdx >= cards.length) {
      targetOffset = last.offsetTop + last.offsetHeight;
    } else {
      const prev = cards[insertIdx - 1].nativeElement;
      const next = cards[insertIdx].nativeElement;
      targetOffset = (prev.offsetTop + prev.offsetHeight + next.offsetTop) / 2;
    }
    const visibleTop = listEl.scrollTop;
    const visibleBottom = visibleTop + listEl.clientHeight;
    if (targetOffset < visibleTop || targetOffset > visibleBottom) {
      const nextTop = Math.min(maxScroll, Math.max(0, targetOffset - listEl.clientHeight / 2));
      listEl.scrollTop = nextTop;
    }
  }

  private getDemoTargetPoint(insertIdx: number, fromRect: DOMRect) {
    const listEl = this.timelineList?.listEl?.nativeElement;
    if (!listEl) return null;
    const listRect = listEl.getBoundingClientRect();
    const cards = this.timelineList?.cardEls?.toArray() || [];
    const left = cards[0]?.nativeElement.getBoundingClientRect().left ?? listRect.left + 12;
    if (!cards.length) {
      return { x: Math.round(left), y: Math.round(listRect.top + 12) };
    }
    if (insertIdx <= 0) {
      return { x: Math.round(left), y: Math.round(listRect.top + 12) };
    }
    if (insertIdx >= cards.length) {
      const lastRect = cards[cards.length - 1].nativeElement.getBoundingClientRect();
      return { x: Math.round(left), y: Math.round(lastRect.bottom + 8) };
    }
    const prevRect = cards[insertIdx - 1].nativeElement.getBoundingClientRect();
    const nextRect = cards[insertIdx].nativeElement.getBoundingClientRect();
    const bandTop = prevRect.bottom;
    const bandBottom = nextRect.top;
    const center = (bandTop + bandBottom) / 2;
    const y = center - fromRect.height / 2;
    return { x: Math.round(left), y: Math.round(y) };
  }

  private getInsertTopPx(insertIdx: number, height: number) {
    const listEl = this.timelineList?.listEl?.nativeElement;
    if (!listEl) return null;
    const listRect = listEl.getBoundingClientRect();
    const cards = this.timelineList?.cardEls?.toArray() || [];
    if (!cards.length) return 0;
    if (insertIdx <= 0) return 0;
    if (insertIdx >= cards.length) return Math.max(0, listEl.clientHeight - height);
    const prevRect = cards[insertIdx - 1].nativeElement.getBoundingClientRect();
    const nextRect = cards[insertIdx].nativeElement.getBoundingClientRect();
    const bandTop = prevRect.bottom;
    const bandBottom = nextRect.top;
    const center = (bandTop + bandBottom) / 2;
    const unclamped = center - height / 2;
    const maxTop = bandBottom - height;
    const clamped = bandBottom - bandTop < height ? bandTop : Math.min(Math.max(unclamped, bandTop), maxTop);
    return Math.max(0, Math.round(clamped - listRect.top));
  }

  private findInsertIndex(item: EventItem) {
    const slots = this.slots();
    const idx = slots.findIndex((ev) => ev.year > item.year);
    return idx === -1 ? slots.length : idx;
  }

  private queueDemoStep(fn: () => void, delayMs: number) {
    const timer = window.setTimeout(fn, delayMs);
    this.demoTimers.push(timer);
  }

  private clearDemoTimers() {
    this.demoTimers.forEach((timer) => window.clearTimeout(timer));
    this.demoTimers = [];
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
    this.updateInsertHeight();
    const rail = this.railList?.railListEl?.nativeElement;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const { x, y } = event.pointerPosition;
    const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (!inside) {
      this.railHoverIndex.set(null);
      this.updateTimelineHover(event.pointerPosition);
      return;
    }
    const count = this.slots().length;
    const ratio = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
    const index = Math.min(count, Math.max(0, Math.floor(ratio * (count + 1))));
    this.railHoverIndex.set(index);
    this.updateTimelineHover(event.pointerPosition);
  }

  clearRailHover() {
    this.railHoverIndex.set(null);
  }

  private updateTimelineHover(pointer: { x: number; y: number }) {
    const listEl = this.timelineList?.listEl?.nativeElement;
    if (!listEl) return;
    const rect = listEl.getBoundingClientRect();
    const { x, y } = pointer;
    if (x < rect.left || x > rect.right) {
      this.timelineInsertIndex.set(null);
      this.insertTopPx.set(null);
      return;
    }
    const count = this.slots().length;
    if (!count) {
      this.timelineInsertIndex.set(null);
      this.insertTopPx.set(null);
      return;
    }
    if (y <= rect.top) {
      this.timelineInsertIndex.set(0);
      this.insertTopPx.set(0);
      return;
    }
    if (y >= rect.bottom) {
      this.timelineInsertIndex.set(count);
      this.insertTopPx.set(listEl.clientHeight - this.insertHeight());
      return;
    }
    const cards = this.timelineList?.cardEls?.toArray() || [];
    if (!cards.length) {
      this.timelineInsertIndex.set(0);
      this.insertTopPx.set(0);
      return;
    }
    const bands: Array<{ top: number; bottom: number; index: number }> = [];
    const firstRect = cards[0].nativeElement.getBoundingClientRect();
    bands.push({ top: rect.top, bottom: firstRect.top, index: 0 });
    for (let i = 1; i < cards.length; i += 1) {
      const prevRect = cards[i - 1].nativeElement.getBoundingClientRect();
      const nextRect = cards[i].nativeElement.getBoundingClientRect();
      bands.push({ top: prevRect.bottom, bottom: nextRect.top, index: i });
    }
    const lastRect = cards[cards.length - 1].nativeElement.getBoundingClientRect();
    bands.push({ top: lastRect.bottom, bottom: rect.bottom, index: cards.length });
    const listTop = rect.top;
    const height = this.insertHeight();
    for (const band of bands) {
      if (y < band.top || y > band.bottom) continue;
      this.timelineInsertIndex.set(band.index);
      const bandHeight = band.bottom - band.top;
      const center = (band.top + band.bottom) / 2;
      const unclamped = center - height / 2;
      const maxTop = band.bottom - height;
      const clamped = bandHeight < height ? band.top : Math.min(Math.max(unclamped, band.top), maxTop);
      this.insertTopPx.set(Math.max(0, clamped - listTop));
      return;
    }
    this.timelineInsertIndex.set(cards.length);
    this.insertTopPx.set(Math.max(0, rect.bottom - listTop - height));
  }

  private clearTimelineHover() {
    this.timelineInsertIndex.set(null);
    this.insertTopPx.set(null);
  }

  private updateInsertHeight() {
    const card = document.querySelector<HTMLElement>('.current-card');
    if (!card) return;
    const height = Math.ceil(card.getBoundingClientRect().height);
    if (height && height !== this.insertHeight()) {
      this.insertHeight.set(height);
    }
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
    try {
      const raw = window.localStorage.getItem('wikiline-scoreboard');
      if (!raw) return;
      const parsed = JSON.parse(raw) as ScoreEntry[];
      if (Array.isArray(parsed)) {
        this.scoreboard.set(parsed.slice(0, 10));
      }
    } catch {
      this.scoreboard.set([]);
    }
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
    this.scoreboard.set(updated.slice(0, 10));
    try {
      window.localStorage.setItem('wikiline-scoreboard', JSON.stringify(this.scoreboard()));
    } catch {
      // Ignore storage failures in private mode.
    }
  }

  clearScoreboard() {
    this.scoreboard.set([]);
    try {
      window.localStorage.removeItem('wikiline-scoreboard');
    } catch {
      // Ignore storage failures in private mode.
    }
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

  incorrectMessage(item: EventItem) {
    const key = this.keyFor(item);
    return this.incorrectMessages()[key] || null;
  }

  private markIncorrectMessage(item: EventItem, message: string) {
    const key = this.keyFor(item);
    this.incorrectMessages.update((messages) => ({ ...messages, [key]: message }));
  }

  private markIncorrect(item: EventItem) {
    const key = this.keyFor(item);
    this.incorrectKeys.update((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }
}
