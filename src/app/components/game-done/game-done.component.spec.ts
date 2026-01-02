import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GameDoneComponent } from './game-done.component';

describe('GameDoneComponent', () => {
  let fixture: ComponentFixture<GameDoneComponent>;
  let component: GameDoneComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameDoneComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameDoneComponent);
    component = fixture.componentInstance;
  });

  it('builds placement dots with expected counts', () => {
    const dots = component.placementDotsFor({ correct: 3, attempts: 5 });

    expect(dots.length).toBe(9);
    expect(dots.filter(Boolean).length).toBe(3);
    expect(dots.filter((value) => !value).length).toBe(6);
  });

  it('formats elapsed time as mm:ss', () => {
    expect(component.formatElapsed(61000)).toBe('1:01');
    expect(component.formatElapsed(0)).toBe('0:00');
  });

  it('shows loading state when loading', () => {
    component.loading = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Researching fresh events');
    expect(fixture.nativeElement.querySelector('.done-overlay')).toBeNull();
  });

  it('renders leaderboard and emits actions', () => {
    component.loading = false;
    component.showCompletion = true;
    component.correct = 6;
    component.attempts = 8;
    component.score = 1200;
    component.bestStreak = 4;
    component.elapsedMs = 42000;
    component.scoreboard = [
      {
        score: 1200,
        elapsedMs: 42000,
        correct: 6,
        attempts: 8,
        bestStreak: 4,
        finishedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        score: 1100,
        elapsedMs: 45000,
        correct: 5,
        attempts: 8,
        bestStreak: 3,
        finishedAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    spyOn(component.viewTimeline, 'emit');
    spyOn(component.resetGame, 'emit');
    spyOn(component.clearScores, 'emit');

    fixture.detectChanges();

    const entries = fixture.nativeElement.querySelectorAll('.leaderboard li');
    expect(entries.length).toBe(2);

    const clearButton = fixture.debugElement.query(By.css('.leaderboard button'));
    clearButton.triggerEventHandler('click');
    expect(component.clearScores.emit).toHaveBeenCalled();

    const actionButtons = fixture.debugElement.queryAll(By.css('.done-actions button'));
    actionButtons[0].triggerEventHandler('click');
    actionButtons[1].triggerEventHandler('click');
    expect(component.viewTimeline.emit).toHaveBeenCalled();
    expect(component.resetGame.emit).toHaveBeenCalled();
  });

  it('renders view-only state when completion is hidden', () => {
    component.loading = false;
    component.showCompletion = false;
    component.score = 900;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.done.view-only')).not.toBeNull();
  });
});
