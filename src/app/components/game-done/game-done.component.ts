import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-game-done',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-done.component.html',
  styleUrls: ['./game-done.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  @Output() resetGame = new EventEmitter<void>();
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

  trackByEntry(_index: number, entry: { finishedAt: string; score: number }) {
    return `${entry.finishedAt}-${entry.score}`;
  }
}
