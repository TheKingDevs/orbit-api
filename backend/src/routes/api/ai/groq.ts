import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const groqRoute = createSdkRoute(
  ['query', 'prompt', 'q', 'text'],
  value => devWorldBRService.groq(value)
);
