
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Configurar meta tags para status bar do iOS
const setStatusBarMeta = () => {
  // Status bar style - light content (ícones brancos) com overlay
  const statusBarStyle = document.createElement('meta');
  statusBarStyle.name = 'apple-mobile-web-app-status-bar-style';
  statusBarStyle.content = 'black-translucent';
  document.head.appendChild(statusBarStyle);

  // Theme color - mesma cor do cabeçalho
  const themeColor = document.createElement('meta');
  themeColor.name = 'theme-color';
  themeColor.content = '#544DFE';
  document.head.appendChild(themeColor);

  // Viewport para status bar overlay
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
  }
};

setStatusBarMeta();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
