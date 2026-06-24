import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import https from 'node:https';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = (env.VITE_API_BASE_URL || '').replace(/\/$/, '');

  // Agent that accepts self-signed / Tailscale HTTPS certs
  const agent = new https.Agent({ rejectUnauthorized: false });

  return {
    server: {
      port: 3002,
      host: '0.0.0.0',
      cors: true,
      // Proxy all /__portal_api/* requests to the real backend — avoids CORS in dev
      // Also preserve existing /upload proxy
      proxy: {
        // Keep local app APIs on the local Node server during development.
        '/service': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/upload': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        ...(apiTarget
          ? {
            '/__portal_api': {
              target: apiTarget,
              changeOrigin: true,
              secure: false,
              agent: apiTarget.startsWith('https') ? agent : undefined,
              rewrite: (path: string) => path.replace(/^\/__portal_api/, ''),
            },
          }
          : {}),
      }
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Existing vendor chunks
              if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor';
              if (id.includes('@google/genai')) return 'ai-vendor';
              // User's provided vendor chunks
              if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('leaflet')) return 'vendor-leaflet';
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('lucide-react')) return 'vendor-lucide';
              return 'vendor';
            }
            return undefined;
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
      chunkSizeWarningLimit: 600,
    }
  };
});
