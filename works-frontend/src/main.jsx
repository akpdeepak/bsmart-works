import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import './index.css'
import App from './App.jsx'
import CustomerPortal from './CustomerPortal.jsx'

// The external customer portal is a separate, lighter experience (iteration 9). It lives under
// /portal so it can be white-labeled per customer and never shares the internal app shell or session.
const isPortal = window.location.pathname.startsWith('/portal')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {isPortal ? <CustomerPortal /> : <App />}
    </QueryClientProvider>
  </StrictMode>,
)
