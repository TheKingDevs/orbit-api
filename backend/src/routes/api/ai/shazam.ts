import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const shazamRoute = createSdkRoute(
  ['url', 'audioUrl', 'audio_url', 'audio', 'link'],
  value => devWorldBRService.shazam(value)
);
