import { scan } from 'react-scan';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Landing from './pages/Landing';
import './index.css';

// Enable react-scan in development only
if (import.meta.env.DEV) {
  scan({ enabled: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/playground" element={<App />} />
        <Route path="/playground/new" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
