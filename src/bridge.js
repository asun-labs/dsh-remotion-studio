/**
 * Local provider bridge.
 *
 * Composition code runs inside Remotion's Chrome (origin http://localhost:3000),
 * so calling a model provider directly from there is subject to that provider's
 * CORS policy — many reject browser origins outright. It would also require the
 * API key to be written into the project folder.
 *
 * Instead the plugin exposes a small loopback endpoint. Before every render the
 * plugin writes the endpoint plus a per-process token into
 * `public/dsh-providers.json`; the composition posts to it and the Host performs
 * the actual provider call with the stored key. Cross-origin is allowed only for
 * localhost origins and only with that token, so no other page can borrow it.
 */
import { randomBytes } from 'node:crypto';

export const BRIDGE_PATH = '/dsh-remotion/bridge';

const TOKEN = randomBytes(24).toString('hex');

let origin = '';

/** Remember where the Harness web server is listening (set once, at apply). */
export function setBridgeOrigin(value) {
  origin = typeof value === 'string' ? value.replace(/\/+$/, '') : '';
}

/** What composition code needs to reach the bridge. */
export function bridgeInfo() {
  return {
    url: origin ? `${origin}${BRIDGE_PATH}` : '',
    token: TOKEN,
  };
}

export function isBridgeToken(value) {
  if (typeof value !== 'string' || value.length !== TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < TOKEN.length; i += 1) diff |= TOKEN.charCodeAt(i) ^ value.charCodeAt(i);
  return diff === 0;
}

/** Only Remotion's local dev server (Studio / renderer) may talk to the bridge. */
export function isLocalOrigin(value) {
  if (!value) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(value);
}