import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import FingerPage from './FingerPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.pathname === '/controller' || location.pathname === '/trainer' || location.pathname === '/melody-trainer' || location.pathname === '/force-microscope'
      ? <FingerPage controller={location.pathname === '/controller'} />
      : <App />}
  </StrictMode>,
)
