import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/index.css';
import { initAnalytics, initPerformance } from './lib/firebase/config';

// Start free-tier Google Analytics & Performance Monitoring in background
initAnalytics().catch(() => {});
initPerformance().catch(() => {});

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

