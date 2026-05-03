import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css';
import './pwa';
import {
  ensureGreenfieldWipe,
  ensureMultiTemplateSchemaWipe,
} from './lib/storage/bootstrap';

ensureGreenfieldWipe();
ensureMultiTemplateSchemaWipe();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
