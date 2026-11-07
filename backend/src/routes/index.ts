import { publicWelcomeRoute } from './public/welcome';
import { storageRoute } from './public/storage';
import { ttpPreviewRoute } from './public/ttpPreview';
import { htmlToImageAssetRoute } from './public/htmlToImageAsset';

import { downloadPlayAudioRoute } from './api/download/play_audio';
import { downloadPlayVideoRoute } from './api/download/play_video';
import { downloadYtdlAudioRoute } from './api/download/ytdl_audio';
import { downloadYtdlVideoRoute } from './api/download/ytdl_video';
import { downloadPinterestRoute } from './api/download/pinterest';
import { downloadInstagramRoute } from './api/download/instagram';
import { downloadTikTokAudioRoute } from './api/download/tiktok_audio';
import { downloadTikTokVideoRoute } from './api/download/tiktok_video';
import { downloadTikTokImagesRoute } from './api/download/tiktok_images';
import { downloadKwaiRoute } from './api/download/kwai';
import { downloadFacebookRoute } from './api/download/facebook';
import { downloadSoundCloudRoute } from './api/download/soundcloud';

import { shazamRoute } from './api/ai/shazam';
import { gptRoute } from './api/ai/gpt';
import { groqRoute } from './api/ai/groq';
import { geminiRoute } from './api/ai/gemini';

import { ytSearchRoute } from './api/search/youtube';
import { ytSearchV2Route } from './api/search/youtubeV2';

import { canvasWelcomeRoute } from './api/canvas/welcome';
import { canvasGoodbyeRoute } from './api/canvas/goodbye';
import { canvasTtpRoute } from './api/canvas/ttp';
import { canvasAttpRoute } from './api/canvas/attp';
import { canvasEffectsRoute } from './api/canvas/effects';
import { stickerTtpRoute } from './api/sticker/ttp';
import { stickerAttpRoute } from './api/sticker/attp';
import { stickerAbratRoute } from './api/sticker/abrat';
import { toGifRoute } from './api/utility/to-gif';
import { stickerBratRoute } from './api/sticker/brat';

import { transcribeRoute } from './api/transcribe';

import { userBalanceRoute } from './api/user/balance';
import { userKeyRoute } from './api/user/key';
import { userUsageRoute } from './api/user/usage';

import { googleAuthRoute } from './api/auth/google';
import { googleCallbackRoute } from './api/auth/google/callback';
import { authSessionRoute } from './api/auth/session';
import { authLogoutRoute } from './api/auth/logout';

import { userManagerRoute } from './admin/userManager';
import { managerKeysRoute } from './admin/managerKeys';

import { deleteUserRoute } from './owner/deleteUser';
import { updatePlanRoute } from './owner/updatePlan';

import { NotFoundError } from '@errors/index';

export async function router(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === 'GET' && path === '/') {
    return publicWelcomeRoute();
  }

  // --- STORAGE ---
  if ((req.method === 'GET' || req.method === 'HEAD') && path.startsWith('/storage/')) {
    return storageRoute(req, url);
  }

  // --- TTP PREVIEW ---
  if (req.method === 'GET' && path === '/preview/ttp') return ttpPreviewRoute();
  if (req.method === 'GET' && path === '/assets/html-to-image.js') return htmlToImageAssetRoute();

  // --- API USER & BALANCE ---
  if (req.method === 'GET' && path === '/api/user/key') return userKeyRoute(req);
  if (req.method === 'GET' && path === '/api/user/usage') return userUsageRoute(req, url);
  if (path === '/api/user/balance') return userBalanceRoute(req);

  // --- API AUTH (Google OAuth) ---
  if (req.method === 'GET' && path === '/api/auth/google') return googleAuthRoute(req);
  if (req.method === 'GET' && path === '/api/auth/google/callback') return googleCallbackRoute(req);
  if (req.method === 'GET' && path === '/api/auth/session') return authSessionRoute(req);
  if (req.method === 'POST' && path === '/api/auth/logout') return authLogoutRoute(req);

  // --- API DOWNLOADS ---
  if (path === '/api/download/play_audio') return downloadPlayAudioRoute(req, url);
  if (path === '/api/download/play_video') return downloadPlayVideoRoute(req, url);
  if (path === '/api/download/ytdl_audio') return downloadYtdlAudioRoute(req, url);
  if (path === '/api/download/ytdl_video') return downloadYtdlVideoRoute(req, url);
  if (path === '/api/download/pinterest') return downloadPinterestRoute(req, url);
  if (path === '/api/download/instagram') return downloadInstagramRoute(req, url);
  if (path === '/api/download/tiktok_audio') return downloadTikTokAudioRoute(req, url);
  if (path === '/api/download/tiktok_video') return downloadTikTokVideoRoute(req, url);
  if (path === '/api/download/tiktok_images' || path === '/api/download/tiktok_slides') return downloadTikTokImagesRoute(req, url);
  if (path === '/api/download/kwai') return downloadKwaiRoute(req, url);
  if (path === '/api/download/facebook') return downloadFacebookRoute(req, url);
  if (path === '/api/download/soundcloud') return downloadSoundCloudRoute(req, url);

  // --- API AI ---
  if (path === '/api/ai/shazam' || path === '/api/shazam') return shazamRoute(req, url);
  if (path === '/api/ai/gpt' || path === '/api/gpt') return gptRoute(req, url);
  if (path === '/api/ai/groq' || path === '/api/groq') return groqRoute(req, url);
  if (path === '/api/ai/gemini' || path === '/api/gemini') return geminiRoute(req, url);

  // --- API SEARCH ---
  if (path === '/api/search/youtube' || path === '/api/ytsearch') return ytSearchRoute(req, url);
  if (path === '/api/search/youtube/v2' || path === '/api/ytsearch_v2') return ytSearchV2Route(req, url);
  // --- API STICKER ---
  if (path === '/api/sticker/ttp') return stickerTtpRoute(req, url);
  if (path === '/api/sticker/attp') return stickerAttpRoute(req, url);
  if (path === '/api/sticker/brat') return stickerBratRoute(req, url);
  if (path === '/api/sticker/abrat') return stickerAbratRoute(req, url);
  if (path === '/api/utility/to-gif') return toGifRoute(req, url);

  // --- API CANVAS ---
  if (path === '/api/canvas/welcome') return canvasWelcomeRoute(req, url);
  if (path === '/api/canvas/goodbye') return canvasGoodbyeRoute(req, url);
  if (path === '/api/canvas/ttp' || path === '/api/ttp') return canvasTtpRoute(req, url);
  if (path === '/api/canvas/attp' || path === '/api/attp') return canvasAttpRoute(req, url);
  if (path === '/api/canvas/effects') return canvasEffectsRoute(req, url);
  if (path === '/api/transcribe' || path === '/api/audio/transcribe') return transcribeRoute(req, url);

  // --- ADMIN ---
  if (path === '/api/admin/users') return userManagerRoute(req);
  if (path === '/api/admin/keys') return managerKeysRoute(req);

  // --- OWNER ---
  if (path === '/api/owner/delete-user') return deleteUserRoute(req, url);
  if (path === '/api/owner/update-plan') return updatePlanRoute(req, url);

  throw new NotFoundError(`Página "${path}" não encontrada.`);
}
