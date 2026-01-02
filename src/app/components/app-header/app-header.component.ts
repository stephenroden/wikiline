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

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  @ViewChild('header', { static: true }) headerEl?: ElementRef<HTMLElement>;
  @Input({ required: true }) showIntro = true;
  @Input() elapsedLabel = '';
  @Output() resetGame = new EventEmitter<void>();
}
