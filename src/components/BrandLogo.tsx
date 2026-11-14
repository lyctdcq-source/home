interface BrandLogoProps {
  size?: number;
  className?: string;
  isSummoning?: boolean;
}

export function BrandLogo({
  size = 48,
  className = '',
  isSummoning = false,
}: BrandLogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative shrink-0 select-none"
    >
      {/* Brief Subtle Ripple Only on Tap */}
      {isSummoning && (
        <span
          aria-hidden="true"
          className="ai-summon-wave pointer-events-none absolute -inset-1 rounded-[20px] border border-emerald-200/80 shadow-[0_0_20px_rgba(52,211,153,0.55)]"
        />
      )}

      {/* Single Clean Frameless Squircle Shell (No Overlapping Double Borders) */}
      <div
        className={`relative h-full w-full overflow-hidden rounded-[16px] shadow-[0_12px_28px_-8px_rgba(4,24,18,0.5)] ${className}`}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          className="block h-full w-full"
          aria-label="萃凡 AI 空间智能体徽标"
        >
          <defs>
            <linearGradient id="cf_bg" x1="24" y1="16" x2="488" y2="496" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#24B175" />
              <stop offset="0.52" stopColor="#126E47" />
              <stop offset="1" stopColor="#073125" />
            </linearGradient>
            <radialGradient id="cf_studio_light" cx="145" cy="95" r="370" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#A7F3D0" stopOpacity="0.34" />
              <stop offset="0.55" stopColor="#38BDF8" stopOpacity="0.08" />
              <stop offset="1" stopColor="#073125" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cf_bot_head" cx="215" cy="195" r="225" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="0.68" stopColor="#EEF9F3" />
              <stop offset="1" stopColor="#BFE6D0" />
            </radialGradient>
            <linearGradient id="cf_visor_glass" x1="138" y1="184" x2="374" y2="306" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#041914" />
              <stop offset="0.6" stopColor="#082B22" />
              <stop offset="1" stopColor="#0C3A32" />
            </linearGradient>
            <linearGradient id="cf_visor_sheen" x1="150" y1="190" x2="330" y2="250" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="cf_gold_orbit" x1="112" y1="320" x2="400" y2="320" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#F59E0B" stopOpacity="0.2" />
              <stop offset="0.5" stopColor="#FDE047" stopOpacity="0.98" />
              <stop offset="1" stopColor="#F59E0B" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="cf_crest_glow" x1="206" y1="106" x2="306" y2="106" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6EE7B7" stopOpacity="0.3" />
              <stop offset="0.5" stopColor="#38BDF8" stopOpacity="0.95" />
              <stop offset="1" stopColor="#6EE7B7" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Iconic 萃凡绿 Backdrop */}
          <rect width="512" height="512" fill="url(#cf_bg)" />
          <rect width="512" height="512" fill="url(#cf_studio_light)" />

          {/* Minimalist Spatial Receiver Crest Above Head */}
          <rect
            x="212"
            y="102"
            width="88"
            height="14"
            rx="7"
            fill="url(#cf_crest_glow)"
          />
          <circle cx="256" cy="109" r="5" fill="#E0F2FE" />

          {/* Clean Sculpted Porcelain Robot Sphere Head (Zero Cluttered Grid Lines) */}
          <circle cx="256" cy="272" r="144" fill="url(#cf_bot_head)" />

          {/* Sleek Recessed Obsidian Glass Visor */}
          <rect
            x="130"
            y="194"
            width="252"
            height="122"
            rx="61"
            fill="url(#cf_visor_glass)"
          />
          {/* Subtle Top-Left Visor Glass Reflection */}
          <path
            d="M174 206 C220 202, 292 202, 338 206"
            stroke="url(#cf_visor_sheen)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Expressive Luminous Emerald-Cyan Robot Eyes (Naturally Blinking) */}
          <rect
            x="184"
            y="229"
            width="38"
            height="50"
            rx="19"
            fill="#34D399"
            className="ai-robot-eye"
          />
          <rect
            x="290"
            y="229"
            width="38"
            height="50"
            rx="19"
            fill="#38BDF8"
            className="ai-robot-eye"
          />
          {/* Crisp Eye Catchlights */}
          <circle cx="197" cy="243" r="6.5" fill="#FFFFFF" fillOpacity="0.92" />
          <circle cx="303" cy="243" r="6.5" fill="#FFFFFF" fillOpacity="0.92" />

          {/* Iconic Golden Spatial Orbit Sweeping the Lower Curve */}
          <path
            d="M126 346 C182 396, 330 396, 386 346"
            fill="none"
            stroke="url(#cf_gold_orbit)"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
