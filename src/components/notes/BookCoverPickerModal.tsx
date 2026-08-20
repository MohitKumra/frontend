/**
 * BookCoverPickerModal
 *
 * Rich SVG-textured cover templates with side-preview layout.
 *
 * IMPORTANT: every template's viewBox is "0 0 90 135" — a true 2:3 ratio that
 * exactly matches the real cover face (COVER_REF_W:COVER_REF_H = 260:390 = 2:3
 * in LiveBookCover.tsx). Previously these were authored at 90x120 (3:4), which
 * caused the SVG default `preserveAspectRatio="xMidYMid meet"` to letterbox —
 * leaving the face's own background colour visible as bands at top/bottom.
 * Because the viewBox now matches the render box's aspect ratio 1:1, every
 * shape fills edge-to-edge with zero distortion — circles stay circles.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  X,
  Upload,
  Check,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Trash2,
  Type,
} from 'lucide-react';
import { processCoverImage, CoverProcessError } from '../../lib/coverImageProcessor';
import type { NoteDTO, CoverStyle, BookStyle } from '../../types';
import { CoverTextEditor } from './CoverTextEditor';
import { LiveBookCoverPreview as CoverPreview } from './LiveBookCover';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CoverTemplate {
  id: string;
  label: string;
  /** Inline CSS for the cover thumbnail background (still used by CoverPreview). */
  style: React.CSSProperties;
  titlePos: 'top' | 'center' | 'bottom';
  /** Title colour used in thumbnail and preview */
  titleColor: string;
}

/**
 * Full preset theme — bundled cover style + interior book style.
 * Every template ships with its own complete look so clicking a preset
 * applies both the cover artwork AND the inside-page appearance at once.
 */
export interface PresetTheme {
  /** Cover typography / decoration overrides (merged on top of CoverStyle defaults) */
  coverStyle: Partial<CoverStyle>;
  /** Interior page appearance applied to BookStyle */
  bookStyle: BookStyle;
}

// ─── SVG Cover artwork ───────────────────────────────────────────────────────
// Each cover is a self-contained SVG at a TRUE 2:3 aspect ratio (90×135
// viewBox) — this matches the real cover face exactly, so nothing stretches
// or letterboxes. A shared vignette + sheen pass is layered on top of every
// template for a more premium, dimensional finish.

// ─── SVG template components ─────────────────────────────────────────────────
// Each template is PURE background artwork (patterns, borders, ornaments).
// The title / subtitle / author are NOT baked into the SVG — they are rendered
// by the shared LiveBookCover DOM (styled by coverStyle) on top, so the preset,
// the picker preview, and the real cover are always pixel-identical and every
// text change is visible.

function DarkLeatherSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <filter id="dl-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
          <feBlend in="SourceGraphic" in2="grey" mode="multiply" result="blend"/>
          <feComponentTransfer in="blend"><feFuncA type="linear" slope="1"/></feComponentTransfer>
        </filter>
        <linearGradient id="dl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5a3a1c"/>
          <stop offset="45%" stopColor="#2a1608"/>
          <stop offset="100%" stopColor="#160b04"/>
        </linearGradient>
        <linearGradient id="dl-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12"/>
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.02"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.2"/>
        </linearGradient>
        <radialGradient id="dl-vig" cx="50%" cy="42%" r="72%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.45"/>
        </radialGradient>
      </defs>
      {/* Base */}
      <rect width="90" height="135" fill="url(#dl-bg)"/>
      {/* Grain overlay */}
      <rect width="90" height="135" fill="url(#dl-bg)" filter="url(#dl-grain)" opacity="0.4"/>
      {/* Sheen */}
      <rect width="90" height="135" fill="url(#dl-sheen)"/>
      {/* Spine line */}
      <line x1="8" y1="4.5" x2="8" y2="130.5" stroke="#c19a6b" strokeWidth="0.8" opacity="0.6"/>
      {/* Outer border */}
      <rect x="5" y="5.6" width="80" height="123.8" rx="1" fill="none" stroke="#c19a6b" strokeWidth="0.7" opacity="0.5"/>
      {/* Inner border */}
      <rect x="10" y="11.3" width="70" height="112.5" rx="1" fill="none" stroke="#c19a6b" strokeWidth="0.4" opacity="0.3"/>
      {/* Corner ornaments TL */}
      <path d="M10,11.3 L18,11.3 M10,11.3 L10,20.3" stroke="#d4af37" strokeWidth="1.2" fill="none"/>
      <circle cx="10" cy="11.3" r="1.5" fill="#d4af37" opacity="0.8"/>
      {/* Corner ornaments TR */}
      <path d="M80,11.3 L72,11.3 M80,11.3 L80,20.3" stroke="#d4af37" strokeWidth="1.2" fill="none"/>
      <circle cx="80" cy="11.3" r="1.5" fill="#d4af37" opacity="0.8"/>
      {/* Corner ornaments BL */}
      <path d="M10,123.8 L18,123.8 M10,123.8 L10,114.8" stroke="#d4af37" strokeWidth="1.2" fill="none"/>
      <circle cx="10" cy="123.8" r="1.5" fill="#d4af37" opacity="0.8"/>
      {/* Corner ornaments BR */}
      <path d="M80,123.8 L72,123.8 M80,123.8 L80,114.8" stroke="#d4af37" strokeWidth="1.2" fill="none"/>
      <circle cx="80" cy="123.8" r="1.5" fill="#d4af37" opacity="0.8"/>
      {/* Central flourish */}
      <path d="M45,58.5 C38,58.5 34,63 34,67.5 C34,72 38,76.5 45,76.5 C52,76.5 56,72 56,67.5 C56,63 52,58.5 45,58.5Z" fill="none" stroke="#d4af37" strokeWidth="0.6" opacity="0.5"/>
      <path d="M45,61.9 L45,73.1 M39,67.5 L51,67.5" stroke="#d4af37" strokeWidth="0.5" opacity="0.4"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#dl-vig)"/>
    </svg>
  );
}

