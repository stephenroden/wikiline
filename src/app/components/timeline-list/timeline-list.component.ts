import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import type { EventItem } from '../../models';

@Component({
  selector: 'app-timeline-list',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './timeline-list.component.html',
  styleUrls: ['./timeline-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineListComponent {
  @ViewChild('board', { read: ElementRef }) boardEl?: ElementRef<HTMLElement>;
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

  trackBySlot(_index: number, slot: EventItem) {
    return `${slot.year}-${slot.title}`;
  }

  openLink(slot: EventItem) {
    if (!slot.url) return;
    window.open(slot.url, '_blank', 'noopener');
  }
}
