import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IntroPanelComponent } from './intro-panel.component';

describe('IntroPanelComponent', () => {
  let fixture: ComponentFixture<IntroPanelComponent>;
  let component: IntroPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntroPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IntroPanelComponent);
    component = fixture.componentInstance;
  });

  it('renders load error details when provided', () => {
    component.loadError = {
      message: 'No events',
      status: 500,
      statusText: 'Server Error',
      url: 'https://example.test/api',
    };
    fixture.detectChanges();

    const mutedBlocks = Array.from(
      fixture.nativeElement.querySelectorAll('.splash .muted'),
    ) as HTMLElement[];
    const errorBlock = mutedBlocks.find((block) => block.textContent?.includes('Could not load events'));
    expect(errorBlock?.textContent).toContain('No events');
    expect(errorBlock?.textContent).toContain('Status: 500 Server Error');
    expect(errorBlock?.textContent).toContain('URL: https://example.test/api');
  });

  it('emits start events from the action buttons', () => {
    spyOn(component.startGame, 'emit');
    spyOn(component.startDemo, 'emit');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].triggerEventHandler('click');
    buttons[1].triggerEventHandler('click');

    expect(component.startGame.emit).toHaveBeenCalled();
    expect(component.startDemo.emit).toHaveBeenCalled();
  });
});
