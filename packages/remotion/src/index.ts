/**
 * Remotion-движок для Web React Player.
 *
 * Пакет собирает видео из TSX-кода прямо в браузере: компилирует композицию
 * (`BrowserTsxCompiler`), накладывает плагины (`RemotionPluginManager`,
 * `AudioMixerPlugin`, `LucideIconsPlugin`, `TailwindPlugin`, `ThreePlugin`),
 * управляет виджетами Vidora (`WidgetRegistry`, `WidgetPropsEngine`) и
 * экспортирует результат в видеофайл через WebCodecs
 * (`WebRendererExportEngine`).
 *
 * Точка входа — {@link createDefaultRemotionSuite}, которая создаёт связанный
 * набор сервисов. Готовый адаптер {@link RemotionPlaybackAdapter} и провайдер
 * {@link RemotionProvider} подключают Remotion к headless-плееру из
 * `@web-react-player/ui`, а {@link ScenarioAdapter} строит сценарий ролика из
 * ответа нейросети.
 *
 * @packageDocumentation
 */

export * from './adapter/RemotionPlaybackAdapter';
export * from './adapters/ScenarioAdapter';
export * from './adapters/VidoraFFmpegService';
export * from './compiler/TsxCompiler';
export * from './exporter/WebRendererExportEngine';
export * from './plugins/AudioMixerPlugin';
export * from './plugins/LucidePlugin';
export * from './plugins/PluginManager';
export * from './plugins/TailwindPlugin';
export * from './plugins/ThreePlugin';
export * from './providers/RemotionProvider';
export * from './RemotionSuite';
export * from './types';
export * from './widgets/types';
export * from './widgets/WidgetPropsEngine';
export * from './widgets/WidgetRegistry';