/** Forest — botanical fern leaves, dark green atmosphere */
function ForestGreenSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="fg-bg" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#245a41"/>
          <stop offset="100%" stopColor="#05140c"/>
        </linearGradient>
        <radialGradient id="fg-glow" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#3a7a54" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#071a10" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="fg-vig" cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4"/>
        </radialGradient>
      </defs>
      <rect width="90" height="135" fill="url(#fg-bg)"/>
      <rect width="90" height="135" fill="url(#fg-glow)"/>
      {/* Fern left */}
      <path d="M15,118.1 C18,101.3 14,84.4 20,69.8 M20,69.8 C16,76.5 12,78.8 10,84.4 M20,69.8 C17,75.4 22,73.1 24,67.5 M20,69.8 C18,81 14,83.3 12,90 M20,69.8 C22,78.8 26,76.5 28,70.9 M20,69.8 C17,86.6 14,92.3 11,99 M20,69.8 C23,87.8 27,85.5 29,78.8" stroke="#4ade80" strokeWidth="0.7" fill="none" opacity="0.5"/>
      {/* Fern right */}
      <path d="M75,118.1 C72,101.3 76,84.4 70,69.8 M70,69.8 C74,76.5 78,78.8 80,84.4 M70,69.8 C73,75.4 68,73.1 66,67.5 M70,69.8 C72,81 76,83.3 78,90 M70,69.8 C68,78.8 64,76.5 62,70.9 M70,69.8 C73,86.6 76,92.3 79,99 M70,69.8 C67,87.8 63,85.5 61,78.8" stroke="#4ade80" strokeWidth="0.7" fill="none" opacity="0.5"/>
      {/* Small leaves top */}
      <ellipse cx="30" cy="24.8" rx="7" ry="3" fill="#2d6a44" opacity="0.55" transform="rotate(-30 30 24.8)"/>
      <ellipse cx="60" cy="20.3" rx="7" ry="3" fill="#2d6a44" opacity="0.55" transform="rotate(25 60 20.3)"/>
      <ellipse cx="45" cy="15.8" rx="5" ry="2.5" fill="#3a7a54" opacity="0.65"/>
      {/* Border */}
      <rect x="6" y="6.8" width="78" height="121.5" rx="2" fill="none" stroke="#4ade80" strokeWidth="0.6" opacity="0.4"/>
      {/* Dot accents */}
      <circle cx="22" cy="90" r="1" fill="#4ade80" opacity="0.55"/>
      <circle cx="68" cy="90" r="1" fill="#4ade80" opacity="0.55"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#fg-vig)"/>
    </svg>
  );
}

/** Midnight Blue — constellation map with star dots and connecting lines */
function MidnightBlueSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="mb-bg" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#12244a"/>
          <stop offset="60%" stopColor="#060e20"/>
          <stop offset="100%" stopColor="#020610"/>
        </linearGradient>
        <radialGradient id="mb-nebula" cx="60%" cy="32%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#060e20" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="mb-nebula2" cx="25%" cy="68%" r="40%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#060e20" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="mb-vig" cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5"/>
        </radialGradient>
      </defs>
      <rect width="90" height="135" fill="url(#mb-bg)"/>
      <rect width="90" height="135" fill="url(#mb-nebula)"/>
      <rect width="90" height="135" fill="url(#mb-nebula2)"/>
      {/* Stars */}
      {[[12,20.3],[22,11.3],[35,28.1],[50,13.5],[65,24.8],[75,15.8],[80,39.4],[70,54],[58,42.8],[44,50.6],[30,42.8],[18,56.3],[25,69.8],[48,78.8],[62,65.3],[78,67.5],[68,90],[50,101.3],[30,95.6],[14,84.4],[8,99],[20,110],[55,113],[38,120],[72,105]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r={i%3===0?1.2:0.7} fill="white" opacity={0.4+((i*7)%5)*0.1}/>
      ))}
      {/* Constellation lines */}
      <polyline points="22,11.3 35,28.1 44,50.6 30,42.8 18,56.3" fill="none" stroke="#a5b4fc" strokeWidth="0.4" opacity="0.4"/>
      <polyline points="50,13.5 65,24.8 58,42.8 48,78.8" fill="none" stroke="#a5b4fc" strokeWidth="0.4" opacity="0.4"/>
      <polyline points="75,15.8 80,39.4 70,54 62,65.3 68,90" fill="none" stroke="#a5b4fc" strokeWidth="0.4" opacity="0.35"/>
      <polyline points="20,110 55,113 38,120" fill="none" stroke="#a5b4fc" strokeWidth="0.35" opacity="0.3"/>
      {/* Moon crescent */}
      <path d="M42,33.75 A10,10 0 1 0 42,56.25 A6,6 0 1 1 42,33.75Z" fill="#c7d2fe" opacity="0.2"/>
      {/* Border */}
      <rect x="5" y="5.6" width="80" height="123.75" rx="2" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.45"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#mb-vig)"/>
    </svg>
  );
}

/** Parchment — aged paper with ink flourishes and corner scrollwork */
function ParchmentSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <filter id="parch-noise">
          <feTurbulence type="turbulence" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <linearGradient id="parch-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5e9d3"/>
          <stop offset="40%" stopColor="#ecdcc0"/>
          <stop offset="100%" stopColor="#d3bd97"/>
        </linearGradient>
        <radialGradient id="parch-age" cx="80%" cy="18%" r="60%">
          <stop offset="0%" stopColor="#b8924a" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#f5e9d3" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="parch-age2" cx="10%" cy="92%" r="55%">
          <stop offset="0%" stopColor="#8b6914" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#f5e9d3" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="parch-vig" cx="50%" cy="45%" r="75%">
          <stop offset="60%" stopColor="#3e2200" stopOpacity="0"/>
          <stop offset="100%" stopColor="#3e2200" stopOpacity="0.28"/>
        </radialGradient>
      </defs>
      <rect width="90" height="135" fill="url(#parch-bg)"/>
      <rect width="90" height="135" fill="url(#parch-age)"/>
      <rect width="90" height="135" fill="url(#parch-age2)"/>
      {/* Wavy parchment edges */}
      <rect width="90" height="135" fill="url(#parch-bg)" filter="url(#parch-noise)" opacity="0.15"/>
      {/* Outer border double rule */}
      <rect x="5" y="5.6" width="80" height="123.75" rx="1" fill="none" stroke="#7a5c2a" strokeWidth="0.8"/>
      <rect x="8" y="9" width="74" height="117" rx="1" fill="none" stroke="#7a5c2a" strokeWidth="0.4" opacity="0.6"/>
      {/* Corner scrollwork TL */}
      <path d="M8,9 Q12,9 12,13.5 Q12,9 16,9" fill="none" stroke="#5a3e10" strokeWidth="0.8"/>
      <path d="M8,9 Q8,13.5 12,13.5 Q8,13.5 8,18" fill="none" stroke="#5a3e10" strokeWidth="0.8"/>
      {/* Corner scrollwork TR */}
      <path d="M82,9 Q78,9 78,13.5 Q78,9 74,9" fill="none" stroke="#5a3e10" strokeWidth="0.8"/>
      <path d="M82,9 Q82,13.5 78,13.5 Q82,13.5 82,18" fill="none" stroke="#5a3e10" strokeWidth="0.8"/>
      {/* Corner scrollwork BL */}
      <path d="M8,126 Q12,126 12,121.5 Q12,126 16,126" fill="none" stroke="#5a3e10" strokeWidth="0.8"/>
      <path d="M8,126 Q8,121.5 12,121.5 Q8,121.5 8,117" fill="none" stroke="#5a3e10" strokeWidth="0.8"/>
      {/* Corner scrollwork BR */}
      <path d="M82,126 Q78,126 78,121.5 Q78,126 74,126" fill="none" stroke="#5a3e10" strokeWidth="0.8"/>
      <path d="M82,126 Q82,121.5 78,121.5 Q82,121.5 82,117" fill="none" stroke="#5a3e10" strokeWidth="0.8"/>
      {/* Quill feather */}
      <path d="M45,33.75 C35,42.75 30,61.875 38,73.125 C42,65.25 44,54 45,33.75Z" fill="#7a5c2a" opacity="0.3"/>
      <path d="M45,33.75 C55,42.75 60,61.875 52,73.125 C48,65.25 46,54 45,33.75Z" fill="#7a5c2a" opacity="0.25"/>
      <line x1="45" y1="33.75" x2="45" y2="81" stroke="#5a3e10" strokeWidth="0.7" opacity="0.5"/>
      {/* Ink splatter dots */}
      <circle cx="38" cy="76.5" r="0.8" fill="#2a1a00" opacity="0.3"/>
      <circle cx="52" cy="78.75" r="0.6" fill="#2a1a00" opacity="0.3"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#parch-vig)"/>
    </svg>
  );
}

