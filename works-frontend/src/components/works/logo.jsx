import * as React from 'react';

export function Logo({ size = 'md', variant = 'default' }) {
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  const boxSize  = size === 'sm' ? 'w-7 h-7'  : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';

  if (variant === 'icon') {
    return <img src="/logo-icon.svg" alt="bSmart Works" className={boxSize} />;
  }

  return (
    <div className="flex items-center gap-2">
      <img src="/logo-icon.svg" alt="" className={boxSize} aria-hidden="true" />
      <div className="flex flex-col leading-none">
        <span className={`font-light text-neutral-600 tracking-tight ${textSize}`}>bSmart</span>
        <span className={`font-bold text-brand-navy tracking-tight ${textSize}`}>Works</span>
      </div>
    </div>
  );
}
