import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign Vite HMR websocket connection errors in the sandbox environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason ? String(event.reason.message || event.reason) : '';
    if (msg.toLowerCase().includes('websocket') || msg.toLowerCase().includes('web socket')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg.toLowerCase().includes('websocket') || msg.toLowerCase().includes('web socket')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