/** Obsidian — polished volcanic stone with light caustic reflections */
function ObsidianSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="ob-bg" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#232326"/>
          <stop offset="45%" stopColor="#0a0a0c"/>
          <stop offset="100%" stopColor="#000000"/>
        </linearGradient>
        <linearGradient id="ob-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16"/>
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.04"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.12"/>
        </linearGradient>
        <radialGradient id="ob-caustic" cx="30%" cy="22%" r="35%">
          <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="ob-vig" cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5"/>
        </radialGradient>
      </defs>
      <rect width="90" height="135" fill="url(#ob-bg)"/>
      <rect width="90" height="135" fill="url(#ob-sheen)"/>
      <rect width="90" height="135" fill="url(#ob-caustic)"/>
      {/* Fracture lines */}
      <path d="M20,0 L35,33.75 L25,61.875 L40,90 L30,135" stroke="#3f3f46" strokeWidth="0.6" fill="none" opacity="0.5"/>
      <path d="M60,0 L50,28.125 L65,56.25 L55,84.375 L70,135" stroke="#3f3f46" strokeWidth="0.5" fill="none" opacity="0.4"/>
      <path d="M0,39.375 L30,47.25 L60,39.375 L90,45" stroke="#52525b" strokeWidth="0.4" fill="none" opacity="0.3"/>
      {/* Gloss highlight diagonal */}
      <path d="M5,5.625 L35,5.625 L5,28.125Z" fill="white" opacity="0.05"/>
      {/* Border */}
      <rect x="5" y="5.625" width="80" height="123.75" rx="2" fill="none" stroke="#52525b" strokeWidth="0.6" opacity="0.5"/>
      {/* Geometric diamond center */}
      <path d="M45,47.25 L55,67.5 L45,87.75 L35,67.5Z" fill="none" stroke="#a1a1aa" strokeWidth="0.7" opacity="0.45"/>
      <path d="M45,54 L51,67.5 L45,81 L39,67.5Z" fill="none" stroke="#d4d4d8" strokeWidth="0.4" opacity="0.35"/>
      <circle cx="45" cy="67.5" r="2" fill="#a1a1aa" opacity="0.35"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#ob-vig)"/>
    </svg>
  );
}

/** Watercolor — soft washes of pink/lavender/blue with ink brushstroke border */
function WatercolorSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <radialGradient id="wc-1" cx="25%" cy="28%" r="60%">
          <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#f9a8d4" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="wc-2" cx="75%" cy="62%" r="55%">
          <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="wc-3" cx="50%" cy="82%" r="50%">
          <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0"/>
        </radialGradient>
        <filter id="wc-blur">
          <feGaussianBlur stdDeviation="2"/>
        </filter>
        <radialGradient id="wc-vig" cx="50%" cy="45%" r="78%">
          <stop offset="65%" stopColor="#4c1d95" stopOpacity="0"/>
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.16"/>
        </radialGradient>
      </defs>
      <rect width="90" height="135" fill="#f8f0fc"/>
      <rect width="90" height="135" fill="url(#wc-1)"/>
      <rect width="90" height="135" fill="url(#wc-2)"/>
      <rect width="90" height="135" fill="url(#wc-3)"/>
      {/* Soft wash blobs */}
      <ellipse cx="30" cy="39.4" rx="28" ry="20" fill="#f9a8d4" opacity="0.2" filter="url(#wc-blur)"/>
      <ellipse cx="65" cy="84.4" rx="25" ry="18" fill="#93c5fd" opacity="0.2" filter="url(#wc-blur)"/>
      {/* Ink brushstroke border — slightly wobbly */}
      <path d="M8,9 Q45,6.75 82,9 Q84,67.5 82,126 Q45,128.25 8,126 Q6,67.5 8,9Z" fill="none" stroke="#6d28d9" strokeWidth="1.2" opacity="0.25" strokeLinejoin="round"/>
      {/* Loose watercolor flower */}
      <circle cx="45" cy="56.25" r="5" fill="#f9a8d4" opacity="0.5"/>
      <ellipse cx="45" cy="47.25" rx="3.5" ry="5" fill="#fbcfe8" opacity="0.55" transform="rotate(0 45 56.25)"/>
      <ellipse cx="45" cy="47.25" rx="3.5" ry="5" fill="#ddd6fe" opacity="0.5" transform="rotate(60 45 56.25)"/>
      <ellipse cx="45" cy="47.25" rx="3.5" ry="5" fill="#bfdbfe" opacity="0.5" transform="rotate(120 45 56.25)"/>
      <ellipse cx="45" cy="47.25" rx="3.5" ry="5" fill="#fbcfe8" opacity="0.45" transform="rotate(180 45 56.25)"/>
      <ellipse cx="45" cy="47.25" rx="3.5" ry="5" fill="#ddd6fe" opacity="0.45" transform="rotate(240 45 56.25)"/>
      <ellipse cx="45" cy="47.25" rx="3.5" ry="5" fill="#bfdbfe" opacity="0.45" transform="rotate(300 45 56.25)"/>
      <circle cx="45" cy="56.25" r="3" fill="#f0abfc" opacity="0.7"/>
      {/* Ink stem */}
      <path d="M45,61.875 Q48,73.125 44,84.375" stroke="#6d28d9" strokeWidth="0.7" fill="none" opacity="0.35"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#wc-vig)"/>
    </svg>
  );
}

