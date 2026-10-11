import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
    exclude: [
      'firebase-admin',
      'mongodb',
      '@google-cloud/storage',
      'google-gax',
      'google-auth-library',
      'pino',
      'pino-pretty',
    ],
  },
  build: {
    rollupOptions: {
      external: [
        'firebase-admin',
        'mongodb',
        'pino',
        'pino-pretty',
      ],
    },
  },
  ssr: {
    noExternal: ['react-router', 'react-router-dom'],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: false,
    server: {
      deps: {
        inline: [/react-router/],
      },
    },
  },
} as any);
