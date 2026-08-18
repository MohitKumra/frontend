/**
 * Complete-document helpers for the journal editor.
 *
 * The journal is always one HTML document. Pagination may split that document
 * into visual pages, but those pages are never written back as the source of
 * truth. These helpers extract and preserve every block.
 */

const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'ul',
  'ol',
  'li',
  'pre',
  'hr',
  'table',
  'figure',
  'section',
  'article',
  'main',
  'header',
  'footer',
  'aside',
]);

const PRESERVE_AS_UNIT = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'hr',
  'table',
  'figure',
  'img',
  'ul',
  'ol',
]);

function isBlockElement(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName.toLowerCase());
}

function hasBlockChild(el: HTMLElement): boolean {
  return Array.from(el.children).some(isBlockElement);
}

/**
 * Flatten contentEditable HTML into a list of block-level HTML strings.
 *
 * Chrome often wraps the whole editor in a single <div>. The old normalizer
 * then stuffed every paragraph into one <p>, which:
 *   1. Made pagination treat the journal as a single overflowing block
 *   2. Produced invalid nested <p>/<div> that the browser can collapse on reload
 *
 * This walks through wrappers and emits one block per paragraph/heading/list.
 */
export function extractDocumentBlocks(html: string): string[] {
  if (!html || !html.trim()) return [];

  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return extractBlocksFromElement(tmp);
}

function extractBlocksFromElement(container: HTMLElement): string[] {
  const blocks: string[] = [];

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.replace(/\u00a0/g, ' ').trim();
      if (text) blocks.push(`<p>${escapeText(text)}</p>`);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (PRESERVE_AS_UNIT.has(tag)) {
      blocks.push(el.outerHTML);
      continue;
    }

    if (tag === 'br') {
      blocks.push('<p><br></p>');
      continue;
    }

    if (tag === 'li') {
      blocks.push(el.outerHTML);
      continue;
    }

    if (tag === 'div' || tag === 'p' || tag === 'section' || tag === 'article' || tag === 'main' || tag === 'aside') {
      if (hasBlockChild(el)) {
        // Transparent wrapper — flatten so each child is a breakable unit.
        blocks.push(...extractBlocksFromElement(el));
      } else {
        const inner = el.innerHTML.trim();
        if (inner === '<br>' || inner === '<br/>' || inner === '') {
          blocks.push('<p><br></p>');
        } else {
          blocks.push(`<p>${inner}</p>`);
        }
      }
      continue;
    }

    // Inline leftover at the top level (span, strong, em, mark, …).
    const inner = el.outerHTML.trim();
    if (inner) blocks.push(`<p>${inner}</p>`);
  }

  return blocks;
}

/** Serialize blocks back into one complete document. Never a page map. */
export function serializeDocumentBlocks(blocks: string[]): string {
  return blocks.join('');
}

/**
 * Normalize editor HTML into a complete, paginate-friendly document.
 * Always returns the full journal — never a single line or page.
 */
export function normalizeDocumentHtml(html: string): string {
  if (!html || !html.trim()) return '';
  const blocks = extractDocumentBlocks(html);
  return blocks.length ? serializeDocumentBlocks(blocks) : html;
}

/** Read the complete document from a live editor, falling back to stored HTML. */
export function readCompleteDocument(editor: HTMLElement | null, fallback: string): string {
  if (editor) return editor.innerHTML ?? fallback;
  return fallback;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const DRAFT_PREFIX = 'journal:';
const DRAFT_SUFFIX = ':draft';

export interface JournalDraft {
  content: string;
  title: string;
  contentVersion: number;
  updatedAt: number;
}

export function draftStorageKey(journalId: string): string {
  return `${DRAFT_PREFIX}${journalId}${DRAFT_SUFFIX}`;
}

export function loadJournalDraft(journalId: string): JournalDraft | null {
  if (!journalId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(journalId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JournalDraft;
    if (typeof parsed?.content !== 'string' || typeof parsed?.updatedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveJournalDraft(journalId: string, draft: JournalDraft): void {
  if (!journalId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(draftStorageKey(journalId), JSON.stringify(draft));
  } catch {
    // Quota / private mode — draft is best-effort.
  }
}

export function clearJournalDraft(journalId: string): void {
  if (!journalId || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(draftStorageKey(journalId));
  } catch {
    /* ignore */
  }
}

/** True when a local draft is newer than the last server timestamp and actually differs. */
export function shouldRecoverDraft(
  draft: JournalDraft | null,
  serverContent: string,
  serverUpdatedAt: string | undefined
): boolean {
  if (!draft) return false;
  if (draft.content === serverContent) return false;
  const serverMs = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0;
  return Number.isFinite(serverMs) && draft.updatedAt > serverMs;
}
