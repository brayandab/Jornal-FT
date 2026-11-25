import { defineConfig } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo todo pasa por el gateway (localhost:8000) con el mismo origen que la app:
// los subsistemas no tienen CORS, así que el proxy es obligatorio (ver documento.md, F9).
const gateway = process.env.GATEWAY_URL ?? 'http://localhost:8000';

// A través del proxy la app y la API comparten origen, así que CORS no aplica. Pero el navegador manda la
// cabecera Origin en los POST, y los cores solo aceptan http://localhost:4200 (CORS_ALLOWED_ORIGINS): si Vite
// arranca en otro puerto (4201, 5173...) responden 403. Se quita Origin al reenviar para que funcione en cualquier puerto.
const dropOrigin: ProxyOptions['configure'] = (proxy) => {
  proxy.on('proxyReq', (req) => req.removeHeader('origin'));
  proxy.on('proxyReqWs', (req) => req.removeHeader('origin'));
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    proxy: {
      '/api': { target: gateway, changeOrigin: true, secure: false, configure: dropOrigin },
      '/subsystems': { target: gateway, changeOrigin: true, secure: false, ws: true, configure: dropOrigin },
    },
  },
  test: { environment: 'node', exclude: ['e2e/**', 'node_modules/**'] },
});
