import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages 部署路徑：https://chun-chieh-chang.github.io/Predictive-Material-System/
    // 本地開發 (npm run dev) 不受此設定影響
    base: '/Predictive-Material-System/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // 將第三方庫拆分為獨立 chunk，改善瀏覽器快取效率
          manualChunks: {
            'vendor-react':  ['react', 'react-dom'],
            'vendor-ui':     ['lucide-react', 'motion'],
            'vendor-xlsx':   ['xlsx'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
