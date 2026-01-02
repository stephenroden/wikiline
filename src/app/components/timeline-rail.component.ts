import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import type { EventItem } from '../models';

@Component({
  selector: 'timeline-rail',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  styleUrls: ['./timeline-rail.component.scss'],
  template: `
    <aside class="year-rail">
      <div
        class="year-rail-inner"
        cdkDropList
        #railList="cdkDropList"
        id="railList"
        [cdkDropListData]="slots"
        [cdkDropListConnectedTo]="connections"
        [cdkDropListEnterPredicate]="canEnter"
        (cdkDropListDropped)="dropOnTimeline.emit($event)"
        [cdkDropListAutoScrollDisabled]="true"
        cdkDropListSortingDisabled
      >
        <div class="rail-line"></div>
        <div
          class="rail-insert-line"
          *ngIf="railHoverIndex !== null"
          [style.top.%]="railInsertOffset()"
        ></div>
        <div
          class="year-mark"
          *ngFor="let slot of slots; let i = index"
          [style.top.%]="markOffset(i)"
        >
          <span class="year-dot"></span>
          <span class="year-text">{{ slot.year }}</span>
        </div>
      </div>
    </aside>
  `,
})
export class TimelineRailComponent {
  @Input({ required: true }) slots: EventItem[] = [];
  @Input({ required: true }) connections: CdkDropList[] = [];
  @Input({ required: true }) canEnter: (..._args: unknown[]) => boolean = () => true;
  @Input({ required: true }) railHoverIndex: number | null = null;
  @Output() dropOnTimeline = new EventEmitter<CdkDragDrop<EventItem[]>>();
  @ViewChild('railList', { read: ElementRef }) railListEl?: ElementRef<HTMLElement>;
  @ViewChild('railList', { read: CdkDropList }) dropList?: CdkDropList;

  railInsertOffset() {
    const count = this.slots.length;
    const index = this.railHoverIndex;
    if (index === null || !count) return 50;
    return ((index + 0.5) / (count + 1)) * 100;
  }

  markOffset(index: number) {
    const count = this.slots.length;
    if (!count) return 50;
    return ((index + 1) / (count + 1)) * 100;
  }
}
