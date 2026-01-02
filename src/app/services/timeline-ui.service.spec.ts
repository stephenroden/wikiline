import { TimelineUiService } from './timeline-ui.service';

describe('TimelineUiService', () => {
  let service: TimelineUiService;

  beforeEach(() => {
    service = new TimelineUiService();
  });

  it('computes insert height from a card element', () => {
    const card = document.createElement('div');
    document.body.appendChild(card);
    spyOn(card, 'getBoundingClientRect').and.returnValue({ height: 80 } as DOMRect);

    expect(service.getInsertHeightFromCard(card)).toBe(80);
    document.body.removeChild(card);
  });

  it('returns null rail hover index when pointer is outside rail', () => {
    const rail = document.createElement('div');
    spyOn(rail, 'getBoundingClientRect').and.returnValue({ left: 0, right: 10, top: 0, bottom: 10, height: 10 } as DOMRect);

    const idx = service.getRailHoverIndex({ x: 50, y: 50 }, rail, 5);
    expect(idx).toBeNull();
  });

  it('returns timeline hover info when pointer is inside list', () => {
    const list = document.createElement('div');
    list.style.height = '200px';
    spyOn(list, 'getBoundingClientRect').and.returnValue({ left: 0, right: 100, top: 0, bottom: 200 } as DOMRect);

    const card = document.createElement('div');
    spyOn(card, 'getBoundingClientRect').and.returnValue({ top: 40, bottom: 80 } as DOMRect);

    const hover = service.getTimelineHover(
      { x: 10, y: 30 },
      list,
      [{ nativeElement: card }],
      20,
    );

    expect(hover).not.toBeNull();
  });
});
