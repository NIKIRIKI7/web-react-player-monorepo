import * as RemotionMedia from '@remotion/media';
import React from 'react';
import * as Remotion from 'remotion';
import { transform } from 'sucrase';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type {
  AudioMixConfig,
  ITsxCompiler,
  RemotionCompilerOptions,
  RemotionCompositionConfig,
} from '../types';
import {
  createAssetResolver,
  resolveAudioMixAssets,
  validateAudioMixConfig,
} from './assetResolver';
import { RemotionCompilerError } from './RemotionCompilerError';

/**
 * Ошибка компиляции Remotion.
 *
 * Также реэкспортируется из этого модуля для удобства импорта рядом с
 * компилятором, который её выбрасывает.
 *
 * @public
 * @example
 * ```ts
 * import { RemotionCompilerError } from '@web-react-player/remotion';
 *
 * try {
 *   await compiler.compile(code);
 * } catch (error) {
 *   if (error instanceof RemotionCompilerError) console.warn(error.suggestion);
 * }
 * ```
 */
export { RemotionCompilerError };

function normalizeVirtualModule(moduleValue: unknown): unknown {
  if (moduleValue !== null && typeof moduleValue === 'object') {
    const record = moduleValue as Record<string, unknown>;
    return {
      ...record,
      default: record.default ?? record,
      __esModule: record.__esModule ?? true,
    };
  }

  return {
    default: moduleValue,
    __esModule: true,
  };
}

/**
 * Компилятор TSX, работающий прямо в браузере.
 *
 * Исходный код сначала прогоняется через `transformSource` плагинов, затем
 * транспилируется `sucrase` (преобразования `typescript`, `jsx`, `imports`),
 * после чего выполняется в изолированной функции с собранной областью
 * видимости. В область подставляются `react`, `remotion`, `@remotion/media`,
 * модули, предоставленные плагинами, и виртуальные модули.
 *
 * Конфигурация композиции (`fps`, размеры, длительность, аудиомикс)
 * извлекается из скомпилированного кода, а аудиодорожки разрешаются через
 * резолвер ресурсов с белым списком протоколов.
 *
 * @public
 * @example
 * ```ts
 * import { createDefaultRemotionSuite } from '@web-react-player/remotion';
 *
 * const { compiler } = createDefaultRemotionSuite();
 * const { Component, detectedConfig } = await compiler.compile(`
 *   import { AbsoluteFill } from 'remotion';
 *   export const Composition = () => <AbsoluteFill>Привет</AbsoluteFill>;
 * `);
 * console.log(detectedConfig?.fps);
 * ```
 */
export class BrowserTsxCompiler implements ITsxCompiler {
  /**
   * Создаёт компилятор.
   *
   * @param pluginManager - Менеджер плагинов, предоставляющий модули и
   * преобразования исходного кода.
   * @public
   * @example
   * ```ts
   * const { pluginManager, compiler } = createDefaultRemotionSuite();
   * ```
   */
  constructor(private pluginManager: RemotionPluginManager) {}

