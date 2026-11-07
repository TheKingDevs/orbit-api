import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const downloadSoundCloudRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => devWorldBRService.soundcloud(value)
);
