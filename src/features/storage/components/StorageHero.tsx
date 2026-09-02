import React from 'react';
import { RefreshCw } from 'lucide-react';
import { formatBytes } from '../storageUtils';
import type { StorageSummaryDTO } from '../api';

interface StorageHeroProps {
  planName: string;
  totalCount: number;
  totalUsedBytes: number;
  summary?: StorageSummaryDTO;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onUploadClick: () => void;
  onOpenSidebar: () => void;
}

/* ── SVG icons — DO NOT MODIFY ─────────────────────────────────────────────── */
function StorageBoxSVG() {
  return (
    <svg width="114" height="89" viewBox="0 0 114 89" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="filePurple" x1="42" y1="18" x2="58" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B69AFF"/><stop offset="1" stopColor="#8164F5"/>
        </linearGradient>
        <linearGradient id="fileLight" x1="62" y1="28" x2="75" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E7E4FF"/><stop offset="1" stopColor="#C8C8F4"/>
        </linearGradient>
        <linearGradient id="boxTop" x1="25" y1="45" x2="87" y2="66" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7561F4"/><stop offset="1" stopColor="#9A86FF"/>
        </linearGradient>
        <linearGradient id="boxFront" x1="30" y1="53" x2="78" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6550E8"/><stop offset="1" stopColor="#5140D5"/>
        </linearGradient>
        <linearGradient id="boxSide" x1="77" y1="51" x2="91" y2="69" gradientUnits="userSpaceOnUse">
          <stop stopColor="#806CF3"/><stop offset="1" stopColor="#5D4BDD"/>
        </linearGradient>
        <filter id="heroShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
        <filter id="heroGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>
      </defs>
      <ellipse cx="57" cy="76" rx="34" ry="7" fill="#6B5AE8" opacity="0.13" filter="url(#heroShadow)"/>
      <path d="M39 24C39 21.8 40.8 20 43 20H55L62 27V48C62 50.2 60.2 52 58 52H43C40.8 52 39 50.2 39 48Z" fill="url(#filePurple)"/>
      <path d="M55 20V26C55 27.1 55.9 28 57 28H62" fill="#A589F9"/>
      <rect x="44" y="30" width="12" height="2.4" rx="1.2" fill="#8064E9" opacity="0.65"/>
      <rect x="44" y="35" width="14" height="2.4" rx="1.2" fill="#8064E9" opacity="0.55"/>
      <rect x="44" y="40" width="9" height="2.4" rx="1.2" fill="#8064E9" opacity="0.5"/>
      <path d="M30 34C30 32.3 31.3 31 33 31H43L48 36V51C48 52.7 46.7 54 45 54H33C31.3 54 30 52.7 30 51Z" fill="#C1A8FF"/>
      <path d="M34 34H42V39H34C32.9 39 32 38.1 32 37C32 35.3 32.9 34 34 34Z" fill="#D4C1FF" opacity="0.75"/>
      <path d="M61 31C61 29.3 62.3 28 64 28H73L79 34V51C79 52.7 77.7 54 76 54H64C62.3 54 61 52.7 61 51Z" fill="url(#fileLight)"/>
      <path d="M73 28V33C73 34.1 73.9 35 75 35H79" fill="#D0D0F0"/>
      <rect x="65" y="38" width="9" height="2" rx="1" fill="#A7A7D8"/>
      <rect x="65" y="43" width="11" height="2" rx="1" fill="#A7A7D8"/>
      <rect x="65" y="48" width="7" height="2" rx="1" fill="#A7A7D8"/>
      <path d="M23 45L48 39L91 50L69 61L23 52Z" fill="url(#boxTop)"/>
      <path d="M29 45.8L48 42L83 51L68 57Z" fill="#5745DB" opacity="0.72"/>
      <path d="M29 46L48 42L52 44L33 49Z" fill="#8874FA" opacity="0.7"/>
      <path d="M23 51L69 60L69 77C69 79 67.2 80.2 65.4 79.7L27 70.8C24.7 70.3 23 68.3 23 66Z" fill="url(#boxFront)"/>
      <path d="M69 60L91 50V64C91 66.2 89.7 68.1 87.7 69L69 77Z" fill="url(#boxSide)"/>
      <path d="M23 51L69 60L69 65L23 56Z" fill="#715CEF" opacity="0.9"/>
      <path d="M28 58L64 65" stroke="#8674F6" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <path d="M73 63L86 57" stroke="#9888FF" strokeWidth="1.4" strokeLinecap="round" opacity="0.45"/>
      <ellipse cx="54" cy="43" rx="27" ry="7" fill="#B0A2FF" opacity="0.12" filter="url(#heroGlow)"/>
    </svg>
  );
}

function UploadSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ImageCardSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#EFF6FF" />
      <rect x="6" y="10" width="20" height="14" rx="2.5" stroke="#3B82F6" strokeWidth="1.5" fill="none" />
      <path d="M6 19l5-5 4 4 3-3 6 6" stroke="#3B82F6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="15" r="1.5" fill="#3B82F6" />
    </svg>
  );
}

function DocCardSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#FEF3C7" />
      <rect x="9" y="7" width="14" height="18" rx="2.5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="12" y1="12" x2="20" y2="12" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="15.5" x2="20" y2="15.5" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="19" x2="17" y2="19" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function AudioCardSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#ECFDF5" />
      <rect x="7" y="18" width="3" height="6" rx="1.5" fill="#10B981" />
      <rect x="12" y="13" width="3" height="11" rx="1.5" fill="#10B981" />
      <rect x="17" y="16" width="3" height="8" rx="1.5" fill="#10B981" />
      <rect x="22" y="19" width="3" height="4" rx="1.5" fill="#10B981" />
    </svg>
  );
}

function KeepFilesSVG() {
  return (
    <svg width="143" height="163" viewBox="0 0 143 163" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="folderFront" x1="53" y1="91" x2="91" y2="124" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A994FF"/><stop offset="1" stopColor="#7359E8"/>
        </linearGradient>
        <linearGradient id="folderTop" x1="48" y1="81" x2="92" y2="103" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C2B4FF"/><stop offset="1" stopColor="#9480F5"/>
        </linearGradient>
        <linearGradient id="folderSide" x1="91" y1="91" x2="112" y2="117" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9581F5"/><stop offset="1" stopColor="#6B52DF"/>
        </linearGradient>
        <linearGradient id="backFolder" x1="62" y1="72" x2="93" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C8B9FF"/><stop offset="1" stopColor="#8E78F1"/>
        </linearGradient>
        <linearGradient id="diamond" x1="108" y1="54" x2="121" y2="67" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E9E6FF"/><stop offset="1" stopColor="#C7C4F2"/>
        </linearGradient>
        <linearGradient id="paper" x1="60" y1="50" x2="70" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE8D2"/><stop offset="1" stopColor="#FFD3A9"/>
        </linearGradient>
        <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
        <filter id="folderShadow" x="-50%" y="-50%" width="200%" height="250%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>
      </defs>
      <ellipse cx="78" cy="111" rx="38" ry="20" fill="#9B89FF" opacity="0.12" filter="url(#softGlow)"/>
      <circle cx="51" cy="62" r="1.5" fill="#D9D3FF" opacity="0.7"/>
      <circle cx="95" cy="73" r="1.5" fill="#DDD8FF" opacity="0.6"/>
      <circle cx="105" cy="91" r="1" fill="#D8D2FF"/>
      <circle cx="46" cy="90" r="1" fill="#E1DDFF"/>
      <g transform="rotate(-17 66 56)">
        <path d="M58 51C58 49.9 58.9 49 60 49H67L71 53V61C71 62.1 70.1 63 69 63H60C58.9 63 58 62.1 58 61Z" fill="url(#paper)" opacity="0.9"/>
        <path d="M67 49V52.5C67 53.3 67.7 54 68.5 54H71" fill="#FFDDBE"/>
        <path d="M61 56H67" stroke="#F5BE8B" strokeWidth="1.4" strokeLinecap="round" opacity="0.75"/>
      </g>
      <g transform="rotate(45 116 59)">
        <rect x="108" y="51" width="16" height="16" rx="3" fill="url(#diamond)"/>
        <rect x="111" y="54" width="10" height="10" rx="1.5" fill="#F7F6FF" opacity="0.9"/>
      </g>
      <path d="M61 76C61 73.8 62.8 72 65 72H79L84 77H94C96.2 77 98 78.8 98 81V101H61Z" fill="url(#backFolder)" opacity="0.9"/>
      <path d="M66 77H80L84 81H94" stroke="#CFC4FF" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
      <ellipse cx="78" cy="125" rx="31" ry="7" fill="#6553D9" opacity="0.14" filter="url(#folderShadow)"/>
      <path d="M42 89C42 86.8 43.8 85 46 85H62L68 90H96C98.2 90 100 91.8 100 94V101H42Z" fill="url(#folderTop)"/>
      <path d="M46 91H65L70 95H96C98 95 100 96.5 100 98.5V103H46Z" fill="#806AE8" opacity="0.55"/>
      <path d="M42 98C42 95.8 43.8 94 46 94H97C99.2 94 101 95.8 101 98V116C101 119.1 98.7 121.7 95.6 122.1L54 127C47.4 127.8 42 122.7 42 116Z" fill="url(#folderFront)"/>
      <path d="M101 98L112 91V109C112 112.2 110.1 115.1 107.1 116.2L96 121C99 119.8 101 117.1 101 114Z" fill="url(#folderSide)"/>
      <path d="M42 98C42 95.8 43.8 94 46 94H97C99.2 94 101 95.8 101 98V103H42Z" fill="#9A87F6" opacity="0.9"/>
      <path d="M49 105H87" stroke="#B8A9FF" strokeWidth="2" strokeLinecap="round" opacity="0.28"/>
      <path d="M49 91H63L67 95H49Z" fill="#B8A8FF" opacity="0.65"/>
      <path d="M51 119C58 121 72 121 82 119" stroke="#A99AFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
    </svg>
  );
}

