import { Injectable } from '@angular/core';
import type { ElementRef } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TimelineUiService {
  getInsertHeightFromCard(cardEl: HTMLElement | null) {
    if (!cardEl) return 0;
    return Math.ceil(cardEl.getBoundingClientRect().height);
  }

  ensureInsertVisible(listEl: HTMLElement | null, cardEls: ElementRef<HTMLElement>[], insertIdx: number) {
    if (!listEl) return;
    if (!cardEls.length) {
      listEl.scrollTop = 0;
      return;
    }
    const last = cardEls[cardEls.length - 1].nativeElement;
    const maxScroll = Math.max(0, listEl.scrollHeight - listEl.clientHeight);
    let targetOffset = 0;
    if (insertIdx <= 0) {
      targetOffset = 0;
    } else if (insertIdx >= cardEls.length) {
      targetOffset = last.offsetTop + last.offsetHeight;
    } else {
      const prev = cardEls[insertIdx - 1].nativeElement;
      const next = cardEls[insertIdx].nativeElement;
      targetOffset = (prev.offsetTop + prev.offsetHeight + next.offsetTop) / 2;
    }
    const visibleTop = listEl.scrollTop;
    const visibleBottom = visibleTop + listEl.clientHeight;
    if (targetOffset < visibleTop || targetOffset > visibleBottom) {
      const nextTop = Math.min(maxScroll, Math.max(0, targetOffset - listEl.clientHeight / 2));
      listEl.scrollTop = nextTop;
    }
  }

  getDemoTargetPoint(
    listEl: HTMLElement | null,
    cardEls: ElementRef<HTMLElement>[],
    insertIdx: number,
    fromRect: DOMRect,
  ) {
    if (!listEl) return null;
    const listRect = listEl.getBoundingClientRect();
    const left = cardEls[0]?.nativeElement.getBoundingClientRect().left ?? listRect.left + 12;
    if (!cardEls.length) {
      return { x: Math.round(left), y: Math.round(listRect.top + 12) };
    }
    if (insertIdx <= 0) {
      return { x: Math.round(left), y: Math.round(listRect.top + 12) };
    }
    if (insertIdx >= cardEls.length) {
      const lastRect = cardEls[cardEls.length - 1].nativeElement.getBoundingClientRect();
      return { x: Math.round(left), y: Math.round(lastRect.bottom + 8) };
    }
    const prevRect = cardEls[insertIdx - 1].nativeElement.getBoundingClientRect();
    const nextRect = cardEls[insertIdx].nativeElement.getBoundingClientRect();
    const bandTop = prevRect.bottom;
    const bandBottom = nextRect.top;
    const center = (bandTop + bandBottom) / 2;
    const y = center - fromRect.height / 2;
    return { x: Math.round(left), y: Math.round(y) };
  }

  getInsertTopPx(listEl: HTMLElement | null, cardEls: ElementRef<HTMLElement>[], insertIdx: number, height: number) {
    if (!listEl) return null;
    const listRect = listEl.getBoundingClientRect();
    if (!cardEls.length) return 0;
    if (insertIdx <= 0) return 0;
    if (insertIdx >= cardEls.length) return Math.max(0, listEl.clientHeight - height);
    const prevRect = cardEls[insertIdx - 1].nativeElement.getBoundingClientRect();
    const nextRect = cardEls[insertIdx].nativeElement.getBoundingClientRect();
    const bandTop = prevRect.bottom;
    const bandBottom = nextRect.top;
    const center = (bandTop + bandBottom) / 2;
    const unclamped = center - height / 2;
    const maxTop = bandBottom - height;
    const clamped = bandBottom - bandTop < height ? bandTop : Math.min(Math.max(unclamped, bandTop), maxTop);
    return Math.max(0, Math.round(clamped - listRect.top));
  }

  getRailHoverIndex(pointer: { x: number; y: number }, railEl: HTMLElement | null, count: number) {
    if (!railEl) return null;
    const rect = railEl.getBoundingClientRect();
    const { x, y } = pointer;
    const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (!inside) return null;
    const ratio = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
    return Math.min(count, Math.max(0, Math.floor(ratio * (count + 1))));
  }

  getTimelineHover(pointer: { x: number; y: number }, listEl: HTMLElement | null, cardEls: ElementRef<HTMLElement>[], height: number) {
    if (!listEl) return null;
    const rect = listEl.getBoundingClientRect();
    const { x, y } = pointer;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    if (!cardEls.length) return { index: 0, topPx: 0 };
    const centers = cardEls.map((card) => {
      const cardRect = card.nativeElement.getBoundingClientRect();
      return cardRect.top + cardRect.height / 2;
    });
    let index = 0;
    if (y < centers[0]) {
      index = 0;
    } else if (y > centers[centers.length - 1]) {
      index = cardEls.length;
    } else {
      for (let i = 1; i < centers.length; i += 1) {
        if (y < centers[i]) {
          index = i;
          break;
        }
      }
    }
    const topPx = this.getInsertTopPx(listEl, cardEls, index, height);
    if (topPx === null) return null;
    return { index, topPx };
  }
}
