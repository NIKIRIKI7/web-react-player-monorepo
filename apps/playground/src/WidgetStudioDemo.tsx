import {
  createDefaultRemotionSuite,
  type ExportOptions,
  RemotionProvider,
  type RemotionSource,
  type VidoraWidgetDefinition,
  type VidoraWidgetProp,
} from '@web-react-player/remotion';
import { DefaultStandardLayout, PlayerProvider, Root } from '@web-react-player/ui';
import { useMemo, useState } from 'react';
import { SAMPLE_WIDGETS_PACKAGES } from './widgetsData';

// exactOptionalPropertyTypes не даёт присвоить optional-пропу явный undefined,
// поэтому извлекаем непустой набор значений.
type ExportQuality = NonNullable<ExportOptions['quality']>;

// noUncheckedIndexedAccess: первый пакет и первый виджет могут отсутствовать.
const defaultPackage = SAMPLE_WIDGETS_PACKAGES[0];
const defaultWidgets = defaultPackage?.widgets ?? [];
const defaultWidgetId = defaultWidgets[0]?.id ?? 'WordByWordText16x9';

/**
 * Widget Studio — стенд для «Vidora Widget Bundle».
 *
 * Регистрирует JSON-пакеты в WidgetRegistry, компилирует выбранный виджет
 * (результат кэшируется), отдаёт пропсы в плеер как inputProps и умеет
 * экспортировать результат в MP4.
 */
