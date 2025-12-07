import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("CRITICAL: Failed to mount React application.", error);
  // Fallback UI if React crashes immediately
  rootElement.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #ff6b6b; font-family: sans-serif; text-align: center; padding: 20px;">
      <h2>Application Failed to Load</h2>
      <p style="color: #ccc;">Check the browser console for error details.</p>
    </div>
  `;
}