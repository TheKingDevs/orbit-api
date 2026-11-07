import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const downloadFacebookRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => devWorldBRService.facebook(value)
);
