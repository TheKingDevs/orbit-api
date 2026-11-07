import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const downloadKwaiRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => devWorldBRService.kwai(value)
);