/** Crimson Velvet — deep red with damask diamond weave pattern */
function CrimsonVelvetSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="cv-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8f2222"/>
          <stop offset="50%" stopColor="#450a0a"/>
          <stop offset="100%" stopColor="#180404"/>
        </linearGradient>
        <pattern id="cv-damask" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M9,1 L17,9 L9,17 L1,9Z" fill="none" stroke="#b91c1c" strokeWidth="0.5" opacity="0.5"/>
          <circle cx="9" cy="9" r="1.5" fill="none" stroke="#b91c1c" strokeWidth="0.4" opacity="0.4"/>
          <path d="M9,5 L13,9 L9,13 L5,9Z" fill="none" stroke="#ef4444" strokeWidth="0.3" opacity="0.3"/>
        </pattern>
        <linearGradient id="cv-sheen" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12"/>
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.02"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22"/>
        </linearGradient>
        <radialGradient id="cv-vig" cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4"/>
        </radialGradient>
      </defs>
      <rect width="90" height="135" fill="url(#cv-bg)"/>
      <rect width="90" height="135" fill="url(#cv-damask)"/>
      <rect width="90" height="135" fill="url(#cv-sheen)"/>
      {/* Spine */}
      <line x1="8" y1="4.5" x2="8" y2="130.5" stroke="#fca5a5" strokeWidth="0.6" opacity="0.3"/>
      {/* Gold border */}
      <rect x="5" y="5.6" width="80" height="123.75" rx="1" fill="none" stroke="#fca5a5" strokeWidth="0.7" opacity="0.4"/>
      {/* Corner roses */}
      {[[10,11.25],[80,11.25],[10,123.75],[80,123.75]].map(([cx,cy],i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="3.5" fill="none" stroke="#fca5a5" strokeWidth="0.6" opacity="0.5"/>
          <circle cx={cx} cy={cy} r="1.5" fill="#fca5a5" opacity="0.4"/>
        </g>
      ))}
      {/* Center crest */}
      <path d="M45,42.75 C40,47.25 37,56.25 40,65.25 C43,73.125 47,75.375 45,81 C43,75.375 37,73.125 40,65.25 C43,56.25 40,47.25 45,42.75Z" fill="none" stroke="#fca5a5" strokeWidth="0.7" opacity="0.4"/>
      <path d="M45,42.75 C50,47.25 53,56.25 50,65.25 C47,73.125 43,75.375 45,81 C47,75.375 53,73.125 50,65.25 C53,56.25 50,47.25 45,42.75Z" fill="none" stroke="#fca5a5" strokeWidth="0.7" opacity="0.4"/>
      <circle cx="45" cy="61.875" r="2.5" fill="none" stroke="#fca5a5" strokeWidth="0.6" opacity="0.5"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#cv-vig)"/>
    </svg>
  );
}

/** Golden Hour — warm sunset gradient with abstract sun rays */
function GoldenHourSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="gh-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#92400e"/>
          <stop offset="35%" stopColor="#d97706"/>
          <stop offset="65%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#fcd34d"/>
        </linearGradient>
        <radialGradient id="gh-sun" cx="50%" cy="50%" r="35%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="gh-vig" cx="50%" cy="42%" r="78%">
          <stop offset="60%" stopColor="#1c0a00" stopOpacity="0"/>
          <stop offset="100%" stopColor="#1c0a00" stopOpacity="0.3"/>
        </radialGradient>
      </defs>
      <rect width="90" height="135" fill="url(#gh-bg)"/>
      <rect width="90" height="135" fill="url(#gh-sun)"/>
      {/* Sun rays */}
      {Array.from({length:12},(_,i) => {
        const angle = (i*30)*Math.PI/180;
        const x1 = 45+18*Math.cos(angle), y1 = 67.5+18*Math.sin(angle);
        const x2 = 45+40*Math.cos(angle), y2 = 67.5+40*Math.sin(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fef3c7" strokeWidth="0.5" opacity="0.25"/>;
      })}
      {/* Sun circle */}
      <circle cx="45" cy="67.5" r="14" fill="none" stroke="#fef3c7" strokeWidth="0.8" opacity="0.4"/>
      <circle cx="45" cy="67.5" r="8" fill="#fef3c7" opacity="0.3"/>
      {/* Horizon silhouette */}
      <path d="M0,101.25 Q15,92.25 25,99 Q35,90 45,95.625 Q55,87.75 65,94.5 Q75,90 90,96.75 L90,135 L0,135Z" fill="#78350f" opacity="0.5"/>
      {/* Border */}
      <rect x="5" y="5.6" width="80" height="123.75" rx="2" fill="none" stroke="#fde68a" strokeWidth="0.6" opacity="0.4"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#gh-vig)"/>
    </svg>
  );
}

/** Arctic Marble — white/grey veined marble */
function ArcticMarbleSVG() {
  return (
    <svg viewBox="0 0 90 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="am-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1f5f9"/>
          <stop offset="50%" stopColor="#e2e8f0"/>
          <stop offset="100%" stopColor="#c3cede"/>
        </linearGradient>
        <linearGradient id="am-vein1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0"/>
          <stop offset="40%" stopColor="#64748b" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#475569" stopOpacity="0"/>
        </linearGradient>
        <radialGradient id="am-vig" cx="50%" cy="45%" r="78%">
          <stop offset="65%" stopColor="#1e293b" stopOpacity="0"/>
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.18"/>
        </radialGradient>
      </defs>
      <rect width="90" height="135" fill="url(#am-bg)"/>
      {/* Marble veins */}
      <path d="M10,5.6 Q25,33.75 18,61.875 Q12,90 28,112.5 Q35,126 45,132.75" fill="none" stroke="#94a3b8" strokeWidth="1.5" opacity="0.35"/>
      <path d="M10,5.6 Q26,34.875 19,63 Q13,91.125 29,113.625" fill="none" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.5"/>
      <path d="M50,2.25 Q60,28.125 55,56.25 Q48,84.375 58,112.5 Q65,126 70,132.75" fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.25"/>
      <path d="M70,0 Q65,22.5 72,50.625 Q78,73.125 68,101.25 Q62,121.5 58,135" fill="none" stroke="#475569" strokeWidth="0.7" opacity="0.2"/>
      <path d="M0,45 Q20,42.75 35,50.625 Q55,58.5 75,49.5 Q85,47.25 90,42.75" fill="none" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3"/>
      <path d="M0,90 Q15,84.375 30,92.25 Q50,99 65,87.75 Q80,78.75 90,84.375" fill="none" stroke="#64748b" strokeWidth="0.5" opacity="0.2"/>
      {/* Highlight overlay */}
      <rect x="0" y="0" width="45" height="135" fill="white" opacity="0.06"/>
      {/* Gold border */}
      <rect x="5" y="5.6" width="80" height="123.75" rx="2" fill="none" stroke="#94a3b8" strokeWidth="0.7"/>
      {/* Premium vignette */}
      <rect width="90" height="135" fill="url(#am-vig)"/>
    </svg>
  );
}

