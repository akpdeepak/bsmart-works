// Initials avatar, extracted from the App.jsx monolith. getInitials stays module-private (used only
// here) so this file exports a single component (react-refresh/only-export-components).
function getInitials(name) {
  if (!name) return '??';
  const parts = name.split(' ');
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

export function Avatar({ name, size = 8 }) {
  const sz = { 5: 'w-5 h-5 text-xs', 6: 'w-6 h-6 text-xs', 7: 'w-7 h-7 text-xs', 8: 'w-8 h-8 text-xs' };
  return (
    <div className={`${sz[size] || 'w-8 h-8 text-xs'} rounded-full bg-brand-navy text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}
