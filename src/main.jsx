import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { StoreProvider } from './lib/store.jsx';
import { ToastProvider } from './components/ui.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StoreProvider>
);
