import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import type { EventItem } from '../models';

@Component({
  selector: 'timeline-list',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  styleUrls: ['./timeline-list.component.scss'],
  template: `
    <section class="board">
      <div
        class="slots"
        cdkDropList
        #timelineList="cdkDropList"
        id="timelineList"
        [cdkDropListData]="slots"
        [cdkDropListConnectedTo]="connections"
        [cdkDropListEnterPredicate]="canEnter"
        (cdkDropListDropped)="dropOnTimeline.emit($event)"
        [cdkDropListAutoScrollDisabled]="false"
      >
        <div
          class="timeline-insert-line"
          *ngIf="insertTopPx !== null && insertHeight"
          [style.top.px]="insertTopPx"
          [style.height.px]="insertHeight"
        ></div>
        <div
          class="timeline-card"
          *ngFor="let slot of slots; let i = index"
          [class.corrected]="isCorrected(slot)"
          [class.clickable]="slot.url"
          [attr.role]="slot.url ? 'link' : null"
          [attr.tabindex]="slot.url ? 0 : null"
          (click)="openLink(slot)"
          (keydown.enter)="openLink(slot)"
          #timelineCard
          cdkDrag
          [cdkDragDisabled]="true"
        >
          <div class="year">{{ slot.year }}</div>
          <div class="title">
            <img *ngIf="slot.thumbnail" class="thumb" [src]="slot.thumbnail" [alt]="slot.title" loading="lazy" />
            <div class="title-text">
              <div class="title-main">{{ slot.title }}</div>
              <div class="misplaced-note" *ngIf="isCorrected(slot) && incorrectMessage(slot)">
                {{ incorrectMessage(slot) }}
              </div>
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
  `,
})
export class TimelineListComponent {
  @ViewChild('timelineList', { read: CdkDropList }) dropList?: CdkDropList;
  @ViewChild('timelineList', { read: ElementRef }) listEl?: ElementRef<HTMLElement>;
  @ViewChildren('timelineCard', { read: ElementRef }) cardEls?: QueryList<ElementRef<HTMLElement>>;
  @Input({ required: true }) slots: EventItem[] = [];
  @Input({ required: true }) connections: CdkDropList[] = [];
  @Input({ required: true }) canEnter: (..._args: unknown[]) => boolean = () => true;
  @Input({ required: true }) isCorrected: (item: EventItem) => boolean = () => false;
  @Input({ required: true }) incorrectMessage: (item: EventItem) => string | null = () => null;
  @Input({ required: true }) insertIndex: number | null = null;
  @Input({ required: true }) insertTopPx: number | null = null;
  @Input({ required: true }) insertHeight = 0;
  @Output() dropOnTimeline = new EventEmitter<CdkDragDrop<EventItem[]>>();

  openLink(slot: EventItem) {
    if (!slot.url) return;
    window.open(slot.url, '_blank', 'noopener');
  }
}
