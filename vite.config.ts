import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import express from 'express';
import { handleTranscribe, handleTranslateText, handleTTS } from './server/apiHandler.ts';

function apiPlugin(): Plugin {
  return {
    name: 'api-server-middleware',
    configureServer(server) {
      const app = express();
      app.use(express.json({ limit: '1000mb' }));
      app.use(express.urlencoded({ extended: true, limit: '1000mb' }));

      app.post('/api/transcribe', handleTranscribe);
      app.post('/api/translate-text', handleTranslateText);
      app.post('/api/tts', handleTTS);
      app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok' });
      });

      server.middlewares.use(app);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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

