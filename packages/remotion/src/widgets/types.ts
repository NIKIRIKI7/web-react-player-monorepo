/**
 * Тип свойства виджета Vidora.
 *
 * - `string` — строка;
 * - `number` — число;
 * - `boolean` — флаг;
 * - `enum` — одно из фиксированных значений (см. `enum_values`);
 * - `object` — вложенный объект.
 *
 * @public
 * @example
 * ```ts
 * import type { WidgetPropType } from '@web-react-player/remotion';
 *
 * const type: WidgetPropType = 'enum';
 * ```
 */
export type WidgetPropType = 'string' | 'number' | 'boolean' | 'enum' | 'object';

/**
 * Описание одного свойства виджета.
 *
 * Используется для построения форм настройки и валидации пропсов перед
 * рендерингом.
 *
 * @public
 * @example
 * ```ts
 * import type { VidoraWidgetProp } from '@web-react-player/remotion';
 *
 * const prop: VidoraWidgetProp = {
 *   name: 'accent',
 *   type: 'enum',
 *   required: true,
 *   default: '#ff0000',
 *   enum_values: ['#ff0000', '#00ff00'],
 *   description: 'Акцентный цвет',
 * };
 * ```
 */
export interface VidoraWidgetProp {
  /**
   * Имя свойства.
   *
   * @example
   * ```ts
   * name: 'title'
   * ```
   */
  name: string;
  /**
   * Тип значения свойства.
   *
   * @example
   * ```ts
   * type: 'string'
   * ```
   */
  type: WidgetPropType;
  /**
   * Обязательно ли свойство для рендеринга.
   *
   * @example
   * ```ts
   * required: true
   * ```
   */
  required?: boolean;
  /**
   * Значение по умолчанию.
   *
   * @example
   * ```ts
   * default: 24
   * ```
   */
  default?: unknown;
  /**
   * Допустимые значения для типа `enum`.
   *
   * @example
   * ```ts
   * enum_values: ['light', 'dark']
   * ```
   */
  enum_values?: string[];
  /**
   * Человекочитаемое описание свойства.
   *
   * @example
   * ```ts
   * description: 'Заголовок нижней третьей плашки'
   * ```
   */
  description?: string;
}

/**
 * Описание виджета Vidora.
 *
 * Хранит метаданные для реестра и TSX-код компонента, который будет
 * отрисован при выборе виджета в композиции.
 *
 * @public
 * @example
 * ```ts
 * import type { VidoraWidgetDefinition } from '@web-react-player/remotion';
 *
 * const widget: VidoraWidgetDefinition = {
 *   id: 'lower-third',
 *   name: 'Lower Third',
 *   category: 'text',
 *   description: 'Плашка с заголовком',
 *   tags: ['title', 'intro'],
 *   tsx_code: 'export const LowerThird = () => null;',
 *   default_props: { title: 'Заголовок' },
 * };
 * ```
 */
export interface VidoraWidgetDefinition {
  /**
   * Уникальный идентификатор виджета.
   *
   * @example
   * ```ts
   * id: 'lower-third'
   * ```
   */
  id: string;
  /**
   * Отображаемое имя виджета.
   *
   * @example
   * ```ts
   * name: 'Lower Third'
   * ```
   */
  name: string;
  /**
   * Категория для группировки в интерфейсе выбора.
   *
   * @example
   * ```ts
   * category: 'text'
   * ```
   */
  category?: string;
  /**
   * Описание назначения виджета.
   *
   * @example
   * ```ts
   * description: 'Плашка с заголовком и подписью'
   * ```
   */
  description?: string;
  /**
   * Путь импорта компонента виджета.
   *
   * @example
   * ```ts
   * import_path: './widgets/LowerThird'
   * ```
   */
  import_path?: string;
  /**
   * Является ли виджет пользовательским.
   *
   * @example
   * ```ts
   * is_custom: true
   * ```
   */
  is_custom?: boolean;
  /**
   * Схема свойств виджета.
   *
   * @example
   * ```ts
   * props: [{ name: 'title', type: 'string', required: true }]
   * ```
   */
  props?: VidoraWidgetProp[];
  /**
   * Значения пропсов по умолчанию.
   *
   * @example
   * ```ts
   * default_props: { title: 'Заголовок', subtitle: 'Подпись' }
   * ```
   */
  default_props?: Record<string, unknown>;
  /**
   * Пример использования виджета для документации.
   *
   * @example
   * ```ts
   * example_snippet: '<LowerThird title="Эпизод 1" />'
   * ```
   */
  example_snippet?: string;
  /**
   * Теги для поиска по виджетам.
   *
   * @example
   * ```ts
   * tags: ['title', 'intro', 'caption']
   * ```
   */
  tags?: string[];
  /**
   * TSX-код компонента виджета.
   *
   * @example
   * ```ts
   * tsx_code: 'export const LowerThird = ({ title }) => <div>{title}</div>;'
   * ```
   */
  tsx_code: string;
}

/**
 * Формат обмена виджетами: пакет с версией схемы и списком определений.
 *
 * @public
 * @example
 * ```ts
 * import type { VidoraWidgetPackage } from '@web-react-player/remotion';
 *
 * const pkg: VidoraWidgetPackage = {
 *   vidora_schema_version: '1.0',
 *   exported_at: '2026-01-01T00:00:00Z',
 *   generator: 'vidora',
 *   widgets: [widget],
 * };
 * ```
 */
export interface VidoraWidgetPackage {
  /**
   * Версия схемы виджетов.
   *
   * @example
   * ```ts
   * vidora_schema_version: '1.0'
   * ```
   */
  vidora_schema_version?: string;
  /**
   * Дата и время экспорта пакета в ISO 8601.
   *
   * @example
   * ```ts
   * exported_at: '2026-01-01T00:00:00Z'
   * ```
   */
  exported_at?: string;
  /**
   * Название инструмента, сгенерировавшего пакет.
   *
   * @example
   * ```ts
   * generator: 'vidora'
   * ```
   */
  generator?: string;
  /**
   * Определения всех виджетов в пакете.
   *
   * @example
   * ```ts
   * widgets: [lowerThird, caption]
   * ```
   */
  widgets: VidoraWidgetDefinition[];
}
