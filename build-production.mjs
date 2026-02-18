import { build } from 'esbuild';
import { execSync } from 'child_process';
import { copyFileSync } from 'fs';

console.log('Building frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('Building server bundle (all dependencies included)...');
await build({
  entryPoints: ['server/index.ts'],
  platform: 'node',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  external: [
    'vite',
    '@vitejs/plugin-react',
    '@replit/vite-plugin-runtime-error-modal',
    '@replit/vite-plugin-cartographer',
    '@replit/vite-plugin-dev-banner',
    'pg-native',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

copyFileSync('dist/index.js', 'dist/index.mjs');
console.log('Production build complete! Files: dist/index.js and dist/index.mjs');
