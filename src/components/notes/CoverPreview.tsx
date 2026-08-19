/**
 * CoverPreview.tsx
 *
 * Thin re-export shim — kept for any existing imports of CoverPreview.
 * The real implementation now lives in LiveBookCover.tsx so the preview
 * and the actual cover share a single rendering path.
 */
export { LiveBookCoverPreview as CoverPreview } from './LiveBookCover';
export type { LiveBookCoverPreviewProps as CoverPreviewProps } from './LiveBookCover';
