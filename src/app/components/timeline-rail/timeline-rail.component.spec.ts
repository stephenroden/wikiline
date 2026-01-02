import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { EventItem } from '../../models';
import { TimelineRailComponent } from './timeline-rail.component';

describe('TimelineRailComponent', () => {
  let fixture: ComponentFixture<TimelineRailComponent>;
  let component: TimelineRailComponent;

  const slots: EventItem[] = [
    { title: 'First', year: 1999 },
    { title: 'Second', year: 2001 },
    { title: 'Third', year: 2005 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineRailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimelineRailComponent);
    component = fixture.componentInstance;
    component.slots = slots;
    component.connections = [];
  });

  it('computes offsets for rail and marks', () => {
    component.railHoverIndex = 1;

    expect(component.railInsertOffset()).toBeCloseTo(37.5, 3);
    expect(component.markOffset(1)).toBeCloseTo(50, 3);
  });

  it('renders insert line only when hover index is set', () => {
    fixture.componentRef.setInput('railHoverIndex', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rail-insert-line')).toBeNull();

    fixture.componentRef.setInput('railHoverIndex', 0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rail-insert-line')).not.toBeNull();
  });
});
