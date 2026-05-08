import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './shared/i18n/index.js';
import { App } from './app/App.js';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
