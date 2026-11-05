import type { User } from '@models/User';
import { db } from '@utils/db.util';

interface RequestTrace {
  user: User;
  startedAt: number;
}

const traces = new WeakMap<Request, RequestTrace>();

export function markAuthenticatedRequest(req: Request, user: User): void {
  traces.set(req, { user, startedAt: Date.now() });
}

export function finalizeAuthenticatedRequest(req: Request, status: number): void {
  const trace = traces.get(req);

  if (!trace) return;

  traces.delete(req);

  const finishedAt = Date.now();
  const url = new URL(req.url);

  db.recordRequest(trace.user.id, {
    method: req.method.toUpperCase(),
    path: url.pathname,
    status,
    timestamp: trace.startedAt,
    durationMs: Math.max(0, finishedAt - trace.startedAt)
  });
}
