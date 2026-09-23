import React from 'react';
import * as Remotion from 'remotion';
import { transform } from 'sucrase';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type { ITsxCompiler, RemotionCompositionConfig } from '../types';

export class BrowserTsxCompiler implements ITsxCompiler {
  constructor(private pluginManager: RemotionPluginManager) {}

  public async compile(
    code: string,
    additionalScope: Record<string, unknown> = {},
  ): Promise<{
    Component: React.ComponentType<Record<string, unknown>>;
    detectedConfig?: Partial<RemotionCompositionConfig>;
  }> {
    const transformedSource = this.pluginManager.applySourceTransforms(code);
    const detectedConfig = this.extractMetadata(transformedSource);

    // Sucrase берет на себя удаление типов, сборку JSX и трансформацию ES-импортов
    let transpiledJs: string;
    try {
      const result = transform(transformedSource, {
        transforms: ['typescript', 'jsx', 'imports'],
        jsxRuntime: 'classic',
        production: true,
      });
      transpiledJs = result.code;
    } catch (err) {
      throw new Error(`[BrowserTsxCompiler] Syntax error: ${(err as Error).message}`);
    }

    const virtualModuleResolver = (moduleName: string): unknown => {
      if (moduleName === 'react') {
        return {
          ...React,
          default: React,
          __esModule: true,
        };
      }
      if (moduleName === 'remotion') {
        return {
          ...Remotion,
          default: Remotion,
          __esModule: true,
        };
      }

      const pluginResolved = this.pluginManager.resolveVirtualModule(moduleName);
      if (pluginResolved) {
        return {
          ...pluginResolved,
          default: pluginResolved,
          __esModule: true,
        };
      }

      if (additionalScope[moduleName]) {
        return additionalScope[moduleName];
      }

      console.warn(
        `[BrowserTsxCompiler] Module "${moduleName}" is not registered. Using empty stub.`,
      );
      return { __esModule: true, default: {} };
    };

    const module: { exports: Record<string, unknown> } = { exports: {} };
    const exports = module.exports;

    // Передаем только изолированный require, module и exports
    const sandboxFunction = new Function('require', 'exports', 'module', 'React', transpiledJs);

    try {
      sandboxFunction(virtualModuleResolver, exports, module, React);
    } catch (err) {
      throw new Error(`[BrowserTsxCompiler] Execution error: ${(err as Error).message}`);
    }

    const ResultComponent = (module.exports.default ||
      module.exports.Animation ||
      module.exports.Composition ||
      module.exports.MyComp ||
      Object.values(module.exports).find((val) => typeof val === 'function')) as
      | React.ComponentType<Record<string, unknown>>
      | undefined;

    if (!ResultComponent) {
      throw new Error('[BrowserTsxCompiler] No React component was exported from the TSX code.');
    }

    return {
      Component: ResultComponent,
      detectedConfig,
    };
  }

  private extractMetadata(source: string): Partial<RemotionCompositionConfig> {
    const config: Partial<RemotionCompositionConfig> = {};
    const durationMatch = source.match(/durationInFrames\s*[:=]\s*(\d+)/);
    const fpsMatch = source.match(/fps\s*[:=]\s*(\d+)/);
    const widthMatch = source.match(/width\s*[:=]\s*(\d+)/);
    const heightMatch = source.match(/height\s*[:=]\s*(\d+)/);

    if (durationMatch) config.durationInFrames = Number.parseInt(durationMatch[1], 10);
    if (fpsMatch) config.fps = Number.parseInt(fpsMatch[1], 10);
    if (widthMatch) config.width = Number.parseInt(widthMatch[1], 10);
    if (heightMatch) config.height = Number.parseInt(heightMatch[1], 10);

    return config;
  }
}
