import re

with open('src/app/AppShell.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    """  const toastTimerRef = useRef(null);
  const showToast = (message, type = 'success', timeout = 4000) => {
    const id = Date.now();
    setToast({ message, type, id });
    clearTimeout(toastTimerRef.current);
    if (timeout > 0) {
      toastTimerRef.current = setTimeout(() => setToast(prev => (prev?.id === id ? null : prev)), timeout);
    }
  };""",
    """  const toastTimerRef = useRef(null);
  const showToast = useCallback((message, type = 'success', timeout = 4000) => {
    const id = Date.now();
    setToast({ message, type, id });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (timeout > 0) {
      toastTimerRef.current = setTimeout(() => setToast(prev => (prev?.id === id ? null : prev)), timeout);
    }
  }, []);"""
)

with open('src/app/AppShell.jsx', 'w') as f:
    f.write(content)
