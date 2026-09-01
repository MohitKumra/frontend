import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from './src/config/brand.ts';

// Page <title> and meta description are injected from src/config/brand.ts so the
// browser tab and SEO description stay consistent with the UI when you rebrand.
const BRAND_TITLE = `${APP_NAME} — ${APP_TAGLINE}`;
const brandHtmlPlugin: Plugin = {
  name: 'inject-brand',
  transformIndexHtml(html: string) {
    return html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${BRAND_TITLE}</title>`)
      .replace(/(name="description"\s+content=")[^"]*(")/, `$1${APP_DESCRIPTION}$2`);
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), brandHtmlPlugin],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    allowedHosts: ['localhost', '127.0.0.1' , 'frontend-production-f612.up.railway.app' , 'pms.finamite.in'],
  },
});
