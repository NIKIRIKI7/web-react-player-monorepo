import type { RemotionCompositionConfig } from '../compositionConfig';
import type { VidoraWidgetDefinition, VidoraWidgetProp } from './types';

/**
 * Движок нормализации пропсов виджетов Vidora.
 *
 * Содержит три чистые функции: слияние значений по умолчанию с
 * пользовательскими переопределениями, приведение значений к типам из схемы
 * свойств и вывод конфигурации композиции по тегам и пропсам виджета.
 *
 * @public
 * @example
 * ```ts
 * import { WidgetPropsEngine, type VidoraWidgetDefinition } from '@web-react-player/remotion';
 *
 * const widget: VidoraWidgetDefinition = {
 *   id: 'shorts-overlay',
 *   name: 'Shorts Overlay',
 *   tags: ['shorts'],
 *   tsx_code: 'export const C = () => null;',
 *   props: [{ name: 'fontSize', type: 'number', default: 24 }],
 * };
 *
 * const props = WidgetPropsEngine.normalizeProps(widget, { fontSize: '32' });
 * const config = WidgetPropsEngine.deriveCompositionConfig(widget, props);
 * ```
 */
export const WidgetPropsEngine = {
  /**
   * Сливает default_props виджета, дефолты из схемы props и пользовательские overrides.
   * Производит приведение типов (string -\> number, JSON parsing для списков и т.д.).
   *
   * Значения по умолчанию берутся сначала из `default_props` виджета, затем
   * из `default` в схеме свойств. Пользовательские значения `undefined`
   * игнорируются, а известные ключи приводятся к типам из схемы. Ключи, не
   * описанные в `props`, передаются как есть.
   *
   * @param widget - Определение виджета.
   * @param userProps - Значения, заданные пользователем или инспектором.
   * @returns Итоговый набор пропсов.
   * @public
   * @example
   * ```ts
   * WidgetPropsEngine.normalizeProps(widget, { fontSize: '32', animate: 'true' });
   * // { fontSize: 32, animate: true, ...остальные default_props }
   * ```
   */
  normalizeProps(
    widget: VidoraWidgetDefinition,
    userProps: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      ...(widget.default_props ?? {}),
    };

    // Дополняем дефолтами из схемы props, если их не было в default_props
    if (Array.isArray(widget.props)) {
      for (const propDef of widget.props) {
        if (result[propDef.name] === undefined && propDef.default !== undefined) {
          result[propDef.name] = propDef.default;
        }
      }
    }

    // Применяем пользовательские переопределения с нормализацией типов
    for (const [key, value] of Object.entries(userProps)) {
      if (value === undefined) continue;

      const propDef = widget.props?.find((p) => p.name === key);
      if (propDef) {
        result[key] = WidgetPropsEngine.coerceValue(propDef, value);
      } else {
        result[key] = value;
      }
    }

    return result;
  },

  /**
   * Приведение значения к типу, указанному в схеме пропа
   *
   * Поддерживаются `number`, `boolean`, `enum`, `string` и `object`.
   * Значение, которое не удаётся привести, заменяется значением по
   * умолчанию: `number` — `default` или `0`, `enum` — `default` или первое
   * значение из `enum_values`. Для `object` строка разбирается как JSON, а
   * при ошибке парсинга возвращается как есть.
   *
   * @param propDef - Описание свойства из `props`.
   * @param value - Значение, приведённое к типу свойства.
   * @returns Приведённое значение.
   * @public
   * @example
   * ```ts
   * WidgetPropsEngine.coerceValue({ name: 'count', type: 'number', default: 0 }, '42'); // 42
   * WidgetPropsEngine.coerceValue({ name: 'align', type: 'enum', enum_values: ['left', 'right'] }, 'top'); // 'left'
   * ```
   */
  coerceValue(propDef: VidoraWidgetProp, value: unknown): unknown {
    if (value === null || value === undefined) {
      return propDef.default ?? null;
    }

    switch (propDef.type) {
      case 'number': {
        const num = Number(value);
        return Number.isFinite(num) ? num : (propDef.default ?? 0);
      }
      case 'boolean': {
        if (typeof value === 'boolean') return value;
        return value === 'true' || value === '1' || value === 1;
      }
      case 'enum': {
        const str = String(value);
        if (propDef.enum_values && !propDef.enum_values.includes(str)) {
          return propDef.default ?? propDef.enum_values[0];
        }
        return str;
      }
      case 'string': {
        return typeof value === 'string' ? value : String(value);
      }
      case 'object': {
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
      default:
        return value;
    }
  },

  /**
   * Определяет конфигурацию Remotion композиции (разрешение, fps, кадры) на основе тегов и пропсов виджета
   *
   * Вертикальный формат 1080x1920 выбирается, если идентификатор виджета
   * содержит `9x16` либо в тегах есть `9:16`, `shorts`, `reels` или
   * `tiktok`; иначе используется горизонтальный 1920x1080. Длительность
   * берётся из пропса `durationFrames` и по умолчанию равна 300 кадрам.
   *
   * @param widget - Определение виджета.
   * @param normalizedProps - Нормализованные пропсы виджета.
   * @returns Частичная конфигурация композиции.
   * @public
   * @example
   * ```ts
   * WidgetPropsEngine.deriveCompositionConfig(shortsWidget, { durationFrames: 150 });
   * // { width: 1080, height: 1920, fps: 30, durationInFrames: 150 }
   * ```
   */
  deriveCompositionConfig(
    widget: VidoraWidgetDefinition,
    normalizedProps: Record<string, unknown> = {},
  ): Partial<RemotionCompositionConfig> {
    const is9x16 =
      widget.id.includes('9x16') ||
      widget.tags?.includes('9:16') ||
      widget.tags?.includes('shorts') ||
      widget.tags?.includes('reels') ||
      widget.tags?.includes('tiktok');

    const durationFrames = Number(
      normalizedProps.durationFrames || widget.default_props?.durationFrames || 300,
    );

    return {
      width: is9x16 ? 1080 : 1920,
      height: is9x16 ? 1920 : 1080,
      fps: 30,
      durationInFrames:
        Number.isFinite(durationFrames) && durationFrames > 0 ? durationFrames : 300,
    };
  },
};
