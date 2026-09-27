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
export * from './types';
export * from './widgets/types';
export * from './widgets/WidgetPropsEngine';
export * from './widgets/WidgetRegistry';

import { BrowserTsxCompiler } from './compiler/TsxCompiler';
import { WebRendererExportEngine } from './exporter/WebRendererExportEngine';
import { AudioMixerPlugin } from './plugins/AudioMixerPlugin';
import { LucideIconsPlugin } from './plugins/LucidePlugin';
import { RemotionPluginManager } from './plugins/PluginManager';
import { TailwindPlugin } from './plugins/TailwindPlugin';
import { ThreePlugin } from './plugins/ThreePlugin';
import { WidgetRegistry } from './widgets/WidgetRegistry';

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
