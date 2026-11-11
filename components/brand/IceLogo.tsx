'use client';

import React from 'react';

interface IceLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function IceLogo({
  variant = 'auto',
  size = 'md',
  showTagline = false,
  className = '',
}: IceLogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 36 : 28;
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  const isDarkBg = variant === 'dark';
  const textColor = isDarkBg ? 'text-white' : 'text-[#101C2C]';
  const taglineColor = isDarkBg ? 'text-cyan-300' : 'text-[#536273]';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric Shield & Verification Symbol */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Exterior shield path */}
        <path
          d="M18 3L5 8.5V17.5C5 25.5 10.5 32 18 34C25.5 32 31 25.5 31 17.5V8.5L18 3Z"
          fill={isDarkBg ? '#172B43' : '#101C2C'}
          stroke="#2676D2"
          strokeWidth="2"
        />
        {/* Inner geometric facet accent */}
        <path
          d="M18 6.5L9 10.5V17C9 23 13 28 18 29.8V6.5Z"
          fill="#2676D2"
          fillOpacity={isDarkBg ? '0.35' : '0.15'}
        />
        {/* Verification checkmark node */}
        <path
          d="M12.5 17.5L16.5 21.5L24 13.5"
          stroke="#26B8C7"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tracking-tight ${textSize} ${textColor}`}>
            ICE
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#2676D2]/10 text-[#2676D2] border border-[#2676D2]/20">
            Platform
          </span>
        </div>
        {showTagline && (
          <span className={`text-[11px] font-medium tracking-wide mt-0.5 ${taglineColor}`}>
            Verify. Trust. Grow.
          </span>
        )}
      </div>
    </div>
  );
}
