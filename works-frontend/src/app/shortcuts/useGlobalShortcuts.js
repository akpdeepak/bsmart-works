import { useEffect } from 'react';

export function useGlobalShortcuts({
  navigateRef,
  goToRef,
  setPaletteOpen,
  setView,
  setIsCreateOpen,
  setShortcutsHelpOpen,
}) {
  useEffect(() => {
    function onKey(event) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        if (!navigateRef.current) return;
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (!navigateRef.current) return;

      const target = event.target;
      const typing = target && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
        || target.isContentEditable
      );
      if (typing || meta || event.altKey) return;

      if (goToRef.current) {
        goToRef.current = false;
        const destination = {
          h: 'dashboard', b: 'board', l: 'backlog', s: 'sprint', m: 'myworks',
          n: 'notifications', p: 'projects', r: 'reports', k: 'knowledge',
        }[event.key.toLowerCase()];
        if (destination) {
          event.preventDefault();
          navigateRef.current(destination);
        }
        return;
      }

      if (event.key === 'g') {
        goToRef.current = true;
        setTimeout(() => { goToRef.current = false; }, 1200);
      } else if (event.key === '/') {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === 'c') {
        event.preventDefault();
        setView('board');
        setIsCreateOpen(true);
      } else if (event.key === '?') {
        event.preventDefault();
        setShortcutsHelpOpen((open) => !open);
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goToRef, navigateRef, setIsCreateOpen, setPaletteOpen, setShortcutsHelpOpen, setView]);
}
