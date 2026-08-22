import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import gitVersionPlugin from './vite-plugin-git-version';

export default defineConfig(({ mode }) => {
  // GitHub Pages 部署需 base 路徑；本地 dev 不設 base，避免 WebSocket 握手 400 錯誤
  const isProd = mode === 'production';
  return {
    base: isProd ? '/Predictive-Material-System/' : '/',
    plugins: [react(), tailwindcss(), gitVersionPlugin()],
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
            'vendor-ui':     ['lucide-react'],
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