// ─── SVG map: template id → render function ─────────────────────────────────

export const COVER_SVG_MAP: Record<string, React.FC> = {
  'dark-leather': DarkLeatherSVG,
  'forest-green': ForestGreenSVG,
  'midnight-blue': MidnightBlueSVG,
  'parchment': ParchmentSVG,
  'obsidian': ObsidianSVG,
  'watercolor': WatercolorSVG,
  'crimson-velvet': CrimsonVelvetSVG,
  'golden-hour': GoldenHourSVG,
  'arctic-marble': ArcticMarbleSVG,
};

// ─── Template definitions ───────────────────────────────────────────────────

export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: 'dark-leather',
    label: 'Dark Leather',
    style: { background: 'linear-gradient(160deg,#3a2410 0%,#1e1208 100%)', border: '2px solid #c19a6b44' },
    titlePos: 'center',
    titleColor: '#d4af37',
  },
  {
    id: 'forest-green',
    label: 'Forest Green',
    style: { background: 'linear-gradient(160deg,#1a3a2e 0%,#0d2218 100%)', border: '2px solid #4ade8044' },
    titlePos: 'center',
    titleColor: '#86efac',
  },
  {
    id: 'midnight-blue',
    label: 'Midnight Blue',
    style: { background: 'linear-gradient(160deg,#0f1f3d 0%,#060e20 100%)', border: '2px solid #6366f144' },
    titlePos: 'center',
    titleColor: '#c7d2fe',
  },
  {
    id: 'parchment',
    label: 'Parchment',
    style: { background: 'linear-gradient(160deg,#f4e8d8 0%,#e3d3ba 100%)', border: '2px solid #c19a6b44' },
    titlePos: 'center',
    titleColor: '#3e2200',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    style: { background: 'linear-gradient(160deg,#18181b 0%,#09090b 100%)', border: '2px solid #a1a1aa44' },
    titlePos: 'center',
    titleColor: '#d4d4d8',
  },
  {
    id: 'watercolor',
    label: 'Watercolor',
    style: { background: 'radial-gradient(ellipse at 30% 40%,#c7d2fe 0%,#fbcfe8 50%,#bfdbfe 100%)', border: '2px solid #818cf844' },
    titlePos: 'center',
    titleColor: '#4c1d95',
  },
  {
    id: 'crimson-velvet',
    label: 'Crimson Velvet',
    style: { background: 'linear-gradient(160deg,#7f1d1d 0%,#1c0505 100%)', border: '2px solid #fca5a544' },
    titlePos: 'center',
    titleColor: '#fca5a5',
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    style: { background: 'linear-gradient(180deg,#92400e 0%,#f59e0b 60%,#fcd34d 100%)', border: '2px solid #fde68a44' },
    titlePos: 'top',
    titleColor: '#1c0a00',
  },
  {
    id: 'arctic-marble',
    label: 'Arctic Marble',
    style: { background: 'linear-gradient(160deg,#f1f5f9 0%,#cbd5e1 100%)', border: '2px solid #94a3b844' },
    titlePos: 'center',
    titleColor: '#1e293b',
  },
];

// ─── Preset themes ──────────────────────────────────────────────────────────
// Each preset ships with its OWN complete look: cover typography/colors AND
// interior book style. Selecting a preset applies ALL of this at once so the
// cover and pages are always visually coherent.

