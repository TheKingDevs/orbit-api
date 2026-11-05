import { router } from '@routes/index';
import { handleRouteError } from '@middlewares/errorHandler';
import { Logger } from '@utils/logger';
import { finalizeAuthenticatedRequest } from '@services/requestTrace.service';

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  hostname: '0.0.0.0',
  async fetch(req) {
    const url = new URL(req.url);
    try {
      const response = await router(req);
      finalizeAuthenticatedRequest(req, response.status);
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'no-referrer');
      return response;
    } catch (error: any) {
      const response = handleRouteError(error, url.pathname);
      finalizeAuthenticatedRequest(req, response.status);
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'no-referrer');
      return response;
    }
  },
});

Logger.success(`Orbit API rodando em http://0.0.0.0:${server.port}`, 'Server');
