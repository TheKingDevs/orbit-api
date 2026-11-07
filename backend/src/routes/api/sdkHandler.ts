import { authMiddleware } from '@middlewares/authMiddleware';
import { assertReadMethod, jsonResponse, readRequestParam } from '@utils/request.util';

export type SdkParamHandler = (value: string | undefined) => Promise<unknown>;

export function createSdkRoute(
  paramNames: string[],
  execute: SdkParamHandler
): (req: Request, url: URL) => Promise<Response> {
  return async (req: Request, url: URL): Promise<Response> => {
    assertReadMethod(req);
    authMiddleware(req);

    const value = await readRequestParam(req, url, paramNames);
    const result = await execute(value);

    return jsonResponse(result);
  };
}
