import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { LoadError } from '../../models';

@Component({
  selector: 'app-intro-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro-panel.component.html',
  styleUrls: ['./intro-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroPanelComponent {
  @Input() loadError: LoadError | null = null;
  @Output() startGame = new EventEmitter<void>();
  @Output() startDemo = new EventEmitter<void>();
}
