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
    if (x < rect.left || x > rect.right) return null;
    if (!cardEls.length) return { index: 0, topPx: 0 };
    if (y <= rect.top) return { index: 0, topPx: 0 };
    if (y >= rect.bottom) {
      return { index: cardEls.length, topPx: listEl.clientHeight - height };
    }
    const bands: Array<{ top: number; bottom: number; index: number }> = [];
    const firstRect = cardEls[0].nativeElement.getBoundingClientRect();
    bands.push({ top: rect.top, bottom: firstRect.top, index: 0 });
    for (let i = 1; i < cardEls.length; i += 1) {
      const prevRect = cardEls[i - 1].nativeElement.getBoundingClientRect();
      const nextRect = cardEls[i].nativeElement.getBoundingClientRect();
      bands.push({ top: prevRect.bottom, bottom: nextRect.top, index: i });
    }
    const lastRect = cardEls[cardEls.length - 1].nativeElement.getBoundingClientRect();
    bands.push({ top: lastRect.bottom, bottom: rect.bottom, index: cardEls.length });
    const listTop = rect.top;
    for (const band of bands) {
      if (y < band.top || y > band.bottom) continue;
      const bandHeight = band.bottom - band.top;
      const center = (band.top + band.bottom) / 2;
      const unclamped = center - height / 2;
      const maxTop = band.bottom - height;
      const clamped = bandHeight < height ? band.top : Math.min(Math.max(unclamped, band.top), maxTop);
      return { index: band.index, topPx: Math.max(0, clamped - listTop) };
    }
    return { index: cardEls.length, topPx: Math.max(0, rect.bottom - listTop - height) };
  }
}