export const WidgetStudioDemo = () => {
  // Регистрируем пакеты синхронно: первый рендер уже должен видеть виджеты,
  // иначе инспектор получит undefined до срабатывания эффекта.
  const suite = useMemo(() => {
    const created = createDefaultRemotionSuite();
    for (const pkg of SAMPLE_WIDGETS_PACKAGES) {
      created.widgetRegistry.register(pkg);
    }
    return created;
  }, []);

  const [selectedWidgetId, setSelectedWidgetId] = useState<string>(defaultWidgetId);
  const [userProps, setUserProps] = useState<Record<string, unknown>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportQuality, setExportQuality] = useState<ExportQuality>('standard');

  const selectedWidget = suite.widgetRegistry.get(selectedWidgetId) as VidoraWidgetDefinition;
  const selectedProps = selectedWidget.props ?? [];

  // Props не меняются во время playback — Remotion сам берёт их из inputProps плеера
  const remotionSource = useMemo<RemotionSource>(
    () => ({
      type: 'widget',
      registry: suite.widgetRegistry,
      widget: selectedWidgetId,
      widgetProps: userProps,
    }),
    [selectedWidgetId, userProps, suite.widgetRegistry],
  );

  const normalizedProps = suite.widgetRegistry.normalizeProps(selectedWidget, userProps);
  const derivedConfig = suite.widgetRegistry.getWidgetConfig(selectedWidget, userProps);
  const durationSeconds = (
    (derivedConfig.durationInFrames ?? 300) / (derivedConfig.fps ?? 30)
  ).toFixed(1);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      const Component = await suite.widgetRegistry.compile(selectedWidget);
      const result = await suite.exporter.exportMedia(
        Component,
        {
          durationInFrames: 240,
          fps: 30,
          width: 1280,
          height: 720,
          ...derivedConfig,
        },
        normalizedProps,
        {
          format: 'mp4',
          quality: exportQuality,
          onProgress: ({ progress }) => setExportProgress(Math.round(progress * 100)),
        },
      );
      result.download(`widget-${selectedWidgetId}.mp4`);
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-2 text-slate-200 font-sans">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Widget Studio (JSON)</h1>
          <p className="text-sm text-slate-400 m-0">
            Источник <code>type: 'widget'</code> — реестр сам собирает композицию из ID виджета и
            скормит пропсы в <code>inputProps</code>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500">
            {selectedProps.length} props · {derivedConfig.width}x{derivedConfig.height} ·{' '}
            {derivedConfig.durationInFrames}f
          </span>
          <button
            type="button"
            onClick={() => setUserProps({})}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold hover:bg-slate-700 transition"
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        <aside className="flex flex-col gap-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest m-0">
            Библиотека
          </h3>
          {defaultWidgets.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                setSelectedWidgetId(w.id);
                setUserProps({});
              }}
              className={`text-left p-3 rounded-xl border transition ${
                w.id === selectedWidgetId
                  ? 'border-indigo-400 bg-indigo-500/15'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
              }`}
            >
              <div className="font-bold text-[13px] text-slate-100">{w.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">{w.description}</div>
            </button>
          ))}
        </aside>

        <section className="flex flex-col gap-4 min-w-0">
          <div
            className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl mx-auto w-full max-w-3xl"
            style={{ aspectRatio: `${derivedConfig.width} / ${derivedConfig.height}` }}
          >
            <PlayerProvider>
              <Root>
                <RemotionProvider
                  source={remotionSource}
                  pluginManager={suite.pluginManager}
                  compiler={suite.compiler}
                />
                <DefaultStandardLayout debug={false} />
              </Root>
            </PlayerProvider>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mt-0 mb-3">
                Property Inspector
              </h3>
              <div className="flex flex-col gap-3">
                {selectedProps.map((prop) => (
                  <PropEditorRow
                    key={prop.name}
                    prop={prop}
                    value={normalizedProps[prop.name]}
                    onChange={(v) => setUserProps((prev) => ({ ...prev, [prop.name]: v }))}
                  />
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 h-fit">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mt-0 mb-3">
                Рендер / Экспорт
              </h3>
              <div className="flex flex-col gap-2 text-[12px] font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Компиляция</span>
                  <span className="text-emerald-400">кэш 1-ый раз (0ms)</span>
                </div>
                <div className="flex justify-between">
                  <span>Формат</span>
                  <span>
                    {derivedConfig.width}x{derivedConfig.height} @ {derivedConfig.fps}fps
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Длительность</span>
                  <span>{durationSeconds}s</span>
                </div>
              </div>
              <select
                value={exportQuality}
                onChange={(e) => setExportQuality(e.target.value as ExportQuality)}
                disabled={isExporting}
                className="w-full mt-4 p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold outline-none disabled:opacity-50"
              >
                <option value="draft">Draft — 1 Mbps</option>
                <option value="standard">Standard — Web</option>
                <option value="high">High — 15 Mbps</option>
              </select>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="w-full mt-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black tracking-wider transition disabled:bg-slate-700 disabled:cursor-wait"
              >
                {isExporting ? `РЕНДЕР... ${exportProgress}%` : 'ЭКСПОРТ В MP4'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const PropEditorRow = ({
  prop,
  value,
  onChange,
}: {
  prop: VidoraWidgetProp;
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  // Color picker для строк, похожих на CSS-цвет
  const isColor = prop.type === 'string' && /^#[0-9a-f]{3,8}$/i.test(String(value ?? ''));

  const inputStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '6px 8px',
    color: '#e2e8f0',
    fontSize: 12,
    width: '100%',
  };

  switch (prop.type) {
    case 'number':
      return (
        <label className="text-[11px] text-slate-400 flex flex-col gap-1">
          <span className="flex justify-between font-mono">
            {prop.name} <span className="text-slate-600">{String(value)}</span>
          </span>
          <input
            type="range"
            min="0"
            max={prop.name.toLowerCase().includes('size') ? 400 : 300}
            value={Number(value ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </label>
      );
    case 'boolean':
      return (
        <label className="text-[11px] text-slate-400 flex items-center gap-2">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-indigo-500"
          />
          <span className="font-mono">{prop.name}</span>
        </label>
      );
    case 'enum':
      return (
        <label className="text-[11px] text-slate-400 flex flex-col gap-1">
          <span className="font-mono">{prop.name}</span>
          <select
            value={String(value ?? prop.default)}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          >
            {(prop.enum_values ?? []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      );
    case 'object':
      return (
        <label className="text-[11px] text-slate-400 flex flex-col gap-1">
          <span className="font-mono">{prop.name} (JSON)</span>
          <textarea
            rows={4}
            value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
          />
        </label>
      );
    default:
      return (
        <label className="text-[11px] text-slate-400 flex flex-col gap-1">
          <span className="font-mono">{prop.name}</span>
          <div className="flex gap-2 items-center">
            {isColor && (
              <input
                type="color"
                value={String(value)}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer shrink-0"
              />
            )}
            <input
              type="text"
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
              style={inputStyle}
            />
          </div>
        </label>
      );
  }
};