  /**
   * Компилирует TSX-код в исполняемый компонент композиции.
   *
   * @param code - Исходный код композиции.
   * @param assets - Карта ресурсов, доступных коду.
   * @param additionalScope - Дополнительные модули и значения области видимости.
   * @param options - Параметры разрешения ресурсов и виртуальных модулей.
   * @returns Компонент и конфигурация, распознанная из кода.
   * @throws {@link RemotionCompilerError} при синтаксической ошибке, отсутствии
   * компонента, некорректной конфигурации или сбое во время выполнения.
   * @public
   * @example
   * ```ts
   * const { Component } = await compiler.compile(
   *   code,
   *   { logo: '/media/logo.png' },
   *   { ASSET_BASE_URL: 'https://cdn.example.com/' },
   *   { allowedAssetProtocols: ['https:', 'data:'] },
   * );
   * ```
   */
  public async compile(
    code: string,
    assets: Record<string, string> = {},
    additionalScope: Record<string, unknown> = {},
    options: RemotionCompilerOptions = {},
  ): Promise<{
    Component: React.ComponentType<Record<string, unknown>>;
    detectedConfig?: Partial<RemotionCompositionConfig>;
  }> {
    const transformedSource = this.pluginManager.applySourceTransforms(code);
    const scopeAssetBaseUrl =
      typeof additionalScope.ASSET_BASE_URL === 'string'
        ? additionalScope.ASSET_BASE_URL
        : undefined;
    const resolveAsset = createAssetResolver(assets, options, scopeAssetBaseUrl);

    let transpiledJs: string;
    try {
      const result = transform(transformedSource, {
        transforms: ['typescript', 'jsx', 'imports'],
        jsxRuntime: 'classic',
        production: true,
      });
      transpiledJs = result.code;
    } catch (err) {
      throw new RemotionCompilerError(
        'SyntaxError',
        `Синтаксическая ошибка: ${(err as Error).message}`,
        'Проверьте правильность написания тегов, незакрытые скобки или пропущенные запятые.',
      );
    }

    const virtualModuleResolver = (moduleName: string): unknown => {
      if (moduleName === 'react') {
        return { ...React, default: React, __esModule: true };
      }
      if (moduleName === 'remotion') {
        return {
          ...Remotion,
          default: Remotion,
          __esModule: true,
          // Инжектим VFS (Виртуальную файловую систему) прямо в staticFile Remotion
          staticFile: (assetPath: string) => resolveAsset(assetPath),
        };
      }

      // ДОБАВЛЯЕМ ПОДДЕРЖКУ @remotion/media
      if (moduleName === '@remotion/media') {
        return {
          ...RemotionMedia,
          default: RemotionMedia,
          __esModule: true,
        };
      }

      const pluginResolved = this.pluginManager.resolveVirtualModule(moduleName);
      if (pluginResolved) {
        return { ...pluginResolved, default: pluginResolved, __esModule: true };
      }

      if (options.virtualModules && Object.hasOwn(options.virtualModules, moduleName)) {
        return normalizeVirtualModule(options.virtualModules[moduleName]);
      }

      if (Object.hasOwn(additionalScope, moduleName)) {
        return normalizeVirtualModule(additionalScope[moduleName]);
      }

      return { __esModule: true, default: {} };
    };

    const module: { exports: Record<string, unknown> } = { exports: {} };
    const exports = module.exports;

    // Выполнение кода в изоляции
    // NOSONAR: dynamic evaluation of compiled TSX scene is intentional.
    const sandboxFunction = new Function('require', 'exports', 'module', 'React', transpiledJs); // NOSONAR
    try {
      sandboxFunction(virtualModuleResolver, exports, module, React);
    } catch (err) {
      throw new RemotionCompilerError(
        'RuntimeError',
        `Ошибка выполнения кода: ${(err as Error).message}`,
        'Проверьте, не используете ли вы неизвестные глобальные переменные или импорты без плагинов.',
      );
    }

    // Рефлексия экспортов
    const ResultComponent = (module.exports.default ||
      module.exports.Animation ||
      module.exports.Composition ||
      module.exports.Scene ||
      module.exports.MyComp ||
      Object.values(module.exports).find((val) => typeof val === 'function')) as
      | React.ComponentType<Record<string, unknown>>
      | undefined;

    if (!ResultComponent) {
      throw new RemotionCompilerError(
        'MissingComponentError',
        'Не найден React-компонент в экспортах.',
        'Добавьте компонент и экспортируйте его. Например: export const MyAnimation = () => { ... }',
      );
    }

    let detectedConfig: Partial<RemotionCompositionConfig> = {};
    const exportedConfig = module.exports.config || module.exports.compositionConfig;

    if (exportedConfig) {
      detectedConfig = this.validateConfig(exportedConfig);

      // Относительные пути аудио ("bg-music.mp3") прогоняем через VFS,
      // чтобы AudioMixerPlugin получил уже готовые URL.
      if (detectedConfig.audioMix) {
        detectedConfig.audioMix = resolveAudioMixAssets(detectedConfig.audioMix, resolveAsset);
      }
    }

    return {
      Component: ResultComponent,
      detectedConfig,
    };
  }

  // Строгая валидация конфигурации без внешних библиотек
  private validateConfig(config: unknown): Partial<RemotionCompositionConfig> {
    if (typeof config !== 'object' || config === null) {
      throw new RemotionCompilerError(
        'InvalidConfigError',
        'Конфигурация должна быть объектом.',
        'Убедитесь, что вы экспортируете объект: export const config = { fps: 30, ... }',
      );
    }

    const result: Partial<RemotionCompositionConfig> = {};
    const errors: string[] = [];
    const c = config as Record<string, unknown>;

    if ('fps' in c) {
      if (typeof c.fps !== 'number' || c.fps <= 0) {
        errors.push('fps должен быть положительным числом');
      } else {
        result.fps = c.fps;
      }
    }

    if ('durationInFrames' in c) {
      if (typeof c.durationInFrames !== 'number' || c.durationInFrames <= 0) {
        errors.push('durationInFrames должен быть положительным числом');
      } else {
        result.durationInFrames = c.durationInFrames;
      }
    }

    if ('width' in c) {
      if (typeof c.width !== 'number' || c.width <= 0) {
        errors.push('width должен быть положительным числом');
      } else {
        result.width = c.width;
      }
    }

    if ('height' in c) {
      if (typeof c.height !== 'number' || c.height <= 0) {
        errors.push('height должен быть положительным числом');
      } else {
        result.height = c.height;
      }
    }

    // Валидация звукового слоя: ловит опечатки в audioMix до рендера
    const audioMix: AudioMixConfig | undefined = validateAudioMixConfig(c.audioMix);
    if (audioMix) {
      result.audioMix = audioMix;
    }

    if (errors.length > 0) {
      throw new RemotionCompilerError(
        'InvalidConfigError',
        `Ошибки валидации конфигурации: ${errors.join('; ')}`,
        'Проверьте поля экспортируемого объекта config или compositionConfig.',
      );
    }

    return result;
  }
}
