import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';

const root = document.querySelector('#root');
if (root === null) {
  throw new Error('Selector not found in index.html');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
