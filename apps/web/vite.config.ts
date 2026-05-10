import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      // Real 404s for missing /models/ and /sprites/ so transformers.js
      // doesn't try to parse HTML as JSON/binary.
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
      // Proxy LM Studio — avoids CORS preflight rejection.
      // LLMChatPanel sends to /lmstudio/v1/chat/completions,
      // Vite forwards it to http://localhost:1234/v1/chat/completions.
      '/lmstudio': {
        target: 'http://localhost:1234',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/lmstudio/, ''),
      },
      // Proxy Ollama natively too (avoids CORS on some OS configs).
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
