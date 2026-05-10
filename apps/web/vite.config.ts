import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: './',   // ← TOP LEVEL — makes all asset paths relative for Electron file://

  plugins: [
    react(),
    {
      name: 'static-404',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = (req.url ?? '').split('?')[0];
          if (!url.startsWith('/models/') && !url.startsWith('/sprites/')) {
            return next();
          }
          const filePath = path.join(process.cwd(), 'public', url);
          if (!fs.existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/lmstudio': {
        target: 'http://localhost:1234',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/lmstudio/, ''),
      },
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
