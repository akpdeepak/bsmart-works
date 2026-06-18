// Initials/image avatar with deterministic token colours. This keeps people visually distinct
// without ad-hoc colour literals in calling surfaces.
function getInitials(name) {
  if (!name) return '??';
  const parts = name.split(' ');
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

const TONES = [
  'bg-brand-navy text-white',
  'bg-brand-navy-tint text-white',
  'bg-brand-orange text-white',
  'bg-semantic-success text-white',
  'bg-semantic-warning text-white',
  'bg-neutral-700 text-white',
];

function toneFor(name = '') {
  const source = name || 'unknown';
  const sum = Array.from(source).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TONES[sum % TONES.length];
}

export function Avatar({ name, imageUrl, size = 8 }) {
  const sz = { 5: 'w-5 h-5 text-xs', 6: 'w-6 h-6 text-xs', 7: 'w-7 h-7 text-xs', 8: 'w-8 h-8 text-xs' };
  const sizeClass = sz[size] || 'w-8 h-8 text-xs';
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ? `${name} avatar` : 'User avatar'}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div aria-label={name ? `${name} avatar` : 'Unknown user avatar'} className={`${sizeClass} rounded-full ${toneFor(name)} flex items-center justify-center font-semibold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}
