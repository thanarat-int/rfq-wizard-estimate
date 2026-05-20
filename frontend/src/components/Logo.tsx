interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Deep Estimate brand mark.
 * A gradient app-tile with an itemised-estimate glyph (graduated line items).
 */
export default function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Deep Estimate"
    >
      <defs>
        <linearGradient id="deTile" x1="3" y1="1" x2="37" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="deSheen" x1="20" y1="0" x2="20" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* tile */}
      <rect width="40" height="40" rx="11.5" fill="url(#deTile)" />
      {/* glossy top sheen */}
      <rect width="40" height="40" rx="11.5" fill="url(#deSheen)" />

      {/* itemised estimate lines */}
      <rect x="9.5" y="11" width="21" height="4.4" rx="2.2" fill="#FFFFFF" />
      <rect x="9.5" y="17.8" width="12.5" height="4.4" rx="2.2" fill="#FFFFFF" fillOpacity="0.6" />
      <rect x="9.5" y="24.6" width="16.5" height="4.4" rx="2.2" fill="#FFFFFF" fillOpacity="0.86" />
      {/* total marker */}
      <circle cx="28.2" cy="20" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}