function DonutChart({ pct }: { pct: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#EEF2FF" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke="#4F46E5" strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[14px] font-black" style={{ color: '#1E1B4B' }}>{pct}%</span>
        <span className="text-[10px] font-medium mt-0.5" style={{ color: '#74788D' }}>Used</span>
      </div>
    </div>
  );
}
/* ── END SVG ────────────────────────────────────────────────────────────────── */

export function StorageHero({
  totalUsedBytes,
  summary,
  isLoading,
  isRefetching,
  onRefresh,
  onUploadClick,
}: StorageHeroProps) {
  const imgCount = (summary?.byType.image?.count ?? 0) + (summary?.byType.video?.count ?? 0);
  const imgBytes = (summary?.byType.image?.bytes ?? 0) + (summary?.byType.video?.bytes ?? 0);
  const docCount = summary?.byType.document?.count ?? 0;
  const docBytes = summary?.byType.document?.bytes ?? 0;
  const audioCount = summary?.byType.audio?.count ?? 0;
  const audioBytes = summary?.byType.audio?.bytes ?? 0;

  const limitBytes = summary?.storageLimitBytes ?? 1048576;
  const pct = limitBytes > 0 ? Math.min(100, Math.round((totalUsedBytes / limitBytes) * 100)) : 0;
  const barW = limitBytes > 0 ? Math.min(100, (totalUsedBytes / limitBytes) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── DESKTOP HEADER (lg+) ── */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width: 80, height: 'auto', flexShrink: 0 }}>
            <StorageBoxSVG />
          </div>
          <div>
            <h1 className="text-[22px] ml-4 font-bold leading-tight" style={{ color: '#1E1B4B' }}>
              Storage &amp; Assets
            </h1>
            <p className="text-[13px] ml-4 mt-0.5" style={{ color: '#74788D' }}>
              Manage, organize and access all your files in one place.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: '#4F46E5' }}
          >
            <UploadSVG />
            Upload File
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[13px] font-medium transition-colors hover:bg-[#F8F9FA]"
            style={{ borderColor: '#E2E8F0', color: '#495057', backgroundColor: '#fff' }}
          >
            <RefreshCw size={14} className={isLoading || isRefetching ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── MOBILE HEADER (< lg) ── */}
      <div className="flex lg:hidden items-center justify-between gap-3 pt-1">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center text-[#1E1B4B] shadow-xs active:scale-95 transition-transform shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center min-w-0 flex-1">
          <h1 className="text-[19px] font-extrabold leading-tight truncate" style={{ color: '#1E1B4B' }}>
            Storage &amp; Assets
          </h1>
          <p className="text-[12px] font-medium mt-0.5 truncate" style={{ color: '#74788D' }}>
            Manage, organize and access your files
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onUploadClick}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform"
            style={{ backgroundColor: '#4F46E5' }}
            title="Upload File"
          >
            <UploadSVG />
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading || isRefetching}
            className="w-10 h-10 rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center text-[#495057] shadow-xs active:scale-95 transition-transform"
            title="Refresh"
          >
            <RefreshCw size={16} className={isLoading || isRefetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── MOBILE LARGE STORAGE HERO CARD (< lg) ── */}
      <div
        className="flex lg:hidden items-center justify-between p-5 rounded-3xl border border-[#E2E8F0] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FAF8FF 0%, #F5F3FF 50%, #EEF2FF 100%)' }}
      >
        <div className="flex flex-col z-10 min-w-0">
          <span className="text-[13px] font-semibold" style={{ color: '#74788D' }}>
            Storage Used
          </span>
          <span className="text-[34px] font-black leading-tight my-1" style={{ color: '#4F46E5' }}>
            {pct}%
          </span>
          <span className="text-[12px] font-medium mb-3" style={{ color: '#74788D' }}>
            {formatBytes(totalUsedBytes)} of {formatBytes(limitBytes)}
          </span>
          <div className="h-2 w-44 max-w-[190px] rounded-full overflow-hidden" style={{ backgroundColor: '#E0E7FF' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${barW}%`, background: 'linear-gradient(90deg, #4F46E5, #818CF8)' }}
            />
          </div>
        </div>
        <div className="shrink-0 pointer-events-none flex items-center justify-center">
          <StorageBoxSVG />
        </div>
      </div>

      {/* ── STATS CARDS ROW (5-col desktop / 2x2 grid mobile) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1 — Total Storage Used (Desktop only) */}
        <div
          className="hidden lg:flex flex-col justify-center px-5 py-5 rounded-2xl border"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#74788D' }}>
            Total Storage Used
          </p>
          <div className="flex items-center gap-4">
            <DonutChart pct={pct} />
            <div className="min-w-0">
              <p className="text-[22px] font-bold leading-none tabular-nums" style={{ color: '#1E1B4B' }}>
                {formatBytes(totalUsedBytes)}
              </p>
              <p className="text-[12px] mt-1.5" style={{ color: '#74788D' }}>
                of {formatBytes(limitBytes)}
              </p>
              <div className="mt-2 h-[5px] w-28 rounded-full overflow-hidden" style={{ backgroundColor: '#EEF2FF' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barW}%`, background: 'linear-gradient(90deg, #4F46E5, #818CF8)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 — Images & Media */}
        <div
          className="flex items-start gap-3 px-4 py-4 lg:px-5 lg:py-5 rounded-2xl border"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}
        >
          <div className="shrink-0 mt-0.5"><ImageCardSVG /></div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: '#495057' }}>Images &amp; Media</p>
            <p className="text-[20px] lg:text-[22px] font-bold leading-snug mt-1 tabular-nums" style={{ color: '#1E1B4B' }}>
              {imgCount}&thinsp;<span className="text-[12px] lg:text-[13px] font-normal" style={{ color: '#74788D' }}>files</span>
            </p>
            <p className="text-[11.5px] lg:text-[12px] mt-0.5" style={{ color: '#74788D' }}>{formatBytes(imgBytes)}</p>
          </div>
        </div>

        {/* Card 3 — Documents */}
        <div
          className="flex items-start gap-3 px-4 py-4 lg:px-5 lg:py-5 rounded-2xl border"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}
        >
          <div className="shrink-0 mt-0.5"><DocCardSVG /></div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: '#495057' }}>Documents</p>
            <p className="text-[20px] lg:text-[22px] font-bold leading-snug mt-1 tabular-nums" style={{ color: '#1E1B4B' }}>
              {docCount}&thinsp;<span className="text-[12px] lg:text-[13px] font-normal" style={{ color: '#74788D' }}>docs</span>
            </p>
            <p className="text-[11.5px] lg:text-[12px] mt-0.5" style={{ color: '#74788D' }}>{formatBytes(docBytes)}</p>
          </div>
        </div>

        {/* Card 4 — Audio & Voice */}
        <div
          className="flex items-start gap-3 px-4 py-4 lg:px-5 lg:py-5 rounded-2xl border"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}
        >
          <div className="shrink-0 mt-0.5"><AudioCardSVG /></div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: '#495057' }}>Audio &amp; Voice</p>
            <p className="text-[20px] lg:text-[22px] font-bold leading-snug mt-1 tabular-nums" style={{ color: '#1E1B4B' }}>
              {audioCount}&thinsp;<span className="text-[12px] lg:text-[13px] font-normal" style={{ color: '#74788D' }}>tracks</span>
            </p>
            <p className="text-[11.5px] lg:text-[12px] mt-0.5" style={{ color: '#74788D' }}>{formatBytes(audioBytes)}</p>
          </div>
        </div>

        {/* Card 5 — Promo Card */}
        <div
          className="relative flex items-end justify-between overflow-hidden rounded-2xl border min-h-[95px] lg:min-h-[130px]"
          style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', borderColor: '#E2E8F0' }}
        >
          <div className="relative z-10 px-3.5 py-7 lg:px-5 lg:pt-5 lg:pb-4 shrink-0 max-w-[65%] lg:max-w-[55%]">
            <p className="text-[10px] lg:text-[14px] font-bold leading-snug" style={{ color: '#1E1B4B' }}>
              Keep your files<br />organized &amp; safe
            </p>
            <p className="text-[9px] lg:text-[12px] mt-1 leading-snug" style={{ color: '#4F46E5' }}>
              All your assets in one<br />secure place.
            </p>
          </div>
          <div className="absolute -right-9 -bottom-2 translate-y-2 scale-75 lg:scale-100 lg:right-0 lg:bottom-0 lg:translate-y-4 pointer-events-none">
            <KeepFilesSVG />
          </div>
        </div>
      </div>
    </div>
  );
}
