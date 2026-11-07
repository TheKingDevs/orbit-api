import { createSdkRoute } from '@routes/api/sdkHandler';
import { devWorldBRService } from '@services/devworldbr.service';

export const gptRoute = createSdkRoute(
  ['query', 'prompt', 'q', 'text'],
  value => devWorldBRService.gpt(value)
);
