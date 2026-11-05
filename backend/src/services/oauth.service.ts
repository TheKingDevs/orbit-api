import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const TRANSACTION_TTL_MS = 10 * 60 * 1000;

export interface GoogleProfile {
  subject: string;
  email: string;
  name?: string;
  picture?: string;
}

interface OAuthTransaction {
  codeVerifier: string;
  nonce: string;
  expiresAt: number;
}

export class OAuthError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'OAuthError';
  }
}

const transactions = new Map<string, OAuthTransaction>();

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

function requireGoogleConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${frontendUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new OAuthError('oauth_not_configured', 'OAuth do Google não configurado.');
  }

  return { clientId, clientSecret, redirectUri };
}

export function getFrontendUrl(path = ''): string {
  const base = (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
  return `${base}${path}`;
}

export function createAuthorizationRequest(): { url: string; state: string } {
  const { clientId, redirectUri } = requireGoogleConfig();

  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = randomToken();
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

  const now = Date.now();

  for (const [key, transaction] of transactions.entries()) {
    if (now >= transaction.expiresAt) transactions.delete(key);
  }

  transactions.set(sha256(state), {
    codeVerifier,
    nonce,
    expiresAt: now + TRANSACTION_TTL_MS
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  return { url: `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`, state };
}

export function consumeAuthorizationRequest(state: string): OAuthTransaction | null {
  const key = sha256(state);
  const transaction = transactions.get(key);

  if (!transaction) return null;

  transactions.delete(key);

  if (Date.now() >= transaction.expiresAt) return null;

  return transaction;
}

export async function exchangeCodeForIdToken(code: string, codeVerifier: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = requireGoogleConfig();

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new OAuthError('token_exchange_failed', 'Falha ao trocar o código de autorização.');
  }

  const payload = await response.json() as { id_token?: unknown };

  if (typeof payload.id_token !== 'string') {
    throw new OAuthError('missing_id_token', 'O Google não retornou um ID token.');
  }

  return payload.id_token;
}

export async function verifyGoogleIdToken(idToken: string, expectedNonce: string): Promise<GoogleProfile> {
  const { clientId } = requireGoogleConfig();

  let payload;

  try {
    const result = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
      clockTolerance: 60
    });
    payload = result.payload;
  } catch {
    throw new OAuthError('invalid_id_token', 'ID token do Google inválido.');
  }

  if (payload.nonce !== expectedNonce) {
    throw new OAuthError('invalid_nonce', 'Nonce do ID token não confere.');
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

  if (!emailVerified || typeof payload.email !== 'string' || payload.email.length === 0) {
    throw new OAuthError('email_not_verified', 'E-mail do Google não verificado.');
  }

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new OAuthError('invalid_subject', 'Identificador do Google inválido.');
  }

  return {
    subject: payload.sub,
    email: payload.email,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined
  };
}
