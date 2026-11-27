import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia, renderStill } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 只生成文档展示素材，不读取插件配置、模型密钥或用户工程。
const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, '../media');
if (process.argv.includes('--help')) {
  console.log('生成 README 的真实 Remotion 样片与静帧。\n用法：npm run render\n可选环境变量：REMOTION_BROWSER_EXECUTABLE（本机 Chromium 路径）\n输出：docs/media/。安装依赖后运行，不调用模型服务。');
  process.exit(0);
}
mkdirSync(out, {recursive: true});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;
const serveUrl = await bundle({entryPoint: resolve(root, 'src/index.tsx')});
const compositions = await getCompositions(serveUrl, {browserExecutable});
const find = (id) => {
  const composition = compositions.find(c => c.id === id);
  if (!composition) throw new Error(`未找到 composition：${id}`);
  return composition;
};
for (const [id, name, frame] of [
  ['Cover', 'cover.png', 0],
  ['TitleFilm', 'title-film.png', 90],
  ['ProductFilm', 'product-film.png', 100],
  ['DataFilm', 'data-film.png', 100],
]) {
  await renderStill({serveUrl, composition: find(id), browserExecutable,
    output: resolve(out, name), frame, imageFormat: 'png'});
  console.log(`静帧：${name}`);
}
for (const [id, name] of [
  ['Showreel', 'showreel.mp4'],
  ['TitleFilm', 'title-film.mp4'],
  ['ProductFilm', 'product-film.mp4'],
  ['DataFilm', 'data-film.mp4'],
]) {
  await renderMedia({serveUrl, composition: find(id), browserExecutable, codec: 'h264',
    outputLocation: resolve(out, name), crf: 21, pixelFormat: 'yuv420p', concurrency: 4});
  console.log(`视频：${name}`);
}
await renderMedia({serveUrl, composition: find('Showreel'), browserExecutable, codec: 'gif',
  outputLocation: resolve(out, 'showreel.gif'), everyNthFrame: 3, scale: .625, concurrency: 4});
console.log('动图：showreel.gif');
