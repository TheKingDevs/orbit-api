import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const ytSearchRoute = createSdkRoute(
  ['query', 'q', 'search', 'term'],
  value => devWorldBRService.ytSearch(value)
);
