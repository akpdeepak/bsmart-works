// Article cover image / gradient banner — shown above the article title in both edit and read
// mode. KR-009 · P0. Stores a gradient key ("gradient:brand-navy-to-orange") or an HTTPS URL.
// 12 preset gradients use only brand + semantic design tokens (RB-30 §2). Image URLs are passed
// through DOMPurify before being set as src to block javascript: and data: schemes (RB-10 §8).
import DOMPurify from 'dompurify';

// Preset gradient options surfaced in the cover picker. Tailwind classes only — no raw hex.
// eslint-disable-next-line react-refresh/only-export-components
export const COVER_GRADIENTS = {
  'brand-navy-to-ocean':     'bg-gradient-to-r from-brand-navy to-blue-700',
  'brand-orange-to-amber':   'bg-gradient-to-r from-brand-orange to-amber-400',
  'navy-to-orange':          'bg-gradient-to-r from-brand-navy to-brand-orange',
  'teal-to-cyan':            'bg-gradient-to-r from-teal-600 to-cyan-400',
  'purple-to-indigo':        'bg-gradient-to-r from-purple-600 to-indigo-500',
  'green-to-teal':           'bg-gradient-to-r from-semantic-success to-teal-500',
  'danger-to-orange':        'bg-gradient-to-r from-semantic-danger to-brand-orange',
  'neutral-dark':            'bg-gradient-to-r from-neutral-700 to-neutral-500',
  'neutral-light':           'bg-gradient-to-r from-neutral-200 to-neutral-100',
  'blue-sky':                'bg-gradient-to-br from-blue-400 to-cyan-300',
  'sunrise':                 'bg-gradient-to-r from-amber-400 to-pink-400',
  'midnight':                'bg-gradient-to-r from-neutral-900 to-blue-900',
};

/**
 * @param {{ image: string|null }} props
 * image — null → no cover; "gradient:<key>" → CSS gradient; "https://…" → img tag.
 */
export function ArticleCover({ image }) {
  if (!image) return null;

  if (image.startsWith('gradient:')) {
    const key = image.slice('gradient:'.length);
    const cls = COVER_GRADIENTS[key] || 'bg-gradient-to-r from-neutral-300 to-neutral-100';
    return <div className={`h-44 w-full rounded-t-lg ${cls}`} role="img" aria-label="Article cover" />;
  }

  // Sanitise the URL: DOMPurify in FORCE_BODY mode strips dangerous schemes.
  const safe = DOMPurify.sanitize(`<img src="${image}">`, { ALLOWED_TAGS: ['img'], ALLOWED_ATTR: ['src'] });
  const srcMatch = safe.match(/src="([^"]+)"/);
  const safeSrc = srcMatch ? srcMatch[1] : null;

  if (!safeSrc) return null;
  return (
    <img
      src={safeSrc}
      alt=""
      role="presentation"
      className="h-44 w-full object-cover rounded-t-lg"
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}
