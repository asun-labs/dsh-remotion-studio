# 文档样片 / Motion studies

这是一组为 Remotion 影棚 README 制作的原创动态图形。设计采用炭黑、纸白、荧光黄与朱红，所有图形使用 React、CSS 和 SVG 编写，不使用外部照片、字体下载、模型接口或用户素材。

这是独立的标准 Remotion 演示工程，不参与插件运行，也不随插件的运行依赖安装。示例验证的是官方 Remotion 的画面预览与渲染，不是宿主内助手生成、服务商调用或插件安装的端到端测试。

## 复现

在此目录执行，使用 Node.js 18 或更新版本（本次使用 24），npm：

```sh
npm ci
npm run studio
```

在终端返回的本机地址打开官方 Studio，选择一个 Composition 播放或逐帧检查。预设端口是 3127；端口被占用时以终端实际返回为准。

生成 README 使用的全部精选素材：

```sh
npm run render
```

默认由 Remotion 下载和管理 Headless Shell。也可以设置 `REMOTION_BROWSER_EXECUTABLE` 为本机兼容 Chromium 的绝对路径，再运行 `npm run render`。这只影响本演示，不改插件配置。

单独输出一支片子：

```sh
npx remotion render src/index.tsx TitleFilm out/title.mp4 --codec=h264
npx remotion render src/index.tsx ProductFilm out/product.mp4 --codec=h264
npx remotion render src/index.tsx DataFilm out/data.mp4 --codec=h264
npx remotion still src/index.tsx TitleFilm out/title.png --frame=90
```

## 素材清单

| Composition | 画幅 | 帧率 | 时长 | 内容 |
| --- | --- | --- | --- | --- |
| `TitleFilm` | 1280 × 720 | 30 fps | 6 s | 排版入场、旋转图形、运动参考线与时间码 |
| `ProductFilm` | 720 × 1280 | 30 fps | 6 s | CSS 绘制的虚构 FORM 物件、悬浮与转动 |
| `DataFilm` | 1280 × 720 | 30 fps | 6 s | 递增数字与柱状图；数值完全是演示数据 |
| `Showreel` | 1280 × 720 | 30 fps | 12 s | 每支样片截取前 4 秒；竖屏样片置于横屏画布中 |
| `Cover` | 1600 × 900 | 静帧 | — | README 封面，复用三支样片的真实 Composition |

输出位置为 [`../media/`](../media/)：四个 H.264 / 4:2:0 MP4、800 × 450 / 10 fps 的合集 GIF，以及四张 PNG。GIF 是压缩展示版本，完整视频保留 30 fps。样片均无声，没有调用 TTS、生图或付费服务。

`studio.png` 是本机运行此演示工程时，官方 Remotion Studio 的实际截图，不是重绘的产品界面。截图不是渲染脚本的输出；更新它需运行 Studio 后另行截取，不包含 API Key 或用户项目。

## 依赖与来源

- Remotion 相关包固定为 `4.0.546`，React 固定为 `19.0.0`；精确安装结果见 `package-lock.json`。
- 动画源码与封面构图为本仓库原创，适用仓库 MIT 许可；FORM 是虚构名称，不表示真实产品案例。
- 使用系统 Arial / Courier New / 中文后备字体，未分发字体文件。不同系统的字体回退可能造成轻微版式差异。
- Remotion 的许可独立于本插件：[官方条款](https://www.remotion.dev/license)。
- 制作与渲染验证平台：Windows；其他平台未实测。
