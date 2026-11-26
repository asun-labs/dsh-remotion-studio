/**
 * Web half of remotion-studio: one settings page (设置 → Remotion 影棚).
 *
 * Rendered as plain React inside the harness (no iframe), styled exclusively
 * with `--dsw-alias-*` theme tokens, talking to the Host over the same-origin
 * `/dsh-remotion/api` endpoint registered by src/api.js.
 */
window.__ModuleLoader__.load({
  id: 'remotion-studio',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'remotion-studio';
    const API = '/dsh-remotion/api';

    const DICT = {
      zh: {
        nav: 'Remotion 影棚',
        title: 'Remotion 影棚',
        subtitle: '基于官方 Remotion 的视频生成环境：项目、渲染、配音与配图。',
        save: '保存',
        saving: '保存中…',
        reset: '恢复默认',
        saved: '设置已保存',
        loadFailed: '读取设置失败',
        groupProject: '项目与输出',
        groupTts: '配音服务（TTS）',
        groupImage: '生图服务',
        groupStatus: '环境与项目',
        projectsDir: '项目目录',
        projectsDirHint: '新项目与已有 Remotion 工程所在目录，支持 ~ 开头',
        outDir: '输出目录',
        outDirHint: '相对路径相对项目目录，例如 out',
        codec: '默认编码',
        concurrency: '并发数',
        concurrencyHint: '0 表示由 Remotion 决定',
        extraFlags: '附加渲染参数',
        extraFlagsHint: '例如 --crf=16 --audio-codec=aac',
        timeout: '渲染超时（毫秒）',
        registry: 'npm 源',
        version: '新建项目使用的 Remotion 版本',
        chrome: '浏览器',
        chromeDownload: '由 Remotion 自动下载',
        chromePath: '使用本机 Chrome',
        chromePathLabel: 'Chrome 可执行文件路径',
        baseURL: '服务地址（OpenAI 兼容 baseURL）',
        path: '接口路径',
        model: '模型',
        voice: '音色',
        format: '输出格式',
        size: '图片尺寸',
        extraBody: '附加请求体（JSON）',
        extraBodyHint: '会合并进请求 body，用于服务商特有参数',
        apiKey: 'API Key',
        keySet: '已配置',
        keyUnset: '未配置',
        saveKey: '保存密钥',
        clearKey: '清除',
        test: '测试连通性',
        testing: '测试中…',
        doctor: '检查环境',
        checking: '检查中…',
        projects: '已有项目',
        noProjects: '还没有项目。让助手创建，或在聊天里说「新建一个 Remotion 项目」。',
        installed: '依赖已安装',
        notInstalled: '依赖未安装',
        settingsFile: '配置文件',
        runtime: '运行环境',
        emptyBase: '未配置服务商时，渲染与项目功能仍可用，只是不能自动配音/配图。',
        keySaved: '密钥已保存',
        keyCleared: '密钥已清除',
        resetDone: '已恢复默认设置',
        openDir: '打开项目目录',
        creator: '创作面板',
        groupStudio: '创作面板（预览与时间轴）',
        groupStudioHint: 'Studio 会启动该项目自带的官方 remotion studio 开发服务器，就绪后自动用浏览器打开；画面、时间轴轨道、属性面板全部是 Remotion 原版界面。',
        autoOpen: '自动打开浏览器',
        autoOpenHint: 'Studio 就绪后自动用系统默认浏览器打开；关闭后只能手动点「启动 Studio」或复制地址。',
        studioProject: '项目',
        studioOpened: 'Studio 已打开：',
        studioStarting: '正在启动 Studio…',
        studioReady: 'Studio 已就绪',
        studioStopped: '未启动',
        studioFailed: '启动失败',
        studioStart: '启动 Studio',
        studioReload: '刷新画面',
        studioOpenTab: '新标签打开',
        studioStop: '停止',
        studioEmpty: '选一个项目后，这里会载入官方 Remotion Studio：画面预览、时间轴轨道、属性面板、逐帧调试都在其中，功能和本地跑 remotion studio 完全一致。',
        studioNoProject: '还没有 Remotion 项目。对助手说「新建一个 Remotion 项目」，创建好再回到这里。',
        studioSettingsHint: '配音 / 生图服务商在 设置 → Remotion 影棚 里配置。',
      },
      en: {
        nav: 'Remotion Studio',
        title: 'Remotion Studio',
        subtitle: 'Video production on top of official Remotion: projects, rendering, voice-over and images.',
        save: 'Save',
        saving: 'Saving…',
        reset: 'Reset to defaults',
        saved: 'Settings saved',
        loadFailed: 'Failed to load settings',
        groupProject: 'Projects & output',
        groupTts: 'Text to speech',
        groupImage: 'Image generation',
        groupStatus: 'Environment & projects',
        projectsDir: 'Projects directory',
        projectsDirHint: 'Where new and existing Remotion projects live; ~ is expanded',
        outDir: 'Output folder',
        outDirHint: 'Relative to the project, e.g. out',
        codec: 'Default codec',
        concurrency: 'Concurrency',
        concurrencyHint: '0 lets Remotion decide',
        extraFlags: 'Extra render flags',
        extraFlagsHint: 'e.g. --crf=16 --audio-codec=aac',
        timeout: 'Render timeout (ms)',
        registry: 'npm registry',
        version: 'Remotion version for new projects',
        chrome: 'Browser',
        chromeDownload: 'Downloaded by Remotion',
        chromePath: 'Local Chrome',
        chromePathLabel: 'Chrome executable path',
        baseURL: 'Base URL (OpenAI-compatible)',
        path: 'Endpoint path',
        model: 'Model',
        voice: 'Voice',
        format: 'Format',
        size: 'Image size',
        extraBody: 'Extra request body (JSON)',
        extraBodyHint: 'Merged into the request body for provider-specific options',
        apiKey: 'API key',
        keySet: 'Configured',
        keyUnset: 'Not configured',
        saveKey: 'Save key',
        clearKey: 'Clear',
        test: 'Test connection',
        testing: 'Testing…',
        doctor: 'Check environment',
        checking: 'Checking…',
        projects: 'Projects',
        noProjects: 'No projects yet. Ask the assistant to scaffold one.',
        installed: 'dependencies installed',
        notInstalled: 'dependencies missing',
        settingsFile: 'Settings file',
        runtime: 'Runtime',
        emptyBase: 'Without a provider the renderer and projects still work — only voice-over and images are unavailable.',
        keySaved: 'API key saved',
        keyCleared: 'API key cleared',
        resetDone: 'Defaults restored',
        openDir: 'Open projects folder',
        creator: 'Creator',
        groupStudio: 'Creator panel (preview & timeline)',
        groupStudioHint: 'Starts the official remotion studio dev server of the selected project and opens it in your browser once it is ready; preview, timeline tracks and props panel are all stock Remotion.',
        autoOpen: 'Open browser automatically',
        autoOpenHint: 'Open the default browser as soon as the Studio is reachable. Turn off to start it only on demand.',
        studioProject: 'Project',
        studioOpened: 'Studio opened:',
        studioStarting: 'Starting Studio…',
        studioReady: 'Studio ready',
        studioStopped: 'Not running',
        studioFailed: 'Start failed',
        studioStart: 'Start Studio',
        studioReload: 'Reload view',
        studioOpenTab: 'Open in new tab',
        studioStop: 'Stop',
        studioEmpty: 'Pick a project and the official Remotion Studio loads here: preview, timeline tracks, props panel and frame stepping, identical to running remotion studio locally.',
        studioNoProject: 'No Remotion project yet. Ask the assistant to scaffold one, then come back.',
        studioSettingsHint: 'Voice-over and image providers are configured under Settings → Remotion Studio.',
      },
    };

    const css = `
.dshrs-root{display:flex;flex-direction:column;gap:18px;width:720px;max-width:100%;font-size:13px;color:var(--dsw-alias-label-primary)}
.dshrs-head{display:flex;flex-direction:column;gap:6px}
.dshrs-title{font-size:16px;font-weight:600}
.dshrs-sub{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.6}
.dshrs-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:16px;display:flex;flex-direction:column;gap:12px}
.dshrs-card-title{font-size:13px;font-weight:600}
.dshrs-row{display:flex;align-items:flex-start;gap:12px}
.dshrs-label{width:190px;flex:none;font-size:12px;color:var(--dsw-alias-label-secondary);padding-top:7px;line-height:1.5}
.dshrs-control{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.dshrs-input,.dshrs-select,.dshrs-area{width:100%;box-sizing:border-box;height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;font-family:inherit;outline:none}
.dshrs-area{height:68px;padding:8px 10px;resize:vertical;line-height:1.5}
.dshrs-box{width:16px;height:16px;margin-top:8px;accent-color:var(--dsw-alias-label-primary);cursor:pointer}
.dshrs-input:focus,.dshrs-select:focus,.dshrs-area:focus{border-color:var(--dsw-alias-border-l3)}
.dshrs-hint{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.5}
.dshrs-inline{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dshrs-btn{height:32px;padding:0 14px;border-radius:16px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;font-family:inherit}
.dshrs-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.dshrs-btn:disabled{opacity:.5;cursor:default}
.dshrs-btn-primary{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-button-primary-label)}
.dshrs-btn-primary:hover{opacity:.9;background:var(--dsw-alias-button-primary-fill)}
.dshrs-btn-sm{height:28px;padding:0 10px;border-radius:14px}
.dshrs-badge{font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary)}
.dshrs-badge-on{color:var(--dsw-alias-label-primary)}
.dshrs-foot{display:flex;align-items:center;gap:12px;position:sticky;bottom:0;padding:12px 0;background:var(--dsw-alias-bg-layer-1)}
.dshrs-msg{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.dshrs-msg-err{color:var(--dsw-alias-label-error,#e5484d)}
.dshrs-list{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dshrs-check{display:flex;gap:8px;font-size:12px;line-height:1.6}
.dshrs-preview{max-width:180px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2)}
.dshrs-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--dsw-alias-label-tertiary);word-break:break-all}
.dshrs-panel{height:100%;box-sizing:border-box;overflow:auto;padding:28px 32px 56px}
.dshrs-panelbar{display:flex;gap:12px;align-items:center;max-width:720px;margin-bottom:16px}
.dshrs-panel-embed{display:flex;flex-direction:column;height:100%;padding:0;overflow:hidden}
.dshrs-panel-embed .dshrs-panelbar{max-width:none;margin:0;padding:9px 14px;flex:none;gap:10px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dshrs-panel-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}
.dshrs-select-sm{height:28px;width:auto;max-width:220px;border-radius:8px}
.dshrs-spacer{flex:1}
.dshrs-stage{position:relative;flex:1;min-height:0;background:var(--dsw-alias-bg-layer-2)}
.dshrs-frame{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#fff}
.dshrs-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px;text-align:center;font-size:13px;line-height:1.7;color:var(--dsw-alias-label-secondary)}
.dshrs-empty p{max-width:520px;margin:0}
.dshrs-note{padding:8px 14px;font-size:12px;flex:none;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary)}
`;

    function createT(ctx) {
      const locale = ctx.locale;
      if (locale && typeof locale.bind === 'function' && typeof locale.register === 'function') {
        try {
          ctx.effect(() => locale.register(NS, DICT));
          const bound = locale.bind(NS);
          return (key) => {
            try {
              const value = bound(key);
              return value && value !== key ? value : DICT.zh[key] || key;
            } catch {
              return DICT.zh[key] || key;
            }
          };
        } catch {
          /* fall through */
        }
      }
      return (key) => DICT.zh[key] || key;
    }

    async function call(action, payload) {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...(payload ?? {}) }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || `HTTP ${response.status}`);
      if (json && json.ok === false) throw new Error(json.error || '操作失败');
      return json;
    }

    const EDITABLE = [
      'projectsDir',
      'outDir',
      'defaultCodec',
      'concurrency',
      'extraRenderFlags',
      'timeoutMs',
      'npmRegistry',
      'remotionVersion',
      'chromeMode',
      'chromePath',
      'autoOpenStudio',
    ];

    function draftFrom(settings) {
      const draft = {};
      for (const key of EDITABLE) draft[key] = settings[key];
      draft.concurrency = Number(settings.concurrency ?? 0);
      draft.timeoutMs = Number(settings.timeoutMs ?? 3600000);
      draft.autoOpenStudio = settings.autoOpenStudio !== false;
      draft.providers = {
        tts: { ...(settings.providers?.tts ?? {}) },
        image: { ...(settings.providers?.image ?? {}) },
      };
      return draft;
    }

    const CODECS = ['h264', 'h265', 'vp8', 'vp9', 'prores', 'gif', 'mp3', 'wav', 'aac', 'flac'];

    function SettingsPage() {
      const [snapshot, setSnapshot] = React.useState(null);
      const [draft, setDraft] = React.useState(null);
      const [busy, setBusy] = React.useState('');
      const [message, setMessage] = React.useState('');
      const [error, setError] = React.useState('');
      const [checks, setChecks] = React.useState(null);
      const [tests, setTests] = React.useState({});
      const [secretInput, setSecretInput] = React.useState({ tts: '', image: '' });
      const [studioProject, setStudioProject] = React.useState('');
      const t = tGlobal;

      const applySnapshot = (state) => {
        if (!state) return;
        setSnapshot(state);
        setDraft(draftFrom(state.settings ?? {}));
      };

      const load = React.useCallback(async () => {
        setError('');
        try {
          applySnapshot(await call('getState'));
        } catch (caught) {
          setError(`${t('loadFailed')}：${String(caught?.message ?? caught)}`);
        }
      }, [t]);

      React.useEffect(() => {
        void load();
      }, [load]);

      if (!draft || !snapshot) {
        return h('div', { className: 'dshrs-root' }, h('style', { 'data-plugin-css': NS }, css), h('div', { className: 'dshrs-msg' }, error || '…'));
      }

      const setField = (key) => (event) => {
        const value = event.target.value;
        setDraft((current) => ({ ...current, [key]: key === 'concurrency' || key === 'timeoutMs' ? Number(value) : value }));
        setMessage('');
      };

      const setFlag = (key) => (event) => {
        const checked = Boolean(event.target.checked);
        setDraft((current) => ({ ...current, [key]: checked }));
        setMessage('');
      };

      const setProvider = (provider, key) => (event) => {
        const value = event.target.value;
        setDraft((current) => ({
          ...current,
          providers: { ...current.providers, [provider]: { ...current.providers[provider], [key]: value } },
        }));
        setMessage('');
      };

      const save = async () => {
        setBusy('save');
        setError('');
        try {
          const next = await call('saveSettings', { patch: draft });
          applySnapshot(next);
          setMessage(t('saved'));
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const reset = async () => {
        setBusy('reset');
        try {
          applySnapshot(await call('reset'));
          setMessage(t('resetDone'));
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const saveSecret = async (provider) => {
        setBusy(`key-${provider}`);
        try {
          applySnapshot(await call('setSecret', { provider, value: secretInput[provider] }));
          setSecretInput((current) => ({ ...current, [provider]: '' }));
          setMessage(t('keySaved'));
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const clearSecret = async (provider) => {
        setBusy(`key-${provider}`);
        try {
          applySnapshot(await call('clearSecret', { provider }));
          setMessage(t('keyCleared'));
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const runTest = async (provider) => {
        setBusy(`test-${provider}`);
        setTests((current) => ({ ...current, [provider]: null }));
        try {
          const result = await call('testProvider', { provider });
          setTests((current) => ({ ...current, [provider]: { ok: true, detail: result.detail, preview: result.preview } }));
        } catch (caught) {
          setTests((current) => ({ ...current, [provider]: { ok: false, detail: String(caught?.message ?? caught) } }));
        } finally {
          setBusy('');
        }
      };

      const runDoctor = async () => {
        setBusy('doctor');
        setChecks(null);
        try {
          const result = await call('doctor', {});
          setChecks(result.checks ?? []);
        } catch (caught) {
          setChecks([{ name: 'error', ok: false, detail: String(caught?.message ?? caught) }]);
        } finally {
          setBusy('');
        }
      };

      const row = (label, hint, control) =>
        h(
          'div',
          { className: 'dshrs-row' },
          h('div', { className: 'dshrs-label' }, label),
          h('div', { className: 'dshrs-control' }, control, hint ? h('div', { className: 'dshrs-hint' }, hint) : null),
        );

      const input = (value, onChange, extra) =>
        h('input', { className: 'dshrs-input', value: value ?? '', onChange, ...(extra ?? {}) });

      const providerCard = (provider, fields, titleKey) => {
        const config = draft.providers[provider] ?? {};
        const status = snapshot.settings?.providers?.[provider]?.apiKeyConfigured;
        const test = tests[provider];
        return h(
          'div',
          { className: 'dshrs-card' },
          h(
            'div',
            { className: 'dshrs-inline' },
            h('div', { className: 'dshrs-card-title' }, t(titleKey)),
            h('span', { className: `dshrs-badge${status ? ' dshrs-badge-on' : ''}` }, status ? t('keySet') : t('keyUnset')),
          ),
          h('div', { className: 'dshrs-hint' }, t('emptyBase')),
          ...fields.map((field) =>
            row(
              field.label,
              field.hint,
              field.type === 'area'
                ? h('textarea', { className: 'dshrs-area', value: config[field.key] ?? '', onChange: setProvider(provider, field.key) })
                : input(config[field.key] ?? '', setProvider(provider, field.key), field.type === 'number' ? { type: 'number' } : undefined),
            ),
          ),
          row(
            t('apiKey'),
            null,
            h(
              'div',
              { className: 'dshrs-inline' },
              h('input', {
                className: 'dshrs-input',
                style: { flex: '1', minWidth: '160px' },
                type: 'password',
                placeholder: status ? '••••••••' : '',
                value: secretInput[provider] ?? '',
                onChange: (event) => setSecretInput((current) => ({ ...current, [provider]: event.target.value })),
              }),
              h(
                'button',
                {
                  className: 'dshrs-btn dshrs-btn-sm',
                  disabled: busy !== '' || (secretInput[provider] ?? '').trim() === '',
                  onClick: () => saveSecret(provider),
                },
                t('saveKey'),
              ),
              h(
                'button',
                { className: 'dshrs-btn dshrs-btn-sm', disabled: busy !== '' || !status, onClick: () => clearSecret(provider) },
                t('clearKey'),
              ),
              h(
                'button',
                { className: 'dshrs-btn dshrs-btn-sm', disabled: busy !== '', onClick: () => runTest(provider) },
                busy === `test-${provider}` ? t('testing') : t('test'),
              ),
            ),
          ),
          test
            ? h(
                'div',
                { className: 'dshrs-check' },
                h('span', null, test.ok ? '✅' : '❌'),
                h('div', null, test.detail, test.preview ? h('div', null, h('img', { className: 'dshrs-preview', src: test.preview })) : null),
              )
            : null,
        );
      };

      const projects = snapshot.projects ?? [];
      const selectedStudio = studioProject || projects[0]?.name || '';

      const launchStudio = async () => {
        if (!selectedStudio) return;
        setBusy('studio');
        setError('');
        setMessage('');
        try {
          const result = await call('studioStart', { project: selectedStudio });
          if (!result?.url) throw new Error('未返回 Studio 地址');
          if (!result.ready) {
            setError(`${t('studioStarting')} ${result.url}`);
          } else if (result.autoOpen) {
            setMessage(`${t('studioOpened')} ${result.url}`);
          } else {
            window.open(result.url, '_blank', 'noopener');
            setMessage(`${t('studioOpened')} ${result.url}`);
          }
        } catch (caught) {
          setError(String(caught?.message ?? caught));
        } finally {
          setBusy('');
        }
      };

      const studioCard = h(
        'div',
        { className: 'dshrs-card' },
        h('div', { className: 'dshrs-card-title' }, t('groupStudio')),
        h('div', { className: 'dshrs-hint' }, t('groupStudioHint')),
        row(
          t('autoOpen'),
          t('autoOpenHint'),
          h('input', {
            type: 'checkbox',
            className: 'dshrs-box',
            checked: draft.autoOpenStudio !== false,
            onChange: setFlag('autoOpenStudio'),
          }),
        ),
        row(
          t('studioProject'),
          null,
          h(
            'div',
            { className: 'dshrs-inline' },
            projects.length
              ? h(
                  'select',
                  { className: 'dshrs-select dshrs-select-sm', value: selectedStudio, onChange: (event) => setStudioProject(event.target.value) },
                  ...projects.map((project) => h('option', { key: project.name, value: project.name }, project.name)),
                )
              : h('span', { className: 'dshrs-hint' }, t('noProjects')),
            h(
              'button',
              {
                className: 'dshrs-btn dshrs-btn-sm dshrs-btn-primary',
                disabled: busy !== '' || !selectedStudio,
                onClick: launchStudio,
              },
              busy === 'studio' ? t('studioStarting') : t('studioStart'),
            ),
          ),
        ),
      );

      return h(
        'div',
        { className: 'dshrs-root' },
        h('style', { 'data-plugin-css': NS }, css),
        h(
          'div',
          { className: 'dshrs-head' },
          h('div', { className: 'dshrs-title' }, t('title')),
          h('div', { className: 'dshrs-sub' }, t('subtitle')),
        ),
        studioCard,
        h(
          'div',
          { className: 'dshrs-card' },
          h('div', { className: 'dshrs-card-title' }, t('groupProject')),
          row(t('projectsDir'), t('projectsDirHint'), input(draft.projectsDir, setField('projectsDir'))),
          h('div', { className: 'dshrs-mono' }, snapshot.paths?.projectsDirAbs ?? ''),
          row(t('outDir'), t('outDirHint'), input(draft.outDir, setField('outDir'))),
          row(
            t('codec'),
            null,
            h(
              'select',
              { className: 'dshrs-select', value: draft.defaultCodec, onChange: setField('defaultCodec') },
              ...CODECS.map((codec) => h('option', { key: codec, value: codec }, codec)),
            ),
          ),
          row(t('concurrency'), t('concurrencyHint'), input(draft.concurrency, setField('concurrency'), { type: 'number', min: 0 })),
          row(t('extraFlags'), t('extraFlagsHint'), input(draft.extraRenderFlags, setField('extraRenderFlags'))),
          row(t('timeout'), null, input(draft.timeoutMs, setField('timeoutMs'), { type: 'number', min: 1000 })),
          row(t('registry'), null, input(draft.npmRegistry, setField('npmRegistry'))),
          row(t('version'), null, input(draft.remotionVersion, setField('remotionVersion'))),
          row(
            t('chrome'),
            null,
            h(
              'select',
              { className: 'dshrs-select', value: draft.chromeMode, onChange: setField('chromeMode') },
              h('option', { value: 'download' }, t('chromeDownload')),
              h('option', { value: 'path' }, t('chromePath')),
            ),
          ),
          draft.chromeMode === 'path' ? row(t('chromePathLabel'), null, input(draft.chromePath, setField('chromePath'))) : null,
        ),
        providerCard(
          'tts',
          [
            { key: 'baseURL', label: t('baseURL') },
            { key: 'path', label: t('path') },
            { key: 'model', label: t('model') },
            { key: 'voice', label: t('voice') },
            { key: 'format', label: t('format') },
            { key: 'extraBody', label: t('extraBody'), hint: t('extraBodyHint'), type: 'area' },
          ],
          'groupTts',
        ),
        providerCard(
          'image',
          [
            { key: 'baseURL', label: t('baseURL') },
            { key: 'path', label: t('path') },
            { key: 'model', label: t('model') },
            { key: 'size', label: t('size') },
            { key: 'extraBody', label: t('extraBody'), hint: t('extraBodyHint'), type: 'area' },
          ],
          'groupImage',
        ),
        h(
          'div',
          { className: 'dshrs-card' },
          h('div', { className: 'dshrs-card-title' }, t('groupStatus')),
          h(
            'div',
            { className: 'dshrs-inline' },
            h('button', { className: 'dshrs-btn dshrs-btn-sm', disabled: busy !== '', onClick: runDoctor }, busy === 'doctor' ? t('checking') : t('doctor')),
          ),
          checks
            ? h(
                'div',
                { className: 'dshrs-list' },
                ...checks.map((check, index) =>
                  h('div', { className: 'dshrs-check', key: `${check.name}-${index}` }, h('span', null, check.ok ? '✅' : '❌'), h('div', null, h('strong', null, check.name), ' · ', String(check.detail))),
                ),
              )
            : null,
          h('div', { className: 'dshrs-hint' }, t('projects')),
          projects.length === 0
            ? h('div', { className: 'dshrs-hint' }, t('noProjects'))
            : h(
                'div',
                { className: 'dshrs-list' },
                ...projects.map((project) =>
                  h(
                    'div',
                    { key: project.path },
                    h('strong', null, project.name),
                    ` · ${project.remotion ?? '?'} · ${project.installed ? t('installed') : t('notInstalled')}`,
                    h('div', { className: 'dshrs-mono' }, project.path),
                  ),
                ),
              ),
          h('div', { className: 'dshrs-mono' }, `${t('settingsFile')}: ${snapshot.paths?.settingsFile ?? ''}`),
          h('div', { className: 'dshrs-mono' }, `${t('runtime')}: Node ${snapshot.runtime?.node ?? '?'} · ${snapshot.runtime?.platform ?? ''}`),
        ),
        h(
          'div',
          { className: 'dshrs-foot' },
          h('button', { className: 'dshrs-btn dshrs-btn-primary', disabled: busy !== '', onClick: save }, busy === 'save' ? t('saving') : t('save')),
          h('button', { className: 'dshrs-btn', disabled: busy !== '', onClick: reset }, t('reset')),
          h('div', { className: `dshrs-msg${error ? ' dshrs-msg-err' : ''}` }, error || message),
        ),
      );
    }

    let injectCtx = null;
    let tGlobal = (key) => DICT.zh[key] || key;

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        injectCtx = ctx;
        tGlobal = createT(ctx);
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register({ name: 'settings.section', id: NS, order: 60, label: () => tGlobal('nav') }, SettingsPage),
        );
      },
    };
  },
});