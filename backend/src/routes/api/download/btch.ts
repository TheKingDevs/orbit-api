import { createSdkRoute } from '@routes/api/sdkHandler';
import { btchDownloaderService } from '@services/btchDownloader.service';

export const downloadSpotifyRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => btchDownloaderService.download('spotify', value)
);

export const downloadThreadsRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => btchDownloaderService.download('threads', value)
);

export const downloadGoogleDriveRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => btchDownloaderService.download('google-drive', value)
);

export const downloadCapCutRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => btchDownloaderService.download('capcut', value)
);

export const downloadTwitterRoute = createSdkRoute(
  ['url', 'link', 'URL'],
  value => btchDownloaderService.download('twitter', value)
);
