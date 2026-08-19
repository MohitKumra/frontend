/**
 * coverStyleMap.ts
 *
 * Single source of truth for mapping a (partial) CoverStyle into concrete
 * React.CSSProperties for every element of the book cover. Both the real
 * rendered cover (AppleBookJournalModal) and the live editor preview
 * (CoverPreview) consume these builders so they always render identically.
 */
import type { CSSProperties } from 'react';
import type { CoverStyle } from '../../types';
import { COVER_STYLE_DEFAULTS } from './CoverTextEditor';

/** Merge a persisted (partial/null) coverStyle with the UI defaults. */
export function mergeCoverStyle(coverStyle?: CoverStyle | null): Required<CoverStyle> {
  return { ...COVER_STYLE_DEFAULTS, ...(coverStyle ?? {}) };
}

/**
 * Background + vertical placement for the cover face.
 * `templateBackground` is the resolved CSS background of the selected template
 * (the caller resolves it so this module doesn't import the template list and
 * create a circular dependency).
 */
export function buildCoverFaceStyle(
  cs: Required<CoverStyle>,
  opts: { coverUrl?: string | null; templateBackground?: string | null },
): CSSProperties {
  const { coverUrl, templateBackground } = opts;
  const base: CSSProperties = {};

  if (coverUrl) {
    base.backgroundImage = `url(${coverUrl})`;
    base.backgroundSize = 'cover';
    base.backgroundPosition = 'center';
    base.backgroundRepeat = 'no-repeat';
  } else if (templateBackground) {
    base.background = templateBackground;
  }

  // A user-custom CSS background wins only when there's no photo or template.
  if (!coverUrl && !templateBackground && cs.coverBackground.trim()) {
    base.background = cs.coverBackground.trim();
    base.backgroundSize = 'cover';
  }

  // Map the user-facing vertical placement to a valid flex alignment.
  base.justifyContent =
    cs.titlePosition === 'top'
      ? 'flex-start'
      : cs.titlePosition === 'bottom'
        ? 'flex-end'
        : 'center';
  return base;
}

/** Photo overlay scrim (only applied when a custom photo is active). */
export function buildOverlayStyle(cs: Required<CoverStyle>): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    background: `rgba(0,0,0,${cs.overlayOpacity})`,
    pointerEvents: 'none',
    zIndex: 0,
  };
}

/** Decorative gold border. */
export function buildBorderStyle(cs: Required<CoverStyle>): CSSProperties {
  const style: CSSProperties & Record<string, string | number> = {
    position: 'relative',
    zIndex: 1,
    boxShadow: `inset 0 0 0 3px ${cs.borderColor}`,
  };
  style['--cover-border-color'] = cs.borderColor;
  style.border =
    cs.borderStyle === 'none'
      ? 'none'
      : `${cs.borderWidth}px ${cs.borderStyle} ${cs.borderColor}`;
  return style;
}

/** Base layout for text/content that sits above the background. */
const CONTENT_BASE: CSSProperties = { position: 'relative', zIndex: 1 };

export function buildTitleStyle(cs: Required<CoverStyle>): CSSProperties {
  return {
    ...CONTENT_BASE,
    fontFamily: cs.titleFont,
    fontSize: `${cs.titleSize}px`,
    color: cs.titleColor,
    fontWeight: cs.titleWeight,
    fontStyle: cs.titleItalic ? 'italic' : 'normal',
    textAlign: cs.titleAlign,
    letterSpacing: `${cs.titleLetterSpacing}em`,
    textTransform: cs.titleTransform,
    textShadow: cs.titleShadow
      ? `0 2px 8px rgba(0,0,0,0.6), 0 0 20px ${cs.titleColor}`
      : 'none',
  };
}

export function buildSubtitleStyle(cs: Required<CoverStyle>): CSSProperties {
  return {
    ...CONTENT_BASE,
    fontFamily: cs.subtitleFont,
    color: cs.subtitleColor,
    fontSize: `${cs.subtitleSize}px`,
    fontWeight: cs.subtitleWeight,
    textAlign: cs.subtitleAlign,
  };
}

export function buildDividerStyle(cs: Required<CoverStyle>): CSSProperties {
  return {
    ...CONTENT_BASE,
    background: `linear-gradient(90deg, transparent, ${cs.dividerColor}, transparent)`,
  };
}

export function buildAuthorStyle(cs: Required<CoverStyle>): CSSProperties {
  return {
    ...CONTENT_BASE,
    fontFamily: cs.authorFont,
    color: cs.authorColor,
    fontSize: `${cs.authorSize}px`,
    fontWeight: cs.authorWeight,
    textAlign: cs.authorAlign,
  };
}

/** The emblem is a plain positioned block; expose a tiny helper for reuse. */
export function buildEmblemStyle(): CSSProperties {
  return { position: 'relative', zIndex: 1 };
}

/** Default author text when none is provided. */
export function resolveAuthorText(cs: Required<CoverStyle>): string {
  return cs.authorText?.trim() ? cs.authorText.trim() : 'Personal Journal Edition';
}
