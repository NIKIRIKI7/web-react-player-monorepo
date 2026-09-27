import { BrowserTsxCompiler } from './compiler/TsxCompiler';
import { WebRendererExportEngine } from './exporter/WebRendererExportEngine';
import { AudioMixerPlugin } from './plugins/AudioMixerPlugin';
import { LucideIconsPlugin } from './plugins/LucidePlugin';
import { RemotionPluginManager } from './plugins/PluginManager';
import { TailwindPlugin } from './plugins/TailwindPlugin';
import { ThreePlugin } from './plugins/ThreePlugin';
import { WidgetRegistry } from './widgets/WidgetRegistry';

/**
 * Создаёт стандартный набор Remotion-сервисов.
 *
 * Плагины регистрируются в порядке: иконки Lucide, Tailwind с пользовательским
 * CSS, поддержка Three.js и аудиомикшер. Компилятор и экспортер получают общий
 * менеджер плагинов, а реестр виджетов — общий компилятор, поэтому все
 * сервисы сразу согласованы между собой.
 *
 * Экземпляры следует создавать один раз: повторный вызов создаёт новые
 * сервисы с пустым кэшем скомпилированных виджетов.
 *
 * @param customCss - Дополнительный CSS, добавляемый плагином Tailwind.
 * @returns Связанный набор сервисов: менеджер плагинов, компилятор, экспортёр
 * и реестр виджетов.
 * @public
 * @example
 * ```ts
 * import { createDefaultRemotionSuite } from '@web-react-player/remotion';
 *
 * const suite = createDefaultRemotionSuite('.my-brand { color: #f43f5e; }');
 *
 * const { Component, detectedConfig } = await suite.compiler.compile(`
 *   import { AbsoluteFill } from 'remotion';
 *   export const Composition = () => <AbsoluteFill className="my-brand">Ролик</AbsoluteFill>;
 * `);
 *
 * const result = await suite.exporter.exportMedia(
 *   Component,
 *   { ...detectedConfig, durationInFrames: 150, fps: 30, width: 1920, height: 1080 },
 *   {},
 *   { format: 'mp4', quality: 'high' },
 * );
 * result.download('video.mp4');
 * ```
 *
 * @example
 * ```ts
 * // Установка собственного плагина поверх стандартного набора
 * const suite = createDefaultRemotionSuite();
 * suite.pluginManager.register({
 *   id: 'remotion-plugin-logos',
 *   name: 'Brand Logos',
 *   resolveImports: (name) => (name === 'brand-logos' ? { Logo } : null),
 *   transformSource: (code) => code,
 * });
 * ```
 */
export function createDefaultRemotionSuite(customCss = '') {
  const pluginManager = new RemotionPluginManager();

  pluginManager.register(new LucideIconsPlugin());
  pluginManager.register(new TailwindPlugin(customCss));
  pluginManager.register(new ThreePlugin());
  pluginManager.register(new AudioMixerPlugin());

  const compiler = new BrowserTsxCompiler(pluginManager);
  const exporter = new WebRendererExportEngine(pluginManager);
  const widgetRegistry = new WidgetRegistry(compiler);

  return {
    pluginManager,
    compiler,
    exporter,
    widgetRegistry,
  };
}
