import type React from 'react';
import type { RemotionAssetResolver, RemotionCompositionConfig } from './compositionConfig';
import type { VidoraWidgetDefinition } from './widgets/types';
import type { WidgetRegistry } from './widgets/WidgetRegistry';

export * from './compositionConfig';
export * from './widgets/types';

/**
 * Описание источника композиции для Remotion.
 *
 * Поддерживаются три способа задать композицию:
 *
 * - `component` — готовый React-компонент;
 * - `code` — TSX-исходник, компилируемый в браузере;
 * - `widget` — зарегистрированный виджет из {@link WidgetRegistry}.
 *
 * @public
 * @example Готовый компонент
 * ```tsx
 * const source: RemotionSource = {
 *   type: 'component',
 *   component: MyComposition,
 *   inputProps: { title: 'Ролик' },
 * };
 * ```
 *
 * @example TSX-код
 * ```ts
 * const source: RemotionSource = {
 *   type: 'code',
 *   code: 'export const Composition = () => <div>Привет</div>;',
 *   assets: { logo: '/media/logo.png' },
 *   inputProps: { title: 'Ролик' },
 * };
 * ```
 */
export type RemotionSource =
  | {
      /**
       * Готовый React-компонент композиции.
       *
       * @example
       * ```tsx
       * component: MyComposition
       * ```
       */
      component: React.ComponentType<Record<string, unknown>>;
      /**
       * Маркер варианта: используется готовый компонент.
       *
       * @example
       * ```ts
       * type: 'component'
       * ```
       */
      type: 'component';
      /**
       * Начальные пропсы, передаваемые в компонент через `inputProps`.
       *
       * @example
       * ```ts
       * inputProps: { title: 'Ролик', accent: '#ff0000' }
       * ```
       */
      inputProps?: Record<string, unknown>;
      /**
       * Частичное переопределение конфигурации композиции.
       *
       * @example
       * ```ts
       * config: { fps: 60, durationInFrames: 300 }
       * ```
       */
      config?: Partial<RemotionCompositionConfig>;
    }
  | {
      /**
       * Маркер варианта: используется TSX-исходник.
       *
       * @example
       * ```ts
       * type: 'code'
       * ```
       */
      type: 'code';
      /**
       * Исходный код композиции, компилируемый во время выполнения.
       *
       * @example
       * ```ts
       * code: 'export const Composition = () => <div>Привет</div>;'
       * ```
       */
      code: string;
      /**
       * Карта импортов модулей, доступных из кода композиции.
       *
       * @example
       * ```ts
       * assets: { logo: '/media/logo.png', font: '/media/inter.woff2' }
       * ```
       */
      assets?: Record<string, string>;
      /**
       * Базовый URL для разрешения относительных путей ресурсов.
       *
       * @example
       * ```ts
       * assetBaseUrl: 'https://cdn.example.com/media/'
       * ```
       */
      assetBaseUrl?: string;
      /**
       * Разрешённые протоколы загрузки ресурсов (белый список).
       *
       * @example
       * ```ts
       * allowedAssetProtocols: ['https:', 'data:']
       * ```
       */
      allowedAssetProtocols?: readonly string[];
      /**
       * Пользовательский резолвер ресурсов вместо встроенного.
       *
       * @example
       * ```ts
       * assetResolver: { resolve: async (url) => fetch(url) }
       * ```
       */
      assetResolver?: RemotionAssetResolver;
      /**
       * Виртуальные модули, инъецируемые в сборку кода.
       *
       * @example
       * ```ts
       * virtualModules: { 'my-lib': { helper: () => 'ok' } }
       * ```
       */
      virtualModules?: Record<string, unknown>;
      /**
       * Начальные пропсы композиции.
       *
       * @example
       * ```ts
       * inputProps: { title: 'Ролик' }
       * ```
       */
      inputProps?: Record<string, unknown>;
      /**
       * Частичное переопределение конфигурации композиции.
       *
       * @example
       * ```ts
       * config: { width: 1080, height: 1080 }
       * ```
       */
      config?: Partial<RemotionCompositionConfig>;
    }
  | {
      /**
       * Маркер варианта: используется зарегистрированный виджет.
       *
       * @example
       * ```ts
       * type: 'widget'
       * ```
       */
      type: 'widget';
      /**
       * Идентификатор или описание виджета.
       *
       * @example
       * ```ts
       * widget: 'lower-third'
       * ```
       */
      widget: string | VidoraWidgetDefinition;
      /**
       * Пропсы виджета.
       *
       * @example
       * ```ts
       * widgetProps: { title: 'Заголовок', subtitle: 'Подпись' }
       * ```
       */
      widgetProps?: Record<string, unknown>;
      /**
       * Реестр, в котором виджет должен быть зарегистрирован.
       *
       * @example
       * ```ts
       * registry: suite.widgetRegistry
       * ```
       */
      registry: WidgetRegistry;
      /**
       * Частичное переопределение конфигурации композиции.
       *
       * @example
       * ```ts
       * config: { durationInFrames: 150 }
       * ```
       */
      config?: Partial<RemotionCompositionConfig>;
    };

