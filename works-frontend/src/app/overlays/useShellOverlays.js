import { useState } from 'react';

export function useShellOverlays() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [overlay, setOverlay] = useState(null);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  return {
    isCreateOpen,
    setIsCreateOpen,
    isProjectOpen,
    setIsProjectOpen,
    paletteOpen,
    setPaletteOpen,
    overlay,
    setOverlay,
    shortcutsHelpOpen,
    setShortcutsHelpOpen,
  };
}
