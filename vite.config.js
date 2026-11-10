import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' → le dossier dist/ peut être déposé dans n'importe quel sous-dossier du site.
export default defineConfig({
  base: './',
  plugins: [react()],
});
