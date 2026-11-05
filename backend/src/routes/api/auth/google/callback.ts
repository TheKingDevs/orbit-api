import { timingSafeEqual } from 'node:crypto';
import { db } from '@utils/db.util';
import { User } from '@models/User';
import {
  OAuthError,
  consumeAuthorizationRequest,
  exchangeCodeForIdToken,
  getFrontendUrl,
  verifyGoogleIdToken
} from '@services/oauth.service';
import {
  CSRF_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  sessionManager
} from '@services/session.service';
import {
  isSecureRequest,
  parseCookies,
  redirectWithCookies,
  serializeCookie
} from '@utils/cookies.util';

const STATE_COOKIE_PATH = '/api/auth/google';

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;

  return timingSafeEqual(bufferA, bufferB);
}

function stateCookieOptions(req: Request, maxAge: number) {
  return {
    maxAge,
    path: STATE_COOKIE_PATH,
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'Lax' as const
  };
}

function clearStateCookie(req: Request): string {
  return serializeCookie(OAUTH_STATE_COOKIE, '', stateCookieOptions(req, 0));
}

function redirectToLoginError(req: Request, code: string): Response {
  return redirectWithCookies(
    `${getFrontendUrl('/login')}?error=${encodeURIComponent(code)}`,
    [clearStateCookie(req)]
  );
}

async function resolveUser(profile: {
  subject: string;
  email: string;
  name?: string;
  picture?: string;
}): Promise<User> {
  let user = db.findByGoogleSubject(profile.subject) ?? db.findByEmail(profile.email);

  if (!user) {
    user = await db.addUser({
      id: db.generateId(),
      email: profile.email,
      token: db.generateToken(),
      plan: 'free',
      role: 'public',
      dailyRequests: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      violationCount: 0,
      name: profile.name,
      picture: profile.picture,
      googleSubject: profile.subject
    });
  } else {
    user.email = profile.email;
    user.name = profile.name ?? user.name;
    user.picture = profile.picture ?? user.picture;
    user.googleSubject = profile.subject;
    await db.saveUser(user);
  }

  return user;
}

export async function googleCallbackRoute(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const oauthError = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (oauthError) {
    return redirectToLoginError(req, 'oauth_denied');
  }

  const stateCookie = parseCookies(req.headers.get('cookie'))[OAUTH_STATE_COOKIE];

  if (!code || !state || !stateCookie || !safeEqual(state, stateCookie)) {
    return redirectToLoginError(req, 'invalid_state');
  }

  const transaction = consumeAuthorizationRequest(state);

  if (!transaction) {
    return redirectToLoginError(req, 'invalid_state');
  }

  let user: User;

  try {
    const idToken = await exchangeCodeForIdToken(code, transaction.codeVerifier);
    const profile = await verifyGoogleIdToken(idToken, transaction.nonce);
    user = await resolveUser(profile);
  } catch (error) {
    if (error instanceof OAuthError) {
      return redirectToLoginError(req, error.code);
    }

    return redirectToLoginError(req, 'auth_failed');
  }

  const session = await sessionManager.create(user.id);
  const secure = isSecureRequest(req);
  const maxAge = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));

  const sessionCookie = serializeCookie(SESSION_COOKIE, session.id, {
    maxAge,
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax'
  });

  const csrfCookie = serializeCookie(CSRF_COOKIE, session.csrfToken, {
    maxAge,
    path: '/',
    httpOnly: false,
    secure,
    sameSite: 'Lax'
  });

  return redirectWithCookies(getFrontendUrl('/app'), [
    sessionCookie,
    csrfCookie,
    clearStateCookie(req)
  ]);
}
