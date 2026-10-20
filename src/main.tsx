import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { getAppDisplayTitle } from './config/appInfo';

// Set document title dynamically according to app stage and version
if (typeof document !== 'undefined') {
  document.title = getAppDisplayTitle();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

