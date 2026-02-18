import { build } from 'esbuild';
import { execSync } from 'child_process';

console.log('Building frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('Building server bundle (CJS, all dependencies included)...');
await build({
  entryPoints: ['server/prod.ts'],
  platform: 'node',
  bundle: true,
  format: 'cjs',
  outfile: 'dist/index.cjs',
  external: [
    'pg-native',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.dirname': '__dirname',
  },
  banner: {
    js: '// Production bundle - all dependencies included\n',
  },
});

console.log('Production build complete!');
console.log('  Server: dist/index.cjs');
console.log('  Frontend: dist/public/');
