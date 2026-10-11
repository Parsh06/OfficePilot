import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { viteDevApiPlugin } from './src/server/devMiddleware.ts';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode !== 'test' && !process.env.VITEST) {
    const env = loadEnv(mode, process.cwd(), '');
    // Expose backend environment variables to Node process in dev
    Object.assign(process.env, env);
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      viteDevApiPlugin(),
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
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    },
  };
});
