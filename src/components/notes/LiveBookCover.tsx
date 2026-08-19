/**
 * LiveBookCover.tsx
 *
 * Single source of truth for the book cover face.
 *
 * Both the actual hardcover in AppleBookJournalModal AND the scaled-down
 * preview inside BookCoverPickerModal render this component so they are
 * always pixel-for-pixel identical. Every text-style change made in the
 * "Text Style" tab is immediately reflected in the preview and will look
 * exactly the same on the real cover.
 *
 * Layout (inside .apple-book-hardcover-face):
 *   1. SVG template artwork — absolute, full-bleed, z-index 0
 *   2. Photo overlay scrim  — absolute, full-bleed, z-index 1
 *   3. Decorative gold border
 *   4. Sparkle emblem       — only when no photo, no template, cs.showEmblem
 *   5. Title  <h1>
 *   6. Subtitle <p>
 *   7. Divider <div>
 *   8. Author  <p>
 *   9. children  — slot for extra content (e.g. the "Open Book" button in the
 *                  real modal; nothing in the preview).
 *
 * The component renders only the inner face content.  The caller is
 * responsible for wrapping it in .apple-book-hardcover-face and supplying
 * the cover face background style (via buildCoverFaceStyle).
 */
import React from 'react';
import { Sparkles } from 'lucide-react';
import type { CoverStyle } from '../../types';
import {
  mergeCoverStyle,
  buildCoverFaceStyle,
  buildOverlayStyle,
  buildBorderStyle,
  buildTitleStyle,
  buildSubtitleStyle,
  buildDividerStyle,
  buildAuthorStyle,
  buildEmblemStyle,
  resolveAuthorText,
} from './coverStyleMap';
import { COVER_SVG_MAP, COVER_TEMPLATES } from './BookCoverPickerModal';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface LiveBookCoverProps {
  /** Book / note title shown on the cover */
  title: string;
  /** Formatted date string shown as the subtitle */
  dateLabel: string;
  /** URL of the user's custom cover photo (null = no photo) */
  coverUrl: string | null;
  /** Template id — when set the matching SVG is rendered as a background layer */
  templateId: string | null;
  /** Current cover style (partial or null — merged with defaults internally) */
  coverStyle: CoverStyle | null;
  /** Extra content rendered after the author line (e.g. "Open Book" button) */
  children?: React.ReactNode;
  /** Optional extra className on the face div */
  className?: string;
  /** Optional extra inline style on the face div */
  style?: React.CSSProperties;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LiveBookCover({
  title,
  dateLabel,
  coverUrl,
  templateId,
  coverStyle,
  children,
  className = '',
  style,
}: LiveBookCoverProps) {
  const cs = mergeCoverStyle(coverStyle);

  // Resolve the selected template's CSS background (used as a fallback when
  // no SVG renderer exists for that id, which should never happen in practice).
  const templateBackground = React.useMemo(() => {
    if (!templateId) return null;
    return (COVER_TEMPLATES.find((t) => t.id === templateId)?.style.background as string) ?? null;
  }, [templateId]);

  // Build the face background + justify-content for vertical text placement.
  const faceStyle = buildCoverFaceStyle(cs, {
    coverUrl,
    templateBackground: templateId && !COVER_SVG_MAP[templateId] ? templateBackground : undefined,
  });

  const SvgCover = templateId ? COVER_SVG_MAP[templateId] : undefined;

  return (
    <div
      className={`apple-book-hardcover-face ${className}`}
      style={{ ...faceStyle, ...style }}
    >
      {/* ── 1. SVG template — full-bleed background layer ── */}
      {SvgCover && !coverUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <SvgCover />
        </div>
      )}

      {/* ── 2. Photo overlay scrim ── */}
      {coverUrl && <div style={buildOverlayStyle(cs)} />}

      {/* ── 3. Decorative gold border ── */}
      {cs.showBorder && (
        <div
          className="apple-book-cover-gold-border"
          style={buildBorderStyle(cs) as React.CSSProperties}
        />
      )}

      {/* ── 4. Sparkle emblem — only when bare (no photo, no template) ── */}
      {!coverUrl && !templateId && cs.showEmblem && (
        <div className="apple-book-cover-emblem" style={buildEmblemStyle()}>
          <Sparkles size={36} />
        </div>
      )}

      {/* ── 5. Title ── */}
      <h1 className="apple-book-cover-title" style={buildTitleStyle(cs)}>
        {title || 'My Journal'}
      </h1>

      {/* ── 6. Subtitle (date) ── */}
      <p className="apple-book-cover-subtitle" style={buildSubtitleStyle(cs)}>
        {dateLabel}
      </p>

      {/* ── 7. Divider ── */}
      <div className="apple-book-cover-divider" style={buildDividerStyle(cs)} />

      {/* ── 8. Author / edition line ── */}
      <p className="apple-book-cover-author" style={buildAuthorStyle(cs)}>
        {resolveAuthorText(cs)}
      </p>

      {/* ── 9. Slot for extra content (Open Book button, etc.) ── */}
      {children}
    </div>
  );
}

// ─── Scaled-down preview wrapper ─────────────────────────────────────────────

/**
 * Renders LiveBookCover at a fixed reference size (260 × 390 px) and scales
 * the whole thing down to PREVIEW_WIDTH so every pixel proportion is
 * identical to the real cover.
 */
const PREVIEW_WIDTH  = 150;
const COVER_REF_W    = 260;
const COVER_REF_H    = 390;

export interface LiveBookCoverPreviewProps
  extends Omit<LiveBookCoverProps, 'children' | 'className' | 'style'> {
  /** Displayed width of the preview in px. Defaults to 150. */
  width?: number;
}

export function LiveBookCoverPreview(props: LiveBookCoverPreviewProps) {
  const { width = PREVIEW_WIDTH, ...coverProps } = props;
  const scale = width / COVER_REF_W;
  const boxHeight = Math.round(COVER_REF_H * scale);

  return (
    <div
      className="bcp-preview"
      style={{ width, height: boxHeight, flexShrink: 0 }}
    >
      {/* Reference-size inner div — scaled down so proportions are exact */}
      <div
        style={{
          width: COVER_REF_W,
          height: COVER_REF_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <LiveBookCover
          {...coverProps}
          style={{ width: '100%', height: '100%', borderLeft: 'none' }}
        />
      </div>
    </div>
  );
}
