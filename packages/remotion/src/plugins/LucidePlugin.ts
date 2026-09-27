import * as LucideIcons from 'lucide-react';
import React from 'react';
import type { IRemotionPlugin } from '../types';

/**
 * Плагин, предоставляющий иконки `lucide-react` коду композиции.
 *
 * Импорт `lucide-react` из TSX разрешается в безопасный прокси поверх
 * установленной библиотеки. Если иконка с запрошенным именем не существует,
 * вместо неё возвращается нейтральная заглушка-иконка, чтобы сбой в
 * пользовательском коде не ломал весь рендеринг.
 *
 * @public
 * @example
 * ```tsx
 * import { createDefaultRemotionSuite } from '@web-react-player/remotion';
 *
 * const { compiler } = createDefaultRemotionSuite();
 * const { Component } = await compiler.compile(
 *   `import { Play } from 'lucide-react';
 *    export const Composition = () => <Play size={48} />;`,
 * );
 * ```
 */
export class LucideIconsPlugin implements IRemotionPlugin {
  /**
   * Уникальный идентификатор плагина.
   *
   * @example
   * ```ts
   * plugin.id; // 'remotion-plugin-lucide'
   * ```
   */
  public readonly id = 'remotion-plugin-lucide';
  /**
   * Отображаемое имя плагина.
   *
   * @example
   * ```ts
   * plugin.name; // 'Lucide Icons Provider'
   * ```
   */
  public readonly name = 'Lucide Icons Provider';

  /**
   * Разрешает импорт `lucide-react` в безопасный прокси иконок.
   *
   * @param moduleName - Имя импортируемого модуля.
   * @returns Прокси экспортов иконок либо `null` для других модулей.
   * @public
   * @example
   * ```ts
   * const icons = plugin.resolveImports('lucide-react');
   * const unrelated = plugin.resolveImports('three'); // null
   * ```
   */
  public resolveImports(moduleName: string): Record<string, unknown> | null {
    if (moduleName === 'lucide-react') {
      return this.createSafeProxy(LucideIcons as Record<string, unknown>);
    }
    return null;
  }

  private createSafeProxy(target: Record<string, unknown>): Record<string, unknown> {
    return new Proxy(target, {
      get(obj, prop: string) {
        if (prop in obj) {
          return obj[prop];
        }
        // Fallback-компонент, если запрошена несуществующая иконка
        return function FallbackIcon(props: React.SVGProps<SVGSVGElement>) {
          return React.createElement(
            'svg',
            {
              viewBox: '0 0 24 24',
              width: 24,
              height: 24,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              ...props,
            },
            React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
            React.createElement('line', { x1: 12, y1: 8, x2: 12, y2: 12 }),
            React.createElement('line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }),
          );
        };
      },
    });
  }
}
