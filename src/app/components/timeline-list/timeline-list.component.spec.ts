import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { EventItem } from '../../models';
import { TimelineListComponent } from './timeline-list.component';

describe('TimelineListComponent', () => {
  let fixture: ComponentFixture<TimelineListComponent>;
  let component: TimelineListComponent;

  const slots: EventItem[] = [
    { title: 'First', year: 1999, url: 'https://example.test/first', thumbnail: 'thumb.png' },
    { title: 'Second', year: 2001 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimelineListComponent);
    component = fixture.componentInstance;
    component.slots = slots;
    component.connections = [];
    component.isCorrected = (item) => item.title === 'Second';
    component.incorrectMessage = (item) => (item.title === 'Second' ? 'Misplaced' : null);
    component.insertIndex = 1;
    component.insertTopPx = 12;
    component.insertHeight = 20;
  });

  it('renders slots and corrected state', () => {
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.timeline-card');
    expect(cards.length).toBe(2);
    expect(cards[1].classList.contains('corrected')).toBeTrue();
    expect(cards[1].textContent).toContain('Misplaced');
  });

  it('shows the insert line when position is provided', () => {
    fixture.detectChanges();

    const insertLine = fixture.nativeElement.querySelector('.timeline-insert-line');
    expect(insertLine).not.toBeNull();
    expect(insertLine.getAttribute('style')).toContain('top: 12px');
    expect(insertLine.getAttribute('style')).toContain('height: 20px');
  });

  it('opens links on click and enter keypress', () => {
    const openSpy = spyOn(window, 'open');
    fixture.detectChanges();

    const firstCard = fixture.debugElement.query(By.css('.timeline-card'));
    firstCard.triggerEventHandler('click');
    expect(openSpy).toHaveBeenCalledWith('https://example.test/first', '_blank', 'noopener');

    openSpy.calls.reset();
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    firstCard.nativeElement.dispatchEvent(event);
    expect(openSpy).toHaveBeenCalledWith('https://example.test/first', '_blank', 'noopener');
  });
});
