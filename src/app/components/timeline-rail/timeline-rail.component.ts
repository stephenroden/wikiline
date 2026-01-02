import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import type { EventItem } from '../../models';

@Component({
  selector: 'app-timeline-rail',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './timeline-rail.component.html',
  styleUrls: ['./timeline-rail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineRailComponent {
  @Input({ required: true }) slots: EventItem[] = [];
  @Input({ required: true }) connections: CdkDropList[] = [];
  @Input({ required: true }) canEnter: (..._args: unknown[]) => boolean = () => true;
  @Input({ required: true }) railHoverIndex: number | null = null;
  @Output() dropOnTimeline = new EventEmitter<CdkDragDrop<EventItem[]>>();
  @ViewChild('railList', { read: ElementRef }) railListEl?: ElementRef<HTMLElement>;
  @ViewChild('railList', { read: CdkDropList }) dropList?: CdkDropList;

  trackBySlot(_index: number, slot: EventItem) {
    return `${slot.year}-${slot.title}`;
  }

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
