import { scan } from 'react-scan';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import './index.css';

// Enable react-scan in development only
if (import.meta.env.DEV) {
  scan({ enabled: true });
}

/** Show landing page unless the URL carries query params or a hash (shared link). */
function RootRoute() {
  const hasState = window.location.search || window.location.hash;
  if (hasState) {
    return <App />;
  }
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/new" element={<App />} />
        <Route path="/playground" element={<App />} />
        <Route path="/playground/new" element={<App />} />
        <Route path="/playground/:workspaceId" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
