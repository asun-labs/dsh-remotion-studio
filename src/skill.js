/**
 * The skill layer.
 *
 * A DSH plugin can hand the agent three separate things: the integration form
 * (this bundle), the tools that do the work, and a manual that explains when and
 * how to use those tools. The manual ships as `skill/remotion-studio.md` and is
 * registered at runtime through the Host `skills` service, so it appears in every
 * session's skill catalog without touching the user's own skill directories.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, '..');
const MANUAL = join(PACKAGE_ROOT, 'skill', 'remotion-studio.md');

export const SKILL_NAME = 'remotion-studio';

const DESCRIPTION =
  'Make videos with the official Remotion CLI through the remotion-studio plugin: scaffold a project, write compositions, render video or stills, preview in Remotion Studio, and add TTS voice-over or generated images from the providers configured in DSH settings.';

const WHEN_TO_USE =
  'Use when the user wants a video, animation, title sequence, captioned clip or data-viz animation built with React/Remotion, or wants to render, preview or re-cut an existing Remotion project.';

function buildSkill() {
  const content = readFileSync(MANUAL, 'utf8');
  return {
    name: SKILL_NAME,
    description: DESCRIPTION,
    whenToUse: WHEN_TO_USE,
    content,
    source: 'runtime',
    resourceBase: { kind: 'directory', path: PACKAGE_ROOT },
    invocation: { modelInvocable: true, userInvocable: true },
  };
}

/**
 * Register the manual into the calling context's skill layer.
 * `skills` is treated as optional so the plugin still works on a Host that does
 * not expose it.
 * @returns {() => void} disposer (registered through ctx.effect by the caller)
 */
export function registerSkill(ctx, { logger } = {}) {
  let skills;
  try {
    skills = ctx.get('skills');
  } catch {
    skills = undefined;
  }
  if (!skills || typeof skills.register !== 'function') {
    logger?.warn?.('[remotion-studio] 宿主没有 skills 服务，跳过说明书注册（工具仍可用）');
    return () => undefined;
  }
  let skill;
  try {
    skill = buildSkill();
  } catch (error) {
    logger?.warn?.(`[remotion-studio] 读取说明书失败：${String(error?.message ?? error)}`);
    return () => undefined;
  }
  return ctx.effect(() => skills.register(skill));
}