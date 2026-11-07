import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const geminiRoute = createSdkRoute(
  ['query', 'prompt', 'q', 'text'],
  value => devWorldBRService.gemini(value)
);
