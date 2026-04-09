import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './styles/globals.css';
import './lib/logger';
import './i18n';

console.log(
  '%c🦞 虾池子  启动',
  'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 16px; padding: 8px 16px; border-radius: 4px; font-weight: bold;'
);
console.log(
  '%c提示: 打开开发者工具 (Cmd+Option+I / Ctrl+Shift+I) 可以查看详细日志',
  'color: #888; font-size: 12px;'
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/app/iclaw">
      <Routes>
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
