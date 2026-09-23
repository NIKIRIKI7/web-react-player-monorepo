export * from './adapter/RemotionPlaybackAdapter';
export * from './compiler/TsxCompiler';
export * from './exporter/WebRendererExportEngine';
export * from './plugins/LucidePlugin';
export * from './plugins/PluginManager';
export * from './plugins/TailwindPlugin';
export * from './plugins/ThreePlugin';
export * from './types';

import { BrowserTsxCompiler } from './compiler/TsxCompiler';
import { WebRendererExportEngine } from './exporter/WebRendererExportEngine';
import { LucideIconsPlugin } from './plugins/LucidePlugin';
import { RemotionPluginManager } from './plugins/PluginManager';
import { TailwindPlugin } from './plugins/TailwindPlugin';
import { ThreePlugin } from './plugins/ThreePlugin';

export function createDefaultRemotionSuite(customCss = '') {
  const pluginManager = new RemotionPluginManager();
  pluginManager.register(new LucideIconsPlugin());
  pluginManager.register(new TailwindPlugin(customCss));
  pluginManager.register(new ThreePlugin());

  const compiler = new BrowserTsxCompiler(pluginManager);
  const exporter = new WebRendererExportEngine(pluginManager);

  return {
    pluginManager,
    compiler,
    exporter,
  };
}
