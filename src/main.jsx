import React from 'react';
import ReactDOM from 'react-dom/client';
import './themes.css';
import { initTheme } from './useTheme.js';
import PokerGame from './PokerGame.jsx';

initTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PokerGame />
  </React.StrictMode>
);
