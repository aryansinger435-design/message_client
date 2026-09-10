import React from 'react';

/**
 * AuraWave Official Brand Logo Component
 * Dynamic vector logo with modern emerald-to-spring-green aura wave pulses.
 */
export const AuraWaveLogo = ({ size = 40, className = '', withGlow = true }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00a884" />
            <stop offset="50%" stopColor="#128c7e" />
            <stop offset="100%" stopColor="#0a4038" />
          </linearGradient>

          <linearGradient id="logo-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#25d366" />
            <stop offset="50%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#25d366" />
          </linearGradient>

          {withGlow && (
            <filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#00a884" floodOpacity="0.35" />
            </filter>
          )}
        </defs>

        {/* Squircle App Background */}
        <rect
          x="32"
          y="32"
          width="448"
          height="448"
          rx="116"
          fill="url(#logo-bg)"
          filter={withGlow ? 'url(#logo-shadow)' : undefined}
        />

        {/* Subtle Specular Rim */}
        <rect
          x="34"
          y="34"
          width="444"
          height="444"
          rx="114"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeOpacity="0.22"
        />

        {/* Sleek Chat Bubble */}
        <path
          d="M146 168 C146 138 168 114 198 114 L314 114 C344 114 366 138 366 168 L366 264 C366 294 344 318 314 318 L224 318 L164 368 C154 376 146 370 146 356 Z"
          fill="#0c1317"
          fillOpacity="0.32"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Aura Wave Sound Pulsing Bars */}
        <rect x="184" y="196" width="18" height="38" rx="9" fill="url(#logo-glow)" fillOpacity="0.85" />
        <rect x="216" y="174" width="18" height="82" rx="9" fill="url(#logo-glow)" />
        <rect x="247" y="152" width="18" height="126" rx="9" fill="#ffffff" />
        <rect x="278" y="174" width="18" height="82" rx="9" fill="url(#logo-glow)" />
        <rect x="310" y="196" width="18" height="38" rx="9" fill="url(#logo-glow)" fillOpacity="0.85" />

        {/* Live Aura Signal Dot */}
        <circle cx="395" cy="115" r="16" fill="#25d366" />
        <circle cx="395" cy="115" r="28" fill="#25d366" fillOpacity="0.3" />
      </svg>
    </div>
  );
};

export default AuraWaveLogo;
