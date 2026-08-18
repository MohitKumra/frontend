/**
 * Measurement-based journal pagination.
 *
 * Pages are derived UI state. This module never mutates the source document
 * and never uses character-count heuristics. Blocks are packed by measuring
 * actual rendered height against the page's usable content area.
 */

import { extractDocumentBlocks } from './journalDocument';

export interface PaginationFonts {
  fontFamily: string;
  fontSizePx: number;
  lineHeight: number;
}

export interface PageMetrics {
  contentWidth: number;
  firstPageHeight: number;
  restPageHeight: number;
}

export interface PaginationProbe {
  host: HTMLDivElement;
  content: HTMLDivElement;
  dispose: () => void;
}

/**
 * Off-screen probe that uses the same classes/CSS variables as a real book page
 * so measured heights match what the user sees.
 */
export function createPaginationProbe(fonts: PaginationFonts): PaginationProbe {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.className = 'apple-book-pagination-probe';
  host.style.cssText = [
    'position:fixed',
    'top:0',
    'left:-12000px',
    'visibility:hidden',
    'pointer-events:none',
    'z-index:-1',
    `font-family:${fonts.fontFamily}`,
    `font-size:${fonts.fontSizePx}px`,
    `line-height:${fonts.lineHeight}`,
    `--book-font-family:${fonts.fontFamily}`,
    `--book-font-size:${fonts.fontSizePx}px`,
    `--book-leading:${fonts.lineHeight}`,
  ].join(';');

  const content = document.createElement('div');
  content.className = 'apple-book-text-content apple-book-rich-content';
  content.style.cssText = [
    'margin:0',
    'padding:0',
    'white-space:normal',
    'word-break:break-word',
    'overflow-wrap:break-word',
  ].join(';');

  host.appendChild(content);
  document.body.appendChild(host);

  return {
    host,
    content,
    dispose: () => {
      host.remove();
    },
  };
}

export function updateProbeFonts(probe: PaginationProbe, fonts: PaginationFonts): void {
  probe.host.style.fontFamily = fonts.fontFamily;
  probe.host.style.fontSize = `${fonts.fontSizePx}px`;
  probe.host.style.lineHeight = String(fonts.lineHeight);
  probe.host.style.setProperty('--book-font-family', fonts.fontFamily);
  probe.host.style.setProperty('--book-font-size', `${fonts.fontSizePx}px`);
  probe.host.style.setProperty('--book-leading', String(fonts.lineHeight));
}

