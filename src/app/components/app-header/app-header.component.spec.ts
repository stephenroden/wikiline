import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppHeaderComponent } from './app-header.component';

describe('AppHeaderComponent', () => {
  let fixture: ComponentFixture<AppHeaderComponent>;
  let component: AppHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppHeaderComponent);
    component = fixture.componentInstance;
  });

  it('hides the score card when intro is shown', () => {
    component.showIntro = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.score-card')).toBeNull();
  });

  it('shows the timer and emits reset when intro is hidden', () => {
    component.showIntro = false;
    component.elapsedLabel = '1:23';
    spyOn(component.resetGame, 'emit');
    fixture.detectChanges();

    const scoreCard = fixture.nativeElement.querySelector('.score-card');
    expect(scoreCard).not.toBeNull();
    expect(scoreCard.textContent).toContain('1:23');

    const resetButton = fixture.debugElement.query(By.css('button.ghost'));
    resetButton.triggerEventHandler('click');
    expect(component.resetGame.emit).toHaveBeenCalled();
  });

  it('captures the header element', () => {
    fixture.detectChanges();

    const header = component.headerEl?.nativeElement || null;
    expect(header?.tagName).toBe('HEADER');
  });
});
