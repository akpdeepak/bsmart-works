import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CustomerPortal from './CustomerPortal.jsx'
import { AppProviders } from './app/providers/AppProviders.jsx'
import { registerServiceWorker } from './lib/sw-register'

// Register the PWA service worker for offline support + installability (iteration 18, Cap S).
registerServiceWorker()

// The external customer portal is a separate, lighter experience (iteration 9). It lives under
// /portal so it can be white-labeled per customer and never shares the internal app shell or session.
const isPortal = window.location.pathname.startsWith('/portal')

createRoot(document.getElementById('root')).render(
  <AppProviders>{isPortal ? <CustomerPortal /> : <App />}</AppProviders>,
)
