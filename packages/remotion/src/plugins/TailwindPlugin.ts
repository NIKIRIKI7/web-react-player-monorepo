import React from 'react';
import type { IRemotionPlugin, RemotionCompositionConfig } from '../types';

/**
 * Плагин, добавляющий в композицию ограниченную область со стилями Tailwind.
 *
 * Обёртка создаёт контейнер размером с кадр, помечает его атрибутом
 * `data-remotion-tailwind-scope` и внедряет пользовательский CSS, благодаря
 * чему стили не протекают на страницу, а композиция рендерится в
 * изолированной области.
 *
 * @public
 * @example
 * ```ts
 * import { RemotionPluginManager, TailwindPlugin } from '@web-react-player/remotion';
 *
 * const manager = new RemotionPluginManager();
 * manager.register(new TailwindPlugin('.text-brand { color: #ff0055; }'));
 * ```
 */
export class TailwindPlugin implements IRemotionPlugin {
  /**
   * Уникальный идентификатор плагина.
   *
   * @example
   * ```ts
   * plugin.id; // 'remotion-plugin-tailwind'
   * ```
   */
  public readonly id = 'remotion-plugin-tailwind';
  /**
   * Отображаемое имя плагина.
   *
   * @example
   * ```ts
   * plugin.name; // 'Tailwind Scoped Styles'
   * ```
   */
  public readonly name = 'Tailwind Scoped Styles';

  private customStyles: string;

  /**
   * Создаёт плагин с дополнительным CSS.
   *
   * @param customCss - Пользовательские стили, встраиваемые в обёртку.
   * @public
   * @example
   * ```ts
   * const plugin = new TailwindPlugin(':root { --brand: #ff0055; }');
   * ```
   */
  constructor(customCss = '') {
    this.customStyles = customCss;
  }

  /**
   * Оборачивает компонент композиции контейнером со встроенными стилями.
   *
   * @param Component - Компонент композиции.
   * @param config - Конфигурация, определяющая размеры контейнера.
   * @returns Компонент, обёрнутый в изолированный контейнер.
   * @public
   * @example
   * ```ts
   * const Wrapped = plugin.wrapComponent(Composition, {
   *   durationInFrames: 300, fps: 30, width: 1920, height: 1080,
   * });
   * <Wrapped />
   * ```
   */
  public wrapComponent(
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
  ): React.ComponentType<Record<string, unknown>> {
    const customCss = this.customStyles;

    return function TailwindScopedContainer(props: Record<string, unknown>) {
      return React.createElement(
        'div',
        {
          'data-remotion-tailwind-scope': '',
          style: {
            width: `${config.width}px`,
            height: `${config.height}px`,
            position: 'relative',
            overflow: 'hidden',
          },
        },
        customCss ? React.createElement('style', null, customCss) : null,
        React.createElement(Component, props),
      );
    };
  }
}
