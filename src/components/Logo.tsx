import React from 'react';

export function Logo() {
  return (
    <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 100 100" width="72" height="72" xmlns="http://www.w3.org/2000/svg">
        {/* Outer ring - blue (top-left) */}
        <path d="M50,6 A44,44 0 0,0 6,50" fill="none" stroke="#1a3a6e" strokeWidth="15" strokeLinecap="butt"/>
        {/* Stars on blue section */}
        <text x="21" y="25" fontSize="7" fill="white" textAnchor="middle">★</text>
        <text x="12" y="39" fontSize="6" fill="white" textAnchor="middle">★</text>
        <text x="29" y="16" fontSize="5" fill="white" textAnchor="middle">★</text>
        {/* Outer ring - red (top-right) */}
        <path d="M50,6 A44,44 0 0,1 94,50" fill="none" stroke="#c0292b" strokeWidth="15" strokeLinecap="butt"/>
        {/* Outer ring - blue (bottom-left) */}
        <path d="M6,50 A44,44 0 0,0 50,94" fill="none" stroke="#1a3a6e" strokeWidth="15" strokeLinecap="butt"/>
        {/* Outer ring - red (bottom-right) */}
        <path d="M50,94 A44,44 0 0,0 94,50" fill="none" stroke="#c0292b" strokeWidth="15" strokeLinecap="butt"/>
        {/* Inner dark circle */}
        <circle cx="50" cy="50" r="29" fill="#1a1a1a"/>
        {/* G letter */}
        <text x="50" y="65" fontSize="38" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial Black, sans-serif">G</text>
      </svg>
    </div>
  );
}