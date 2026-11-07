import { router } from '@routes/index';
import { handleRouteError } from '@middlewares/errorHandler';
import { Logger } from '@utils/logger';
import { finalizeAuthenticatedRequest } from '@services/requestTrace.service';
import { AppError } from '@errors/index';
import { normalizeBaseUrl } from '@utils/url.util';
import { db } from '@utils/db.util';
import { sessionManager } from '@services/session.service';
import { closeDatabase, connectDatabase } from '@services/mongo.service';

const port = Number(process.env.PORT) || 3000;

function isBrowserNavigation(req: Request): boolean {
  return req.method === 'GET' && (req.headers.get('accept') ?? '').includes('text/html');
}

function redirectToError(req: Request, statusCode: number): Response | null {
  if (!isBrowserNavigation(req)) return null;

  const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  if (!frontendUrl) return null;

  const safeStatus =
    Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
      ? statusCode
      : 500;
  const response = Response.redirect(`${frontendUrl}/erro/${safeStatus}`, 302);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  finalizeAuthenticatedRequest(req, response.status);
  return response;
}

async function start(): Promise<void> {
  await connectDatabase();
  await db.init();
  await sessionManager.init();

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
        const statusCode = error instanceof AppError ? error.statusCode : 500;
        const redirect = redirectToError(req, statusCode);
        if (redirect) return redirect;

        const response = handleRouteError(error, url.pathname);
        finalizeAuthenticatedRequest(req, response.status);
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'no-referrer');
        return response;
      }
    }
  });

  Logger.success(`Orbit API rodando em http://0.0.0.0:${server.port}`, 'Server');

  const shutdown = async () => {
    server.stop();
    await closeDatabase();
    process.exit(0);
  };

  process.once('SIGTERM', () => {
    void shutdown();
  });
  process.once('SIGINT', () => {
    void shutdown();
  });
}

start().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(`Falha ao iniciar a Orbit API: ${message}`, 'Server');
  process.exit(1);
});
