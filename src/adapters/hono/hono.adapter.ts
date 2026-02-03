import { CONTRACT_ENDPOINT_PREFIX } from './hono.constants';
import { contractRouter } from './hono.routes';

export async function contractMiddleware() {
  // Middleware to handle requests under the /contract prefix.

  return async (c: any, next: any) => {
    // Ignore requests that do not start with the contract prefix.
    if (!c.req.path.startsWith(CONTRACT_ENDPOINT_PREFIX)) return next();

    const url = new URL(c.req.url); // Strip prefix: /contract/get → /get
    url.pathname = url.pathname.replace(CONTRACT_ENDPOINT_PREFIX, '') || '/';
    return contractRouter.fetch(new Request(url.toString(), c.req.raw));
  };
}
