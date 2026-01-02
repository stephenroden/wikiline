import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./app-header.component.scss'],
  template: `
    <header class="header" #header>
      <div class="brand">
        <img class="brand-logo" src="assets/icons/icon-72x72.png" alt="Wikiline logo" />
        <h1>Wikiline</h1>
      </div>
      <div class="score-card" *ngIf="!showIntro">
        <button class="ghost" (click)="reset.emit()">New</button>
        <div class="timer" *ngIf="elapsedLabel">
          <span class="muted">Time</span>
          <strong>{{ elapsedLabel }}</strong>
        </div>
      </div>
    </header>
  `,
})
export class AppHeaderComponent {
  @ViewChild('header', { static: true }) headerEl?: ElementRef<HTMLElement>;
  @Input({ required: true }) showIntro = true;
  @Input() elapsedLabel = '';
  @Output() reset = new EventEmitter<void>();
}
