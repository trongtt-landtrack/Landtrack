import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const ALLOWED_DOMAINS = [
  'ais-dev-yc5m26qonetltxs6ccuw7v-246082613320.asia-southeast1.run.app',
  'ais-pre-yc5m26qonetltxs6ccuw7v-246082613320.asia-southeast1.run.app',
  'localhost'
];

if (!ALLOWED_DOMAINS.includes(window.location.hostname)) {
  window.location.href = 'https://google.com';
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