/**
 * Контекст предварительной проверки плагина перед компиляцией.
 *
 * @public
 * @example
 * ```ts
 * const plugin: IRemotionPlugin = {
 *   id: 'my-plugin',
 *   name: 'My Plugin',
 *   async preflight({ config, inputProps, signal }) {
 *     if (config.width < 1) throw new Error('Некорректная ширина');
 *   },
 * };
 * ```
 */
export interface PluginPreflightContext {
  /**
   * Итоговая конфигурация композиции после слияния значений по умолчанию.
   *
   * @example
   * ```ts
   * if (config.fps !== 30) console.warn('Неожиданный fps');
   * ```
   */
  config: RemotionCompositionConfig;
  /**
   * Начальные пропсы композиции.
   *
   * @example
   * ```ts
   * const { title } = inputProps;
   * ```
   */
  inputProps: Record<string, unknown>;
  /**
   * Сигнал отмены компиляции.
   *
   * @example
   * ```ts
   * signal?.throwIfAborted();
   * ```
   */
  signal?: AbortSignal;
}

/**
 * Данные о ходе экспорта видео.
 *
 * @public
 * @example
 * ```ts
 * const onProgress = ({ progress, renderedFrames, totalFrames }: ExportProgressData) => {
 *   console.log(`${Math.round(progress * 100)}% (${renderedFrames}/${totalFrames})`);
 * };
 * ```
 */
export interface ExportProgressData {
  /**
   * Общий прогресс экспорта в диапазоне `[0, 1]`.
   *
   * @example
   * ```ts
   * if (progress >= 1) console.log('Готово');
   * ```
   */
  progress: number;
  /**
   * Количество уже отрендеренных кадров.
   *
   * @example
   * ```ts
   * renderedFrames; // 120
   * ```
   */
  renderedFrames: number;
  /**
   * Общее количество кадров в композиции.
   *
   * @example
   * ```ts
   * totalFrames; // 300
   * ```
   */
  totalFrames: number;
  /**
   * Количество уже закодированных кадров.
   *
   * @example
   * ```ts
   * encodedFrames; // 100
   * ```
   */
  encodedFrames: number;
}

/**
 * Параметры экспорта медиа.
 *
 * @public
 * @example
 * ```ts
 * const options: ExportOptions = {
 *   format: 'mp4',
 *   videoCodec: 'h264',
 *   quality: 'high',
 *   fileName: 'my-video.mp4',
 *   onProgress: ({ progress }) => console.log(progress),
 * };
 * ```
 */
