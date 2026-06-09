import React from 'react';

export function Logo() {
  return (
    <div className="w-[88px] h-[88px] flex items-center justify-center flex-shrink-0">
      <img
        src="/gutterpros-logo.png"
        alt="Gutter Pros LLC Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
}