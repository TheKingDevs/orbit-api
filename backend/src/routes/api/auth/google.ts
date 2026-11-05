import { OAuthError, createAuthorizationRequest, getFrontendUrl } from '@services/oauth.service';
import { OAUTH_STATE_COOKIE } from '@services/session.service';
import { isSecureRequest, redirectWithCookies, serializeCookie } from '@utils/cookies.util';

const STATE_COOKIE_MAX_AGE = 10 * 60;

export async function googleAuthRoute(req: Request): Promise<Response> {
  try {
    const { url, state } = createAuthorizationRequest();

    const stateCookie = serializeCookie(OAUTH_STATE_COOKIE, state, {
      maxAge: STATE_COOKIE_MAX_AGE,
      path: '/api/auth/google',
      httpOnly: true,
      secure: isSecureRequest(req),
      sameSite: 'Lax'
    });

    return redirectWithCookies(url, [stateCookie]);
  } catch (error) {
    if (error instanceof OAuthError) {
      return redirectWithCookies(`${getFrontendUrl('/login')}?error=${encodeURIComponent(error.code)}`);
    }

    throw error;
  }
}