export interface ExportOptions {
  /**
   * Контейнер выходного файла.
   *
   * @defaultValue `'mp4'`
   * @example
   * ```ts
   * format: 'webm'
   * ```
   */
  format?: 'mp4' | 'webm';
  /**
   * Видеокодек.
   *
   * `vp8` и `vp9` требуют контейнер `webm`.
   *
   * @example
   * ```ts
   * videoCodec: 'h264'
   * ```
   */
  videoCodec?: 'h264' | 'vp8' | 'vp9';
  /**
   * Аудиокодек.
   *
   * @example
   * ```ts
   * audioCodec: 'aac'
   * ```
   */
  audioCodec?: string;
  /**
   * Имя выходного файла.
   *
   * @example
   * ```ts
   * fileName: 'presentation.mp4'
   * ```
   */
  fileName?: string;
  /**
   * Пресет качества, влияющий на битрейты и число сэмплов.
   *
   * - `draft` — быстрый черновик;
   * - `standard` — сбалансированный режим;
   * - `high` — максимальное качество.
   *
   * @defaultValue `'standard'`
   * @example
   * ```ts
   * quality: 'high'
   * ```
   */
  quality?: 'draft' | 'standard' | 'high';
  /**
   * Видеобитрейт в битах в секунду.
   *
   * @example
   * ```ts
   * videoBitrate: 8_000_000
   * ```
   */
  videoBitrate?: number;
  /**
   * Аудиобитрейт в битах в секунду.
   *
   * @example
   * ```ts
   * audioBitrate: 128_000
   * ```
   */
  audioBitrate?: number;
  /**
   * Обработчик прогресса экспорта.
   *
   * @example
   * ```ts
   * onProgress: ({ progress }) => setPercent(Math.round(progress * 100))
   * ```
   */
  onProgress?: (progress: ExportProgressData) => void;
}

/**
 * Результат экспорта медиа.
 *
 * @public
 * @example
 * ```ts
 * const { url, download } = await engine.exportMedia(Component, config, props, options);
 * download('my-video.mp4');
 * ```
 */
export interface ExportResult {
  /**
   * Готовый файл как `Blob`.
   *
   * @example
   * ```ts
   * if (result.blob.size === 0) console.warn('Пустой файл');
   * ```
   */
  blob: Blob;
  /**
   * Сырые байты файла.
   *
   * @example
   * ```ts
   * const bytes = new Uint8Array(result.buffer);
   * ```
   */
  buffer: ArrayBuffer | Uint8Array;
  /**
   * Object URL, созданный для скачивания.
   *
   * @example
   * ```ts
   * <video src={result.url} controls />
   * ```
   */
  url: string;
  /**
   * Запускает скачивание файла.
   *
   * @param fileName - Имя файла; если не задано, используется имя из
   * {@link ExportOptions.fileName}.
   * @example
   * ```ts
   * result.download();               // имя из options
   * result.download('intro.mp4');    // явное имя
   * ```
   */
  download: (fileName?: string) => void;
}

/**
 * Контракт плагина Remotion.
 *
 * Плагины расширяют пайплайн компиляции и экспорта: подменяют импорты,
 * оборачивают компонент композиции, преобразуют исходный код, наблюдают за
 * прогрессом и освобождают ресурсы. Все хуки необязательны.
 *
 * @public
 * @example
 * ```tsx
 * import type { IRemotionPlugin } from '@web-react-player/remotion';
 *
 * const upperCasePlugin: IRemotionPlugin = {
 *   id: 'upper-case',
 *   name: 'Upper Case',
 *   version: '1.0.0',
 *   transformSource: (code) => code.replace(/subtitle/g, 'subTitle'),
 *   resolveImports: (name) => (name === 'my-lib' ? { helper: () => 'ok' } : null),
 *   dispose: () => console.log('plugin disposed'),
 * };
 * ```
 */
