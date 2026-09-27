import type { IRemotionPlugin, PluginPreflightContext } from '../types';

interface GlobalWithThree {
  THREE?: Record<string, unknown>;
}

/**
 * Плагин поддержки Three.js и 3D-объектов.
 *
 * Разрешает импорты `three` и `@remotion/three` через глобальный объект
 * `THREE`, который должен быть загружен на страницу заранее. Перед
 * компиляцией проверяет наличие WebGL, а накопленные GPU-ресурсы освобождает
 * через `dispose`.
 *
 * @public
 * @example
 * ```ts
 * import { createDefaultRemotionSuite } from '@web-react-player/remotion';
 *
 * const { pluginManager } = createDefaultRemotionSuite();
 * pluginManager.unregister('remotion-plugin-three'); // отключить 3D
 * ```
 */
export class ThreePlugin implements IRemotionPlugin {
  /**
   * Уникальный идентификатор плагина.
   *
   * @example
   * ```ts
   * plugin.id; // 'remotion-plugin-three'
   * ```
   */
  public readonly id = 'remotion-plugin-three';
  /**
   * Отображаемое имя плагина.
   *
   * @example
   * ```ts
   * plugin.name; // 'Three.js & 3D Objects Support'
   * ```
   */
  public readonly name = 'Three.js & 3D Objects Support';

  private threeInstances: Array<{ dispose?: () => void }> = [];

  /**
   * Разрешает импорты `three` и `@remotion/three` из глобального объекта.
   *
   * @param moduleName - Имя импортируемого модуля.
   * @returns Экспорты `THREE` (с полем `default`) либо `null`.
   * @public
   * @example
   * ```ts
   * const three = plugin.resolveImports('three');
   * ```
   */
  public resolveImports(moduleName: string): Record<string, unknown> | null {
    if (moduleName === 'three' || moduleName === '@remotion/three') {
      const globalWithThree = globalThis as unknown as GlobalWithThree;
      const globalThree = globalWithThree.THREE;
      if (globalThree) {
        return {
          ...globalThree,
          default: globalThree,
        };
      }
    }
    return null;
  }

  /**
   * Проверяет наличие WebGL перед компиляцией.
   *
   * @param _context - Контекст проверки; не используется.
   * @throws Если в браузере отсутствует `WebGLRenderingContext`.
   * @public
   * @example
   * ```ts
   * await plugin.preflight({ config, inputProps: {} });
   * ```
   */
  public async preflight(_context: PluginPreflightContext): Promise<void> {
    if (typeof window !== 'undefined' && !('WebGLRenderingContext' in window)) {
      throw new Error('[ThreePlugin] WebGL is not supported in this environment');
    }
  }

  /**
   * Регистрирует 3D-ресурс для последующего освобождения.
   *
   * @param instance - Объект с необязательным методом `dispose`.
   * @public
   * @example
   * ```ts
   * plugin.registerInstance({ dispose: () => renderer.dispose() });
   * ```
   */
  public registerInstance(instance: { dispose?: () => void }): void {
    this.threeInstances.push(instance);
  }

  /**
   * Освобождает все зарегистрированные GPU-ресурсы.
   *
   * Ошибки `dispose` игнорируются, чтобы утилизация одного ресурса не
   * прерывала освобождение остальных.
   *
   * @public
   * @example
   * ```ts
   * plugin.dispose();
   * ```
   */
  public dispose(): void {
    for (const inst of this.threeInstances) {
      try {
        inst.dispose?.();
      } catch {
        // Игнорируем ошибки утилизации ресурсов GPU
      }
    }
    this.threeInstances = [];
  }
}
