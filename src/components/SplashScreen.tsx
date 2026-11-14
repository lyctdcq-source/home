import { useEffect, useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { ResolvedAtmosphereMode, ViewportMode } from '../types/gis';
import { BrandLogo } from './BrandLogo';
import { OrbitalHorizonEarth } from './OrbitalHorizonEarth';
import deepSpaceCosmosImg from '../assets/images/deep_space_cosmos_1794621547747.jpg';

interface SplashScreenProps {
  atmosphere: ResolvedAtmosphereMode;
  viewportMode: ViewportMode;
  timeLabel: string;
  dateLabel: string;
  activeProjectName: string;
  launchLastOnStart: boolean;
  isExiting: boolean;
  onEnter: () => void;
}

const COSMOS_ACCENTS: Record<
  ResolvedAtmosphereMode,
  {
    scrimTint: string;
    auroraGlow: string;
    photoFilterClass: string;
  }
> = {
  dawn: {
    scrimTint:
      'radial-gradient(ellipse at 50% 44%, rgba(8,26,44,0.56) 0%, rgba(10,32,54,0.34) 55%, rgba(6,16,30,0.22) 100%)',
    auroraGlow:
      'radial-gradient(circle, rgba(110,231,183,0.32) 0%, rgba(56,189,248,0.16) 48%, transparent 72%)',
    photoFilterClass: 'brightness-[0.94] saturate-[1.08]',
  },
  noon: {
    scrimTint:
      'radial-gradient(ellipse at 50% 44%, rgba(7,26,48,0.52) 0%, rgba(10,36,68,0.30) 55%, rgba(6,18,36,0.18) 100%)',
    auroraGlow:
      'radial-gradient(circle, rgba(125,211,252,0.34) 0%, rgba(52,211,153,0.18) 48%, transparent 72%)',
    photoFilterClass: 'brightness-[0.98] saturate-[1.12]',
  },
  sunset: {
    scrimTint:
      'radial-gradient(ellipse at 50% 44%, rgba(20,16,38,0.56) 0%, rgba(28,22,48,0.34) 55%, rgba(12,14,28,0.22) 100%)',
    auroraGlow:
      'radial-gradient(circle, rgba(251,146,60,0.28) 0%, rgba(56,189,248,0.18) 48%, transparent 72%)',
    photoFilterClass: 'brightness-[0.92] saturate-[1.10]',
  },
  night: {
    scrimTint:
      'radial-gradient(ellipse at 50% 44%, rgba(6,18,34,0.58) 0%, rgba(8,24,46,0.34) 55%, rgba(4,12,24,0.20) 100%)',
    auroraGlow:
      'radial-gradient(circle, rgba(52,211,153,0.32) 0%, rgba(56,189,248,0.20) 48%, transparent 72%)',
    photoFilterClass: 'brightness-[0.92] saturate-[1.08]',
  },
};

export function SplashScreen({
  atmosphere,
  viewportMode,
  timeLabel,
  dateLabel,
  activeProjectName,
  launchLastOnStart,
  isExiting,
  onEnter,
}: SplashScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [bgLoaded, setBgLoaded] = useState(true);
  const cosmos = COSMOS_ACCENTS[atmosphere];

  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, []);

  return (
    <section
      aria-label="萃凡云图启动页"
      className={`absolute inset-0 z-30 flex flex-col justify-between overflow-hidden bg-[#071426] text-white select-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity ${
        isExiting ? 'pointer-events-none opacity-0 scale-[1.03]' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundImage:
          'linear-gradient(180deg, #071426 0%, #0b203b 48%, #0d2746 76%, #07162a 100%)',
      }}
    >
      {/* Real Milky Way Astrophotography Deep-Space Backdrop */}
      {bgLoaded && (
        <img
          src={deepSpaceCosmosImg}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={() => setBgLoaded(false)}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_38%] transition-all duration-700 ${cosmos.photoFilterClass}`}
        />
      )}

      {/* Measured Optical Contrast Scrim Ensuring Crisp Typography Over Milky Way Core */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: cosmos.scrimTint }}
      />

      {/* Real Satellite-Texture-Wrapped Curved Orbital Earth (WebGL Sphere) */}
      <OrbitalHorizonEarth atmosphere={atmosphere} />

      {/* Subtle Bottom Legibility Scrim Over Bright Continents / Clouds */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#05101d]/58 via-[#05101d]/20 to-transparent"
      />

      {/* Top Zone: Native OS Status Bar + Quiet Skip Action */}
      <div className="relative z-20">
        {viewportMode !== 'fluid' && (
          <div
            aria-hidden="true"
            className="relative mx-auto flex max-w-6xl items-center justify-between px-6 pt-2.5 pb-1 text-white select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
          >
            <span className="text-[12.5px] font-semibold tracking-tight tabular-nums">
              {viewportMode === 'tablet' ? `${timeLabel} · ${dateLabel}` : timeLabel}
            </span>

            {viewportMode === 'phone' && (
              <div className="pointer-events-none absolute top-2 left-1/2 flex h-[22px] w-[88px] -translate-x-1/2 items-center justify-end rounded-full bg-[#090d0c] px-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.4)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#13202e] ring-1 ring-white/10" />
              </div>
            )}

            <div className="flex items-center gap-1.5 text-white/95">
              <svg className="h-3 w-4" viewBox="0 0 18 12" fill="currentColor">
                <rect x="1" y="8" width="2.6" height="3.5" rx="0.8" />
                <rect x="5" y="5.8" width="2.6" height="5.7" rx="0.8" />
                <rect x="9" y="3.4" width="2.6" height="8.1" rx="0.8" />
                <rect x="13" y="1" width="2.6" height="10.5" rx="0.8" fillOpacity="0.95" />
              </svg>
              {viewportMode === 'phone' && (
                <span className="text-[10px] font-bold tracking-tight">5G</span>
              )}
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 16 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M1.8 5.2C5.2 2 10.8 2 14.2 5.2" />
                <path d="M4.3 7.9C6.4 5.9 9.6 5.9 11.7 7.9" />
                <circle cx="8" cy="11" r="1.25" fill="currentColor" stroke="none" />
              </svg>
              {viewportMode === 'tablet' && (
                <span className="ml-0.5 text-[11px] font-medium tabular-nums">88%</span>
              )}
              <div className="flex items-center gap-[1.5px]">
                <div className="flex h-[11.5px] w-[22px] items-center rounded-[3.5px] border border-white/65 p-[1.5px]">
                  <div className="h-full w-[86%] rounded-[1.5px] bg-white" />
                </div>
                <span className="h-[4px] w-[1.5px] rounded-r-full bg-white/65" />
              </div>
            </div>
          </div>
        )}

        <div
          className={`mx-auto flex items-center justify-end px-5 ${
            viewportMode === 'fluid' ? 'pt-5' : 'pt-2.5'
          } max-w-6xl`}
        >
          <button
            type="button"
            onClick={onEnter}
            className="relative inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/22 bg-[#071526]/45 px-3.5 text-xs font-medium text-white/95 tabular-nums backdrop-blur-md transition-all hover:border-white/38 hover:bg-[#071526]/65 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 after:absolute after:-inset-1.5 after:content-['']"
          >
            <span>跳过</span>
            <span className="text-emerald-200">{secondsLeft}s</span>
          </button>
        </div>
      </div>

      {/* Center Hero Brand Focal Stage */}
      <div className="splash-hero-in relative z-20 mx-auto flex w-full max-w-md flex-col items-center px-6 text-center">
        {/* Orbital Rings & Aurora Halo Around Emblem */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-52 w-52 rounded-full opacity-95 blur-xl @[560px]:h-60 @[560px]:w-60"
            style={{ background: cosmos.auroraGlow }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-[148px] w-[148px] rounded-full border border-white/[0.12] @[560px]:h-[164px] @[560px]:w-[164px]"
          />
          <svg
            aria-hidden="true"
            className="splash-orbit-slow pointer-events-none absolute h-[186px] w-[186px] @[560px]:h-[208px] @[560px]:w-[208px]"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle
              cx="100"
              cy="100"
              r="92"
              stroke="url(#splash_orbit_stroke)"
              strokeWidth="1"
              strokeDasharray="6 8"
            />
            <circle cx="100" cy="8" r="2.6" fill="#6ee7b7" />
            <circle cx="165" cy="165" r="2" fill="#7dd3fc" fillOpacity="0.85" />
            <defs>
              <linearGradient
                id="splash_orbit_stroke"
                x1="8"
                y1="8"
                x2="192"
                y2="192"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="#6ee7b7" stopOpacity="0.55" />
                <stop offset="0.5" stopColor="#7dd3fc" stopOpacity="0.22" />
                <stop offset="1" stopColor="#6ee7b7" stopOpacity="0.55" />
              </linearGradient>
            </defs>
          </svg>

          <BrandLogo
            size={88}
            className="!rounded-[24px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.22)]"
          />
        </div>

        <h1 className="mt-8 text-[32px] font-bold tracking-[0.06em] text-white leading-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)] @[560px]:text-[38px]">
          萃凡云图
        </h1>
        <p className="mt-2.5 text-[13.5px] font-medium tracking-[0.05em] text-sky-50/92 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] @[560px]:text-[15px]">
          轻量外业踏勘 · 随手记录山海坐标
        </p>

        <div className="mt-5 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-emerald-200/95 tabular-nums drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-300" strokeWidth={2.2} />
          <span className="truncate">
            {launchLastOnStart
              ? `即将恢复上次调查 · ${activeProjectName}`
              : `北斗定位就绪 · ${activeProjectName}`}
          </span>
        </div>
      </div>

      {/* Bottom Thumb-Reach Action & Brand Horizon Zone */}
      <div className="relative z-20 mx-auto flex w-full max-w-xs flex-col items-center px-6 pb-2">
        {/* Minimal Orbital Loading Progress */}
        <div
          aria-hidden="true"
          className="mb-4 h-[3px] w-32 overflow-hidden rounded-full bg-white/20 backdrop-blur-xs"
        >
          <div className="splash-progress-fill h-full w-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300" />
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="group inline-flex min-h-[48px] w-full max-w-[232px] items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold tracking-wide text-[#0c291e] shadow-[0_14px_34px_-6px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.28)] transition-all duration-150 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          <span>进入云图工作台</span>
          <ArrowRight className="h-4 w-4 text-[#167248] transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>

        <p className="mt-4 text-[11px] font-medium tracking-[0.14em] text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
          萃凡空间 · 移动外业云图
        </p>

        {viewportMode !== 'fluid' && (
          <div aria-hidden="true" className="mt-3.5 flex justify-center pb-0.5">
            <span className="h-[4px] w-[112px] rounded-full bg-white/35" />
          </div>
        )}
      </div>
    </section>
  );
}
