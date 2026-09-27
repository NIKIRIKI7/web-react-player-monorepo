import type { RemotionCompositionConfig } from '../compositionConfig';
import type { VidoraWidgetDefinition, VidoraWidgetProp } from './types';

export const WidgetPropsEngine = {
  /**
   * Сливает default_props виджета, дефолты из схемы props и пользовательские overrides.
   * Производит приведение типов (string -\> number, JSON parsing для списков и т.д.).
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
