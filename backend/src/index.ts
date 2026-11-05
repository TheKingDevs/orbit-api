import { router } from '@routes/index';
import { handleRouteError } from '@middlewares/errorHandler';
import { Logger } from '@utils/logger';
import { finalizeAuthenticatedRequest } from '@services/requestTrace.service';
import { NotFoundError } from '@errors/index';
import { normalizeBaseUrl } from '@utils/url.util';

const port = Number(process.env.PORT) || 3000;

function isBrowserNavigation(req: Request): boolean {
  return req.method === 'GET' && (req.headers.get('accept') ?? '').includes('text/html');
}

function redirectToNotFound(req: Request): Response | null {
  if (!isBrowserNavigation(req)) return null;

  const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  if (!frontendUrl) return null;

  const response = Response.redirect(`${frontendUrl}/404`, 302);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  finalizeAuthenticatedRequest(req, response.status);
  return response;
}

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
      if (error instanceof NotFoundError) {
        const redirect = redirectToNotFound(req);
        if (redirect) return redirect;
      }

      const response = handleRouteError(error, url.pathname);
      finalizeAuthenticatedRequest(req, response.status);
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'no-referrer');
      return response;
    }
  },
});

Logger.success(`Orbit API rodando em http://0.0.0.0:${server.port}`, 'Server');
