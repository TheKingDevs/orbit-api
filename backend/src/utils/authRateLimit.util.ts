import { isIP } from 'node:net';
import { RateLimitError } from '@errors/RateLimitError';

interface WindowTracker {
  timestamps: number[];
  lastSeenAt: number;
}

const WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKERS = 20_000;
const MAX_TRACKER_IDLE_MS = 30 * 60 * 1000;
const FAILED_API_KEY_WINDOW_MS = 60 * 1000;
const FAILED_API_KEY_LIMIT = 30;
const limits = new Map<string, WindowTracker>();
let lastCleanupAt = 0;

const AUTH_LIMITS = new Map<string, number>([
  ['/api/auth/google', 10],
  ['/api/auth/google/callback', 30]
]);

function resolveClientIp(req: Request, socketIp?: string): string {
  const cloudflareIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp && isIP(cloudflareIp)) return cloudflareIp;

  return socketIp && isIP(socketIp) ? socketIp : 'unknown-client';
}

function cleanup(now: number): void {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;

  for (const [key, tracker] of limits) {
    if (now - tracker.lastSeenAt > MAX_TRACKER_IDLE_MS) limits.delete(key);
  }
}

function getTracker(key: string, now: number): WindowTracker {
  let tracker = limits.get(key);
  if (tracker) {
    tracker.lastSeenAt = now;
    limits.delete(key);
    limits.set(key, tracker);
    return tracker;
  }

  while (limits.size >= MAX_TRACKERS) {
    const oldest = limits.keys().next().value;
    if (oldest === undefined) break;
    limits.delete(oldest);
  }

  tracker = { timestamps: [], lastSeenAt: now };
  limits.set(key, tracker);
  return tracker;
}

/** Apply a bounded per-client limit to unauthenticated OAuth entry points. */
export function enforceAuthRateLimit(req: Request, socketIp?: string): void {
  const path = new URL(req.url).pathname;
  const limit = AUTH_LIMITS.get(path);
  if (!limit) return;

  const now = Date.now();
  cleanup(now);
  const key = `${resolveClientIp(req, socketIp)}:${path}`;
  const tracker = getTracker(key, now);
  tracker.timestamps = tracker.timestamps.filter(timestamp => now - timestamp < WINDOW_MS);

  if (tracker.timestamps.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((tracker.timestamps[0] + WINDOW_MS - now) / 1000));
    throw new RateLimitError('Muitas tentativas de autenticação. Aguarde antes de tentar novamente.', retryAfterSeconds);
  }

  tracker.timestamps.push(now);
}

/** Throttle only failed API-key authentication, without penalizing valid API traffic. */
export function recordFailedApiKeyAttempt(req: Request): void {
  const now = Date.now();
  cleanup(now);
  const key = `failed-api-key:${resolveClientIp(req)}`;
  const tracker = getTracker(key, now);
  tracker.timestamps = tracker.timestamps.filter(timestamp => now - timestamp < FAILED_API_KEY_WINDOW_MS);

  if (tracker.timestamps.length >= FAILED_API_KEY_LIMIT) {
    const retryAfterSeconds = Math.max(1, Math.ceil((tracker.timestamps[0] + FAILED_API_KEY_WINDOW_MS - now) / 1000));
    throw new RateLimitError('Muitas tentativas de autenticação. Aguarde antes de tentar novamente.', retryAfterSeconds);
  }

  tracker.timestamps.push(now);
}
