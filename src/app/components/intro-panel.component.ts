import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { LoadError } from '../models';

@Component({
  selector: 'intro-panel',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./intro-panel.component.scss'],
  template: `
    <section class="splash">
      <div class="splash-card">
        <h2>How to play</h2>
        <p class="muted">
          Place events in chronological order. One event starts revealed; drag the next into the correct slot.
          You can drop onto the timeline rail or directly into the card list.
          If the target spot is off-screen, scroll the card list until it’s visible.
        </p>
        <p class="muted">
          Events are sourced from Wikipedia and may be inaccurate, incomplete, or offensive.
        </p>
        <div class="muted" *ngIf="loadError">
          Could not load events. {{ loadError.message }}
          <span *ngIf="loadError.status">Status: {{ loadError.status }} {{ loadError.statusText }}</span>
          <span *ngIf="loadError.url">URL: {{ loadError.url }}</span>
        </div>
        <div class="actions">
          <button class="primary" (click)="startGame.emit()">Start game</button>
          <button class="ghost" (click)="startDemo.emit()">Start demo</button>
        </div>
      </div>
    </section>
  `,
})
export class IntroPanelComponent {
  @Input() loadError: LoadError | null = null;
  @Output() startGame = new EventEmitter<void>();
  @Output() startDemo = new EventEmitter<void>();
}