export interface IRemotionPlugin {
  /**
   * Уникальный идентификатор плагина.
   *
   * @example
   * ```ts
   * id: 'audio-mixer'
   * ```
   */
  readonly id: string;
  /**
   * Отображаемое имя плагина.
   *
   * @example
   * ```ts
   * name: 'Audio Mixer'
   * ```
   */
  readonly name: string;
  /**
   * Версия плагина.
   *
   * @example
   * ```ts
   * version: '1.2.0'
   * ```
   */
  readonly version?: string;
  /**
   * Проверка конфигурации до начала компиляции.
   *
   * Выброс ошибки прерывает сборку.
   *
   * @example
   * ```ts
   * preflight: async ({ config }) => {
   *   if (!config.component) throw new Error('Компонент не указан');
   * }
   * ```
   */
  preflight?: (context: PluginPreflightContext) => Promise<void>;
  /**
   * Подмена импортов: возвращает модуль для имени либо `null`, если
   * импорт должен разрешаться обычным образом.
   *
   * @example
   * ```ts
   * resolveImports: (moduleName) => (moduleName === 'icons' ? { Play: () => null } : null)
   * ```
   */
  resolveImports?: (moduleName: string) => Record<string, unknown> | null | undefined;
  /**
   * Обёртка компонента композиции.
   *
   * Позволяет внедрить провайдеры и дополнительные слои поверх сцены: так
   * работает `AudioMixerPlugin`, накладывающий аудиодорожки из `audioMix`.
   *
   * @example
   * ```ts
   * wrapComponent: (Component, config) => (props) => (
   *   <AudioContextProvider config={config}>
   *     <Component {...props} />
   *   </AudioContextProvider>
   * )
   * ```
   */
  wrapComponent?: (
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
  ) => React.ComponentType<Record<string, unknown>>;
  /**
   * Преобразование исходного кода композиции.
   *
   * @example
   * ```ts
   * transformSource: (code) => code.replaceAll('@legacy', '@modern')
   * ```
   */
  transformSource?: (code: string) => string;
  /**
   * Наблюдатель прогресса экспорта.
   *
   * @example
   * ```ts
   * onExportProgress: ({ progress }) => console.log(progress)
   * ```
   */
  onExportProgress?: (progress: ExportProgressData) => void;
  /**
   * Освобождение ресурсов плагина.
   *
   * @example
   * ```ts
   * dispose: () => audioContext.close()
   * ```
   */
  dispose?: () => void;
}

/**
 * Ошибка компилятора Remotion с машиночитаемым типом и подсказкой.
 *
 * @public
 * @example
 * ```ts
 * function handle(error: CompilerError) {
 *   console.error(error.type, error.message, error.suggestion);
 * }
 * ```
 */
export interface CompilerError extends Error {
  /**
   * Категория ошибки.
   *
   * @example
   * ```ts
   * if (error.type === 'SyntaxError') showSyntaxHint();
   * ```
   */
  type: 'SyntaxError' | 'MissingComponentError' | 'InvalidConfigError' | 'RuntimeError';
  /**
   * Подсказка по исправлению.
   *
   * @example
   * ```ts
   * error.suggestion = 'Не забудьте экспортировать компонент Composition';
   * ```
   */
  suggestion?: string | undefined;
}

/**
 * Контракт движка экспорта медиа.
 *
 * @public
 * @example
 * ```ts
 * import { createDefaultRemotionSuite } from '@web-react-player/remotion';
 *
 * const { exporter } = createDefaultRemotionSuite();
 * const { canRender, reason } = await exporter.canExport({ width: 1080, height: 1080 });
 * ```
 */
export interface IExportEngine {
  /**
   * Проверяет, может ли движок отрендерить композицию с такими параметрами.
   *
   * @param config - Частичная конфигурация для проверки.
   * @returns Признак возможности рендеринга и причина отказа, если она есть.
   * @example
   * ```ts
   * const { canRender, reason } = await exporter.canExport();
   * if (!canRender) console.warn(reason);
   * ```
   */
  canExport(
    config?: Partial<RemotionCompositionConfig>,
  ): Promise<{ canRender: boolean; reason?: string }>;
  /**
   * Возвращает список доступных кодеков.
   *
   * @example
   * ```ts
   * console.log(await exporter.getAvailableCodecs()); // ['h264', 'vp8', 'vp9']
   * ```
   */
  getAvailableCodecs(): Promise<string[]>;
  /**
   * Рендерит композицию и кодирует её в файл.
   *
   * @param Component - Корневой компонент композиции.
   * @param config - Полная конфигурация композиции.
   * @param inputProps - Пропсы, передаваемые в компонент.
   * @param options - Параметры экспорта.
   * @returns Готовый файл вместе со вспомогательным API.
   * @example
   * ```ts
   * const result = await exporter.exportMedia(Component, config, { title: 'Ролик' }, {
   *   format: 'mp4',
   *   quality: 'high',
   * });
   * result.download('video.mp4');
   * ```
   */
  exportMedia(
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
    inputProps: Record<string, unknown>,
    options?: ExportOptions,
  ): Promise<ExportResult>;
}
