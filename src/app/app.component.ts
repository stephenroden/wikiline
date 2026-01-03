import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray, CdkDropList } from '@angular/cdk/drag-drop';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { GameDoneComponent } from './components/game-done/game-done.component';
import { IntroPanelComponent } from './components/intro-panel/intro-panel.component';
import { TimelineListComponent } from './components/timeline-list/timeline-list.component';
import { TimelineRailComponent } from './components/timeline-rail/timeline-rail.component';
import type { EventItem } from './models';
import { GameStore } from './state/game.store';
import { TimelineUiService } from './services/timeline-ui.service';

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
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('appHeader', { static: true }) appHeader?: AppHeaderComponent;
  @ViewChild('handList') handList?: CdkDropList;
  @ViewChild('timelineList') timelineList?: TimelineListComponent;
  @ViewChild('railList') railList?: TimelineRailComponent;
  @ViewChild('currentCard', { read: ElementRef }) currentCardEl?: ElementRef<HTMLElement>;

  demoHand = signal<{ x: number; y: number } | null>(null);
  demoCardTransform = signal<string | null>(null);
  handConnections = signal<CdkDropList[]>([]);
  timelineConnections = signal<CdkDropList[]>([]);
  railConnections = signal<CdkDropList[]>([]);
  railHoverIndex = signal<number | null>(null);
  timelineInsertIndex = signal<number | null>(null);
  insertHeight = signal(0);
  insertTopPx = signal<number | null>(null);

  private demoTimers: number[] = [];
  private lastInsertIndex: number | null = null;
  private demoSpeed = 2;
  private headerObserver?: ResizeObserver;
  private lastHeaderHeight = 0;

  constructor(
    readonly store: GameStore,
    private cdr: ChangeDetectorRef,
    private uiService: TimelineUiService,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnInit(): void {
    this.store.init();
  }

  ngAfterViewInit(): void {
    const header = this.appHeader?.headerEl?.nativeElement;
    if (!header || typeof ResizeObserver === 'undefined') return;
    this.headerObserver = new ResizeObserver(() => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      if (height === this.lastHeaderHeight) return;
      this.lastHeaderHeight = height;
      window.requestAnimationFrame(() => {
        this.document.documentElement.style.setProperty('--header-height', `${height}px`);
      });
    });
    this.headerObserver.observe(header);
    this.syncDropConnections();
  }

  ngOnDestroy(): void {
    this.headerObserver?.disconnect();
    this.clearDemoTimers();
    this.store.dispose();
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

  async startGame() {
    this.endDemo();
    await this.store.startGame();
    this.runDemoSequence();
  }

  async startDemo() {
    await this.store.startDemo();
    this.runDemoSequence();
  }

  endDemo() {
    this.store.endDemoState();
    this.clearDemoTimers();
    this.demoHand.set(null);
    this.demoCardTransform.set(null);
  }

  async reset() {
    this.endDemo();
    await this.store.reset();
  }

  canEnter = () => true;

  viewTimeline() {
    this.store.showCompletion.set(false);
    window.requestAnimationFrame(() => {
      const board = this.timelineList?.boardEl?.nativeElement || this.timelineList?.listEl?.nativeElement;
      board?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  dropOnTimeline(event: CdkDragDrop<EventItem[]>) {
    if (event.previousContainer === event.container) {
      const updated = [...this.store.slots()];
      moveItemInArray(updated, event.previousIndex, event.currentIndex);
      this.store.setSlots(updated);
      this.clearRailHover();
      this.clearTimelineHover();
      return;
    }
    const hoverIndex = this.railHoverIndex();
    const timelineHover = this.timelineInsertIndex();
    const insertAt =
      event.container.id === 'railList'
        ? hoverIndex ?? event.currentIndex
        : timelineHover ?? event.currentIndex;
    const dragged = (event.item.data as EventItem) || this.store.current();
    this.store.dropAt(dragged, insertAt);
    this.clearRailHover();
    this.clearTimelineHover();
  }

  private runDemoSequence() {
    if (!this.store.demoMode()) return;
    this.clearDemoTimers();
    const maxMoves = 3;
    const runStep = (step: number) => {
      if (!this.store.demoMode()) return;
      const active = this.store.current();
      if (!active) {
        this.endDemo();
        return;
      }
      if (step === 0) {
        this.store.notifyDemoStart();
      }
      const insertIdx = this.findInsertIndex(active);
      const dragDuration = this.showGhostDrag(active, insertIdx);
      this.queueDemoStep(() => {
        if (!this.store.demoMode()) return;
        this.store.dropAt(active, insertIdx);
      }, dragDuration);
      const stepDelay = Math.round(1200 * this.demoSpeed);
      if (step + 1 < maxMoves && this.store.current()) {
        this.queueDemoStep(() => runStep(step + 1), dragDuration + stepDelay);
      } else {
        this.queueDemoStep(() => this.endDemo(), dragDuration + stepDelay);
      }
    };
    this.queueDemoStep(() => runStep(0), Math.round(900 * this.demoSpeed));
  }

  private showGhostDrag(item: EventItem, insertIdx: number) {
    if (!this.store.demoMode()) return 0;
    const cardEl = this.currentCardEl?.nativeElement || null;
    if (!cardEl) return 0;
    this.uiService.ensureInsertVisible(
      this.timelineList?.listEl?.nativeElement || null,
      this.timelineList?.cardEls?.toArray() || [],
      insertIdx,
    );
    const fromRect = cardEl.getBoundingClientRect();
    const target = this.uiService.getDemoTargetPoint(
      this.timelineList?.listEl?.nativeElement || null,
      this.timelineList?.cardEls?.toArray() || [],
      insertIdx,
      fromRect,
    );
    if (!target) return 0;
    const height = Math.ceil(fromRect.height);
    this.insertHeight.set(height);
    const insertTop = this.uiService.getInsertTopPx(
      this.timelineList?.listEl?.nativeElement || null,
      this.timelineList?.cardEls?.toArray() || [],
      insertIdx,
      height,
    );
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

  private findInsertIndex(item: EventItem) {
    const slots = this.store.slots();
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

  onDragMoved(event: { pointerPosition: { x: number; y: number } }) {
    this.updateInsertHeight();
    const rail = this.railList?.railListEl?.nativeElement;
    const count = this.store.slots().length;
    const railIndex = this.uiService.getRailHoverIndex(event.pointerPosition, rail || null, count);
    this.railHoverIndex.set(railIndex);
    this.updateTimelineHover(event.pointerPosition);
  }

  clearRailHover() {
    this.railHoverIndex.set(null);
  }

  private updateTimelineHover(pointer: { x: number; y: number }) {
    const hover = this.uiService.getTimelineHover(
      pointer,
      this.timelineList?.listEl?.nativeElement || null,
      this.timelineList?.cardEls?.toArray() || [],
      this.insertHeight(),
    );
    if (!hover) {
      this.timelineInsertIndex.set(null);
      this.insertTopPx.set(null);
      this.lastInsertIndex = null;
      return;
    }
    this.timelineInsertIndex.set(hover.index);
    this.insertTopPx.set(hover.topPx);
    this.lastInsertIndex = hover.index;
  }

  private clearTimelineHover() {
    this.timelineInsertIndex.set(null);
    this.insertTopPx.set(null);
    this.lastInsertIndex = null;
  }

  private updateInsertHeight() {
    const height = this.uiService.getInsertHeightFromCard(this.currentCardEl?.nativeElement || null);
    if (height && height !== this.insertHeight()) {
      this.insertHeight.set(height);
    }
  }
}
