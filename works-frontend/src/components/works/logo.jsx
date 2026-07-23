
// bSmart Works logo. Brand spec §2 — four variants.
// SVGs live in public/ and are never recreated inline.
//
// White-label: a workspace may configure its own mark (`settings.branding.logoUrl`). Pass it as
// `logoUrl` and it replaces the product lockup in every variant, so tenant branding is one
// component rather than a conditional re-hand-rolled per surface. Pre-auth surfaces have no
// workspace yet and so keep the product lockup by simply not passing one.
export function Logo({ size = 'md', variant = 'default', logoUrl, alt }) {
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  const boxSize  = size === 'sm' ? 'w-7 h-7'  : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const markHeight = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-12' : 'h-9';

  if (logoUrl && logoUrl.trim()) {
    return (
      <img
        src={logoUrl}
        alt={alt || 'Workspace logo'}
        className={`${markHeight} max-w-32 w-auto object-contain`}
      />
    );
  }

  // Standalone glyph (favicon/dock/avatar contexts)
  if (variant === 'icon') {
    return <img src="/logo-icon.svg" alt="bSmart Works" className={boxSize} />;
  }

  // Full lockup SVGs for special surfaces:
  //   reverse — white-on-navy, for dark backgrounds (login hero, video overlay)
  //   mono    — single-colour navy, for print/watermark
  if (variant === 'reverse' || variant === 'mono') {
    const lockHeight = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-12' : 'h-9';
    return <img src={`/logo-${variant}.svg`} alt="bSmart Works" className={`${lockHeight} w-auto`} />;
  }

  // Default lockup composed with brand tokens (bSmart light grey, Works bold navy)
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
