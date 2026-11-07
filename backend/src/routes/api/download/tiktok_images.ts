import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const downloadTikTokImagesRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => devWorldBRService.tiktokImages(value)
);
