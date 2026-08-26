import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import './index.css';

// ── 沙盒防護：若本文件被以 sandbox（無 allow-same-origin）內嵌，localStorage 必然拋錯，
//    完整 App 不應在受限框架內啟動（如規格書 iframe 意外載入應用內容時），改渲染最小提示。 ──
const isSandboxedFrame = (() => {
  if (window.self === window.top) return false;
  try {
    window.localStorage.getItem('__pms_probe__');
    return false;
  } catch {
    return true;
  }
})();

const root = createRoot(document.getElementById('root')!);

if (isSandboxedFrame) {
  root.render(
    <div style={{ padding: 24, fontFamily: 'sans-serif', color: '#64748b' }}>
      PMS 系統無法於受限框架內啟動，請直接開啟系統網址使用。
    </div>
  );
} else {
  root.render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}