function measureHtml(probe: PaginationProbe, html: string, width: number): number {
  probe.content.style.width = `${Math.max(width, 80)}px`;
  probe.content.innerHTML = html || '<p><br></p>';
  const height = probe.content.getBoundingClientRect().height;
  return height;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function blockTagAndInner(blockHtml: string): { tag: string; inner: string; text: string } {
  const tmp = document.createElement('div');
  tmp.innerHTML = blockHtml;
  const el = tmp.firstElementChild as HTMLElement | null;
  if (!el) {
    return { tag: 'p', inner: blockHtml, text: tmp.textContent ?? '' };
  }
  return {
    tag: el.tagName.toLowerCase(),
    inner: el.innerHTML,
    text: el.textContent ?? '',
  };
}

/**
 * Split an oversized paragraph at word boundaries so it never overflows a page.
 * Inline formatting is flattened to text for the split pieces only; unsplit
 * blocks keep their original HTML.
 */
function splitOversizedBlock(
  probe: PaginationProbe,
  blockHtml: string,
  width: number,
  maxHeight: number
): string[] {
  const { tag, text } = blockTagAndInner(blockHtml);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [blockHtml];

  const pages: string[] = [];
  let cursor = 0;

  while (cursor < words.length) {
    let lo = 1;
    let hi = words.length - cursor;
    let fit = 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = `<${tag}>${escapeText(words.slice(cursor, cursor + mid).join(' '))}</${tag}>`;
      if (measureHtml(probe, candidate, width) <= maxHeight) {
        fit = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    pages.push(`<${tag}>${escapeText(words.slice(cursor, cursor + fit).join(' '))}</${tag}>`);
    cursor += fit;
  }

  return pages.length ? pages : [blockHtml];
}

function expandIfNeeded(
  probe: PaginationProbe,
  blockHtml: string,
  width: number,
  pageHeight: number
): string[] {
  const tmp = document.createElement('div');
  tmp.innerHTML = blockHtml;
  const el = tmp.firstElementChild as HTMLElement | null;
  const tag = el?.tagName.toLowerCase() ?? '';

  if ((tag === 'ul' || tag === 'ol') && el) {
    const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
    if (items.length > 1 && measureHtml(probe, blockHtml, width) > pageHeight) {
      return items.map((li) => `<${tag}>${(li as HTMLElement).outerHTML}</${tag}>`);
    }
  }

  if (measureHtml(probe, blockHtml, width) > pageHeight) {
    return splitOversizedBlock(probe, blockHtml, width, pageHeight);
  }
  return [blockHtml];
}

/**
 * Pack the complete document into visual pages using measured block heights.
 * The returned strings are render-only slices. Do not persist them.
 */
export function paginateDocument(
  probe: PaginationProbe,
  completeHtml: string,
  metrics: PageMetrics
): string[] {
  const width = Math.max(metrics.contentWidth, 80);
  const blocks = extractDocumentBlocks(completeHtml);

  if (blocks.length === 0) return [''];

  const pages: string[] = [];
  let current = '';
  let pageIdx = 0;

  const cap = () => (pageIdx === 0 ? metrics.firstPageHeight : metrics.restPageHeight);

  const flush = () => {
    if (current.trim()) {
      pages.push(current);
      current = '';
      pageIdx += 1;
    }
  };

  for (const rawBlock of blocks) {
    const units = expandIfNeeded(probe, rawBlock, width, cap());
    for (const unit of units) {
      const candidate = current + unit;
      if (!current.trim()) {
        // Start of a page: if the unit itself is taller than the page, split it.
        if (measureHtml(probe, unit, width) > cap()) {
          const split = splitOversizedBlock(probe, unit, width, cap());
          for (const piece of split) {
            if (current && measureHtml(probe, current + piece, width) > cap()) flush();
            current += piece;
            if (measureHtml(probe, current, width) > cap()) flush();
          }
        } else {
          current = unit;
        }
        continue;
      }

      if (measureHtml(probe, candidate, width) <= cap()) {
        current = candidate;
      } else {
        flush();
        current = unit;
      }
    }
  }

  if (current.trim()) pages.push(current);
  probe.content.innerHTML = '';
  return pages.length ? pages : [''];
}

/**
 * Usable content height for a page:
 *   pageHeight - vertical padding - header - footer [- title on page 1]
 *
 * Prefer live DOM measurements when the page body is mounted; otherwise use
 * the geometric formula so we never fall back to character counts.
 */
export function computePageMetrics(args: {
  pageWidth: number;
  pageHeight: number;
  liveInner?: HTMLElement | null;
  liveBody?: HTMLElement | null;
  hasTitle: boolean;
}): PageMetrics {
  const { pageWidth, pageHeight, liveInner, liveBody, hasTitle } = args;

  const innerW = liveInner && liveInner.clientWidth > 0 ? liveInner.clientWidth : pageWidth;
  const innerH = liveInner && liveInner.clientHeight > 0 ? liveInner.clientHeight : pageHeight;

  // .apple-book-page-inner padding is 7% 9%
  const hPad = innerW * 0.18;
  const contentWidth = Math.max(Math.floor(innerW - hPad), 80);

  const headerH = 38;
  const footerH = 38;
  const titleH = hasTitle ? 56 : 0;
  const vPad = innerH * 0.14;

  let restH: number;
  let firstH: number;

  if (liveBody && liveBody.clientHeight > 0) {
    // Page 1 body is already reduced by the title block when present.
    firstH = liveBody.clientHeight;
    restH = firstH + (hasTitle ? titleH : 0);
  } else {
    restH = Math.max(innerH - vPad - headerH - footerH, 80);
    firstH = Math.max(restH - titleH, 60);
  }

  // Small safety gap so descenders / collapsing margins never meet the footer.
  const safety = 8;
  return {
    contentWidth,
    firstPageHeight: Math.max(firstH - safety, 48),
    restPageHeight: Math.max(restH - safety, 64),
  };
}
