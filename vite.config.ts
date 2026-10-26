import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any subpath (e.g. GitHub Pages /Lightyear/).
export default defineConfig({ plugins: [react()], base: './' });