export const PRESET_THEMES: Record<string, PresetTheme> = {
  'dark-leather': {
    coverStyle: {
      titleFont:          "Cinzel, 'Trajan Pro', 'Times New Roman', serif",
      titleSize:          30,
      titleColor:         '#d4af37',
      titleWeight:        800,
      titleAlign:         'center',
      titleShadow:        true,
      titleItalic:        false,
      titlePosition:      'center',
      titleTransform:     'uppercase',
      titleLetterSpacing: 0.06,
      subtitleColor:      'rgba(244,232,216,0.7)',
      subtitleFont:       "Georgia, 'Times New Roman', serif",
      subtitleSize:       11,
      authorColor:        'rgba(244,232,216,0.5)',
      authorFont:         "Georgia, 'Times New Roman', serif",
      authorSize:         10,
      showBorder:         true,
      borderColor:        'rgba(212,175,55,0.5)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#d4af37',
      showEmblem:         true,
      overlayOpacity:     0.3,
    },
    bookStyle: { theme: 'parchment', font: 'book', fontSize: 'md' },
  },

  'forest-green': {
    coverStyle: {
      titleFont:          "Baskerville, Garamond, 'Palatino Linotype', serif",
      titleSize:          28,
      titleColor:         '#86efac',
      titleWeight:        700,
      titleAlign:         'center',
      titleShadow:        true,
      titleItalic:        false,
      titlePosition:      'center',
      titleTransform:     'none',
      titleLetterSpacing: 0.02,
      subtitleColor:      'rgba(134,239,172,0.65)',
      subtitleFont:       "Baskerville, Garamond, 'Palatino Linotype', serif",
      subtitleSize:       11,
      authorColor:        'rgba(134,239,172,0.45)',
      authorFont:         "Baskerville, Garamond, 'Palatino Linotype', serif",
      authorSize:         10,
      showBorder:         true,
      borderColor:        'rgba(74,222,128,0.35)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#4ade80',
      showEmblem:         true,
      overlayOpacity:     0.25,
    },
    bookStyle: { theme: 'emerald', font: 'book', fontSize: 'md' },
  },

  'midnight-blue': {
    coverStyle: {
      titleFont:          "'Playfair Display', 'IM Fell English', 'Times New Roman', serif",
      titleSize:          27,
      titleColor:         '#c7d2fe',
      titleWeight:        700,
      titleAlign:         'center',
      titleShadow:        true,
      titleItalic:        true,
      titlePosition:      'center',
      titleTransform:     'none',
      titleLetterSpacing: 0.03,
      subtitleColor:      'rgba(165,180,252,0.65)',
      subtitleFont:       "Georgia, 'Times New Roman', serif",
      subtitleSize:       11,
      authorColor:        'rgba(165,180,252,0.4)',
      authorFont:         "Georgia, 'Times New Roman', serif",
      authorSize:         10,
      showBorder:         true,
      borderColor:        'rgba(99,102,241,0.45)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#6366f1',
      showEmblem:         false,
      overlayOpacity:     0.2,
    },
    bookStyle: { theme: 'midnight', font: 'serif', fontSize: 'md' },
  },

  'parchment': {
    coverStyle: {
      titleFont:          "Georgia, 'Times New Roman', serif",
      titleSize:          29,
      titleColor:         '#3e2200',
      titleWeight:        800,
      titleAlign:         'center',
      titleShadow:        false,
      titleItalic:        false,
      titlePosition:      'center',
      titleTransform:     'none',
      titleLetterSpacing: 0.01,
      subtitleColor:      'rgba(62,34,0,0.65)',
      subtitleFont:       "Georgia, 'Times New Roman', serif",
      subtitleSize:       11,
      authorColor:        'rgba(62,34,0,0.5)',
      authorFont:         "Georgia, 'Times New Roman', serif",
      authorSize:         10,
      showBorder:         true,
      borderColor:        'rgba(122,92,42,0.6)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#7a5c2a',
      showEmblem:         true,
      overlayOpacity:     0.15,
    },
    bookStyle: { theme: 'parchment', font: 'serif', fontSize: 'md' },
  },

  'obsidian': {
    coverStyle: {
      titleFont:          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      titleSize:          26,
      titleColor:         '#d4d4d8',
      titleWeight:        600,
      titleAlign:         'center',
      titleShadow:        true,
      titleItalic:        false,
      titlePosition:      'center',
      titleTransform:     'uppercase',
      titleLetterSpacing: 0.1,
      subtitleColor:      'rgba(212,212,216,0.55)',
      subtitleFont:       "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      subtitleSize:       10,
      authorColor:        'rgba(212,212,216,0.4)',
      authorFont:         "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      authorSize:         9,
      showBorder:         true,
      borderColor:        'rgba(161,161,170,0.3)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#71717a',
      showEmblem:         false,
      overlayOpacity:     0.2,
    },
    bookStyle: { theme: 'midnight', font: 'sans', fontSize: 'sm' },
  },

  'watercolor': {
    coverStyle: {
      titleFont:          "'Caveat', 'Comic Sans MS', cursive",
      titleSize:          32,
      titleColor:         '#4c1d95',
      titleWeight:        700,
      titleAlign:         'center',
      titleShadow:        false,
      titleItalic:        false,
      titlePosition:      'center',
      titleTransform:     'none',
      titleLetterSpacing: 0.01,
      subtitleColor:      'rgba(76,29,149,0.6)',
      subtitleFont:       "'Caveat', 'Comic Sans MS', cursive",
      subtitleSize:       13,
      authorColor:        'rgba(76,29,149,0.45)',
      authorFont:         "'Caveat', 'Comic Sans MS', cursive",
      authorSize:         11,
      showBorder:         false,
      borderColor:        'rgba(129,140,248,0.3)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#a78bfa',
      showEmblem:         true,
      overlayOpacity:     0.1,
    },
    bookStyle: { theme: 'paper', font: 'script', fontSize: 'lg' },
  },

  'crimson-velvet': {
    coverStyle: {
      titleFont:          "Cinzel, 'Trajan Pro', 'Times New Roman', serif",
      titleSize:          27,
      titleColor:         '#fca5a5',
      titleWeight:        700,
      titleAlign:         'center',
      titleShadow:        true,
      titleItalic:        false,
      titlePosition:      'center',
      titleTransform:     'uppercase',
      titleLetterSpacing: 0.08,
      subtitleColor:      'rgba(252,165,165,0.6)',
      subtitleFont:       "Georgia, 'Times New Roman', serif",
      subtitleSize:       11,
      authorColor:        'rgba(252,165,165,0.45)',
      authorFont:         "Georgia, 'Times New Roman', serif",
      authorSize:         10,
      showBorder:         true,
      borderColor:        'rgba(252,165,165,0.35)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#f87171',
      showEmblem:         false,
      overlayOpacity:     0.25,
    },
    bookStyle: { theme: 'sepia', font: 'book', fontSize: 'md' },
  },

  'golden-hour': {
    coverStyle: {
      titleFont:          "Baskerville, Garamond, 'Palatino Linotype', serif",
      titleSize:          28,
      titleColor:         '#1c0a00',
      titleWeight:        800,
      titleAlign:         'center',
      titleShadow:        false,
      titleItalic:        false,
      titlePosition:      'top',
      titleTransform:     'none',
      titleLetterSpacing: 0.02,
      subtitleColor:      'rgba(28,10,0,0.6)',
      subtitleFont:       "Georgia, 'Times New Roman', serif",
      subtitleSize:       11,
      authorColor:        'rgba(28,10,0,0.45)',
      authorFont:         "Georgia, 'Times New Roman', serif",
      authorSize:         10,
      showBorder:         true,
      borderColor:        'rgba(253,230,138,0.6)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#f59e0b',
      showEmblem:         true,
      overlayOpacity:     0.1,
    },
    bookStyle: { theme: 'sepia', font: 'serif', fontSize: 'md' },
  },

  'arctic-marble': {
    coverStyle: {
      titleFont:          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      titleSize:          24,
      titleColor:         '#1e293b',
      titleWeight:        600,
      titleAlign:         'center',
      titleShadow:        false,
      titleItalic:        false,
      titlePosition:      'center',
      titleTransform:     'uppercase',
      titleLetterSpacing: 0.12,
      subtitleColor:      'rgba(30,41,59,0.55)',
      subtitleFont:       "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      subtitleSize:       10,
      authorColor:        'rgba(30,41,59,0.4)',
      authorFont:         "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      authorSize:         9,
      showBorder:         true,
      borderColor:        'rgba(148,163,184,0.5)',
      borderWidth:        1,
      borderStyle:        'solid',
      dividerColor:       '#94a3b8',
      showEmblem:         false,
      overlayOpacity:     0.08,
    },
    bookStyle: { theme: 'paper', font: 'sans', fontSize: 'sm' },
  },
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BookCoverPickerModalProps {
  note: NoteDTO;
  /** Optional live title — keeps the preview in sync with in-progress edits. */
  liveTitle?: string;
  /** Optional live date label — keeps the preview in sync with the real cover. */
  liveDateLabel?: string;
  selectedTemplateId: string | null;
  currentCoverUrl: string | null;
  coverStyle: CoverStyle;
  /**
   * Called when the user saves a preset selection.
   * Receives the full theme so the parent can apply cover style AND interior
   * book style (theme/font/fontSize) in one shot.
   */
  onSelectPreset: (templateId: string, preset: PresetTheme) => void;
  onUploadCover: (
    processed: import('../../lib/coverImageProcessor').CoverProcessResult,
  ) => Promise<NoteDTO | void>;
  onRemoveCover: () => Promise<void>;
  onStyleChange: (style: CoverStyle) => void;
  onClose: () => void;
}

// ─── Template thumbnail ──────────────────────────────────────────────────────

function TemplateThumbnail({
  template,
  title,
  dateLabel,
  isSelected,
  onClick,
}: {
  template: CoverTemplate;
  title: string;
  dateLabel: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  // Thumbnails render ONLY the preset's own cover style so each card looks
  // distinct. The user's manual text-style tweaks are shown in the live
  // preview panel on the left, not baked into every thumbnail.
  const preset = PRESET_THEMES[template.id];
  const thumbnailStyle: CoverStyle = preset ? (preset.coverStyle as CoverStyle) : {};

  return (
    <button
      className={`bcp-thumb ${isSelected ? 'is-selected' : ''}`}
      onClick={onClick}
      aria-label={`Select cover: ${template.label}`}
      aria-pressed={isSelected}
      type="button"
    >
      <CoverPreview
        title={title || 'My Journal'}
        dateLabel={dateLabel}
        coverUrl={null}
        templateId={template.id}
        coverStyle={thumbnailStyle}
        width={150}
      />
      <span className="bcp-thumb-label">{template.label}</span>
      {isSelected && (
        <span className="bcp-thumb-check" aria-hidden="true">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

type PickerTab = 'templates' | 'my-covers' | 'text-style';

export function BookCoverPickerModal({
  note,
  liveTitle,
  liveDateLabel,
  selectedTemplateId,
  currentCoverUrl,
  coverStyle,
  onSelectPreset,
  onUploadCover,
  onRemoveCover,
  onStyleChange,
  onClose,
}: BookCoverPickerModalProps) {
  const [tab, setTab] = useState<PickerTab>(currentCoverUrl ? 'my-covers' : 'templates');

  // ── Draft state — nothing reaches the parent until Save is clicked ──────────
  const [draftTemplateId, setDraftTemplateId] = useState<string | null>(selectedTemplateId);
  const [draftStyle, setDraftStyle] = useState<CoverStyle>(coverStyle ?? {});
  // Whether the user removed the current photo in this draft session
  const [draftCoverRemoved, setDraftCoverRemoved] = useState(false);

  // ── Upload / file state ─────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Object URL for immediate preview before Save
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  // Processed result held until Save confirms the upload
  const pendingUploadRef = useRef<import('../../lib/coverImageProcessor').CoverProcessResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Save state ──────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);

  const bookTitle =
    liveTitle ?? note.title ?? (note.isJournal ? 'Daily Reflections' : 'My Notebook');

  const dateLabel =
    liveDateLabel ??
    new Date(note.updatedAt ?? Date.now()).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // ── Derived preview values ──────────────────────────────────────────────────
  const previewCoverUrl = draftCoverRemoved ? null : (previewUrl ?? currentCoverUrl);
  const previewTemplateId = previewCoverUrl ? null : draftTemplateId;

  // For the preview panel, merge the active preset's cover style with any
  // manual text-style tweaks so the preview is always honest.
  const previewCoverStyle = previewTemplateId
    ? { ...(PRESET_THEMES[previewTemplateId]?.coverStyle ?? {}), ...draftStyle }
    : draftStyle;

  // Single preview element — works for all three tabs.
  // Uses LiveBookCoverPreview which renders the exact same DOM as the real
  // cover in AppleBookJournalModal, so every change is immediately visible.
  const previewEl = (
    <CoverPreview
      title={bookTitle}
      dateLabel={dateLabel}
      coverUrl={previewCoverUrl}
      templateId={previewTemplateId}
      coverStyle={previewCoverStyle}
    />
  );

  // ── Dirty check ─────────────────────────────────────────────────────────────
  // Consider the picker dirty whenever the user has interacted with a template
  // (even if re-selecting the currently-cached one) so Save is never blocked.
  const [hasPickedTemplate, setHasPickedTemplate] = useState(false);
  const isDirty =
    hasPickedTemplate ||
    draftTemplateId !== selectedTemplateId ||
    draftCoverRemoved ||
    previewUrl !== null ||
    JSON.stringify(draftStyle) !== JSON.stringify(coverStyle ?? {});

  // ── Save — commit all draft changes to parent ───────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Commit preset selection — always fire onSelectPreset when a template is
      // set, regardless of whether the id changed. This ensures the cover
      // updates even when the user re-selects the same template that was already
      // cached (which would make draftTemplateId === selectedTemplateId and
      // previously caused the cover to silently skip the update).
      if (draftTemplateId) {
        const preset = PRESET_THEMES[draftTemplateId];
        onSelectPreset(
          draftTemplateId,
          preset ?? { coverStyle: {}, bookStyle: { theme: 'parchment', font: 'serif', fontSize: 'md' } },
        );
      }
      // Commit text style (manual tweaks from the Text Style tab)
      if (JSON.stringify(draftStyle) !== JSON.stringify(coverStyle ?? {})) {
        onStyleChange(draftStyle);
      }
      // Upload pending photo
      if (pendingUploadRef.current) {
        await onUploadCover(pendingUploadRef.current);
        pendingUploadRef.current = null;
      }
      // Remove cover if flagged (only when no new upload replaces it)
      if (draftCoverRemoved && !pendingUploadRef.current) {
        await onRemoveCover();
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [
    draftTemplateId, selectedTemplateId, draftStyle, coverStyle, draftCoverRemoved,
    onSelectPreset, onStyleChange, onUploadCover, onRemoveCover, onClose,
  ]);

  // ── File processing ─────────────────────────────────────────────────────────
  // Creates an object URL immediately for preview; stores the processed result
  // in pendingUploadRef. The actual upload happens on Save.
  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    setUploadState('processing');
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const objUrl = URL.createObjectURL(file);
    previewUrlRef.current = objUrl;
    setPreviewUrl(objUrl);
    setDraftCoverRemoved(false);
    setTab('my-covers');
    try {
      const processed = await processCoverImage(file);
      pendingUploadRef.current = processed;
      setUploadState('done');
    } catch (err) {
      URL.revokeObjectURL(objUrl);
      previewUrlRef.current = null;
      setPreviewUrl(null);
      pendingUploadRef.current = null;
      setUploadState('error');
      if (err instanceof CoverProcessError) setUploadError(err.message);
      else setUploadError('Upload failed. Please try again.');
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const isProcessing = uploadState === 'processing';

  // URL shown in the My Covers thumbnail (separate from preview panel)
  const displayedCoverUrl = draftCoverRemoved ? null : (previewUrl ?? currentCoverUrl);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="bcp-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Choose Your Cover"
    >
      <div className="bcp-panel">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="bcp-header">
          <h2 className="bcp-heading">Choose Your Cover</h2>
          <button className="bcp-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="bcp-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'templates'}
            className={`bcp-tab ${tab === 'templates' ? 'is-active' : ''}`}
            onClick={() => setTab('templates')}
          >
            Templates
          </button>
          <button
            role="tab"
            aria-selected={tab === 'my-covers'}
            className={`bcp-tab ${tab === 'my-covers' ? 'is-active' : ''}`}
            onClick={() => setTab('my-covers')}
          >
            My Covers
          </button>
          <button
            role="tab"
            aria-selected={tab === 'text-style'}
            className={`bcp-tab ${tab === 'text-style' ? 'is-active' : ''}`}
            onClick={() => setTab('text-style')}
          >
            <Type size={12} style={{ display: 'inline', marginRight: 4 }} />
            Text Style
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="bcp-body">

          {/* ── Templates tab ── */}
          {tab === 'templates' && (
            <div className="bcp-side-tab" role="tabpanel">
              <div className="bcp-tst-aside">
                <span className="bcp-live-preview-label">Preview</span>
                {previewEl}
              </div>
              <div className="bcp-side-scroll">
                <div className="bcp-templates-grid">
                  {COVER_TEMPLATES.map((tpl) => (
                    <TemplateThumbnail
                      key={tpl.id}
                      template={tpl}
                      title={bookTitle}
                      dateLabel={dateLabel}
                      isSelected={draftTemplateId === tpl.id && !previewCoverUrl}
                      onClick={() => {
                        setDraftTemplateId(tpl.id);
                        setHasPickedTemplate(true);
                        // Seed draftStyle with this preset's cover style so the
                        // preview panel updates immediately to show the full look.
                        // Preserve authorText so any custom text the user typed
                        // isn't wiped when switching presets.
                        const preset = PRESET_THEMES[tpl.id];
                        if (preset) {
                          setDraftStyle((prev) => ({
                            ...(preset.coverStyle as CoverStyle),
                            authorText: prev.authorText,
                          }));
                        }
                        if (previewUrlRef.current) {
                          URL.revokeObjectURL(previewUrlRef.current);
                          previewUrlRef.current = null;
                        }
                        setPreviewUrl(null);
                        pendingUploadRef.current = null;
                        setDraftCoverRemoved(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── My Covers tab ── */}
          {tab === 'my-covers' && (
            <div className="bcp-side-tab" role="tabpanel">
              <div className="bcp-tst-aside">
                <span className="bcp-live-preview-label">Preview</span>
                {previewEl}
              </div>
              <div className="bcp-my-covers">
                {displayedCoverUrl && (
                  <div className="bcp-current-cover">
                    <div className="bcp-current-cover-label">
                      {isProcessing ? 'Processing…' : 'Current cover'}
                    </div>
                    <div className="bcp-current-cover-preview">
                      <img
                        src={displayedCoverUrl}
                        alt="Current book cover"
                        className="bcp-current-cover-img"
                      />
                      <button
                        className="bcp-remove-cover-btn"
                        onClick={() => {
                          if (previewUrlRef.current) {
                            URL.revokeObjectURL(previewUrlRef.current);
                            previewUrlRef.current = null;
                          }
                          setPreviewUrl(null);
                          pendingUploadRef.current = null;
                          setUploadState('idle');
                          setDraftCoverRemoved(true);
                        }}
                        title="Remove cover"
                        type="button"
                        disabled={isProcessing}
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}

                <div
                  className={`bcp-upload-zone ${isDragging ? 'is-dragging' : ''} ${isProcessing ? 'is-loading' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload custom cover image"
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="sr-only"
                    onChange={handleFileInputChange}
                    disabled={isProcessing}
                    aria-hidden="true"
                  />
                  {isProcessing ? (
                    <>
                      <Loader2 size={28} className="bcp-upload-icon bcp-upload-icon--spin" />
                      <span className="bcp-upload-title">Processing image…</span>
                      <span className="bcp-upload-sub">Resizing · Converting · Compressing</span>
                    </>
                  ) : uploadState === 'done' ? (
                    <>
                      <Check size={28} className="bcp-upload-icon bcp-upload-icon--success" />
                      <span className="bcp-upload-title">Ready to save</span>
                      <span className="bcp-upload-sub">Click Save to apply this cover</span>
                    </>
                  ) : (
                    <>
                      <Upload size={28} className="bcp-upload-icon" />
                      <span className="bcp-upload-title">Upload Custom Cover</span>
                      <span className="bcp-upload-sub">JPG, PNG, WebP · up to 10 MB</span>
                    </>
                  )}
                </div>

                {uploadState === 'error' && uploadError && (
                  <div className="bcp-upload-error" role="alert">
                    <AlertCircle size={14} />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Text Style tab ── */}
          {tab === 'text-style' && (
            <div className="bcp-text-style-tab" role="tabpanel">
              <div className="bcp-tst-aside">
                <span className="bcp-live-preview-label">Preview</span>
                {previewEl}
              </div>
              <div className="bcp-tst-editor">
                <CoverTextEditor value={draftStyle} onChange={setDraftStyle} />
              </div>
            </div>
          )}

        </div>

        {/* ── Footer — Save / Cancel ────────────────────────────── */}
        <div className="bcp-footer">
          <span className="bcp-footer-tip-inline">
            <ImageIcon size={12} />
            <span>Portrait images (3:4) work best</span>
          </span>
          <div className="bcp-footer-actions">
            <button
              className="bcp-btn-cancel"
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              className="bcp-btn-save"
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving && (
                <Loader2
                  size={14}
                  style={{ display: 'inline', animation: 'spin 1s linear infinite' }}
                />
              )}
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}