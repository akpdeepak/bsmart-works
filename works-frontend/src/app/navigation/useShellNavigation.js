import { useEffect, useRef, useState } from 'react';
import { parseEntityRoute, pathToView, viewToPath } from '@/lib/routes';

export function useShellNavigation({ selectedItem, setSelectedItem, onOpenItem }) {
  const [view, setView] = useState(() => pathToView(window.location.pathname) || 'dashboard');
  const didInitRoute = useRef(false);
  const navigateRef = useRef(null);

  useEffect(() => {
    if (parseEntityRoute(window.location.pathname)) return;
    const path = viewToPath(view);
    if (path && window.location.pathname !== path) {
      window.history.pushState({ view }, '', path);
    }
  }, [view]);

  useEffect(() => {
    function onPop() {
      const entity = parseEntityRoute(window.location.pathname);
      if (entity?.kind === 'work-item') {
        onOpenItem(entity.id);
        return;
      }
      const nextView = pathToView(window.location.pathname) || 'dashboard';
      if (selectedItem) setSelectedItem(null);
      if (navigateRef.current) navigateRef.current(nextView);
      else setView(nextView);
    }

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [onOpenItem, selectedItem, setSelectedItem]);

  return { view, setView, didInitRoute, navigateRef };
}
