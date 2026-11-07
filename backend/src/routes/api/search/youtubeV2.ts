import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const ytSearchV2Route = createSdkRoute(
  ['query', 'q', 'search', 'term'],
  value => devWorldBRService.ytSearchV2(value)
);
