import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'game-done',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./game-done.component.scss'],
  template: `
    <ng-container *ngIf="loading; else doneState">
      <div class="done">
        <div class="done-title">Researching fresh events…</div>
        <div class="done-score">Just a moment while we load today’s timeline.</div>
      </div>
    </ng-container>
    <ng-template #doneState>
      <div class="done-overlay" *ngIf="showCompletion; else viewOnlyBlock">
        <div class="done">
          <div class="done-title">Congrats! Timeline complete.</div>
          <div class="done-score">Final score: {{ score }}</div>
          <div class="done-summary">
            <div class="summary-item dots-row">
              <span>Placements</span>
              <div class="dots">
                <span
                  *ngFor="let dot of placementDots"
                  class="dot"
                  [class.good]="dot"
                  [class.bad]="!dot"
                ></span>
              </div>
            </div>
            <div class="summary-item"><span>Time</span><strong>{{ formatElapsed(elapsedMs) }}</strong></div>
            <div class="summary-item"><span>Best streak</span><strong>{{ bestStreak }}</strong></div>
            <div class="summary-item"><span>Scoring</span><strong>Base + streak bonus + time bonus</strong></div>
          </div>
          <div class="leaderboard" *ngIf="scoreboard.length">
            <div class="leaderboard-title">
              Leaderboard
              <button class="ghost" (click)="clearScores.emit()">Reset</button>
            </div>
            <ol>
              <li *ngFor="let entry of scoreboard">
                <div class="leaderboard-dots">
                  <span
                    *ngFor="let dot of placementDotsFor(entry)"
                    class="dot"
                    [class.good]="dot"
                    [class.bad]="!dot"
                  ></span>
                </div>
                <span class="leaderboard-score">{{ entry.score }}</span>
                <span class="leaderboard-time">{{ formatElapsed(entry.elapsedMs) }}</span>
              </li>
            </ol>
          </div>
          <div class="done-actions">
            <button class="ghost" (click)="viewTimeline.emit()">View timeline</button>
            <button class="primary" (click)="reset.emit()">Start new game</button>
          </div>
        </div>
      </div>
    </ng-template>
    <ng-template #viewOnlyBlock>
      <div class="done view-only">
        <div class="done-title">Timeline complete.</div>
        <div class="done-score">Final score: {{ score }}</div>
        <button class="ghost" (click)="reset.emit()">Start new game</button>
      </div>
    </ng-template>
  `,
})
export class GameDoneComponent {
  @Input({ required: true }) loading = false;
  @Input({ required: true }) showCompletion = false;
  @Input({ required: true }) correct = 0;
  @Input({ required: true }) attempts = 0;
  @Input({ required: true }) score = 0;
  @Input({ required: true }) bestStreak = 0;
  @Input({ required: true }) elapsedMs = 0;
  @Input({ required: true }) scoreboard: Array<{
    score: number;
    elapsedMs: number;
    correct: number;
    attempts: number;
    bestStreak: number;
    finishedAt: string;
  }> = [];
  @Output() viewTimeline = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() clearScores = new EventEmitter<void>();

  get placementDots() {
    return this.placementDotsFor({
      correct: this.correct,
      attempts: this.attempts,
    });
  }

  placementDotsFor(entry: { correct: number; attempts: number }) {
    const total = 9;
    const correct = Math.max(0, Math.min(total, entry.correct));
    const incorrect = Math.max(0, Math.min(total - correct, entry.attempts - entry.correct));
    return [
      ...Array.from({ length: correct }, () => true),
      ...Array.from({ length: incorrect }, () => false),
      ...Array.from({ length: total - correct - incorrect }, () => false),
    ];
  }

  formatElapsed(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
