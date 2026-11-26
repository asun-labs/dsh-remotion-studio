/**
 * Host half of remotion-studio.
 *
 * Registers the agent tools (Remotion CLI wrappers + provider calls), the
 * settings endpoint used by the Web UI panel, the local provider bridge that
 * carries TTS / image requests from Remotion's browser, and the skill that
 * documents all of it. Remotion itself is only ever invoked through its own CLI
 * inside the user's project, never patched.
 */
import { registerApi, registerBridge } from './src/api.js';
import { setBridgeOrigin } from './src/bridge.js';
import { createStore } from './src/settings.js';
import { registerSkill } from './src/skill.js';
import { registerTools } from './src/tools.js';

export const name = 'remotion-studio';

/** `tools` and `webServer` are required; `credentials` is optional. */
export const inject = ['tools', 'webServer'];

export function apply(ctx, config) {
  const logger = typeof ctx.logger?.warn === 'function' ? ctx.logger : console;
  let credentials;
  try {
    credentials = ctx.get('credentials');
  } catch {
    credentials = undefined;
  }

  const store = createStore({ config, credentials, logger });

  try {
    setBridgeOrigin(ctx.webServer?.getOrigin?.());
  } catch (error) {
    logger?.warn?.(`[remotion-studio] 无法获取 Web 服务地址：${String(error?.message ?? error)}`);
  }

  ctx.effect(() => registerApi(ctx, { store, logger }));
  ctx.effect(() => registerBridge(ctx, { store, logger }));
  ctx.effect(() => registerSkill(ctx, { logger }));
  registerTools(ctx, { store, logger });
}