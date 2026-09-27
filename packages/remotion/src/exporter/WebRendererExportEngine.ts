import type React from 'react';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type {
  ExportOptions,
  ExportProgressData,
  ExportResult,
  IExportEngine,
  RemotionCompositionConfig,
} from '../types';

/**
 * Движок экспорта, работающий целиком в браузере через WebCodecs.
 *
 * Рендеринг выполняется пакетом `@remotion/web-renderer`: компонент сначала
 * оборачивается плагинами из {@link RemotionPluginManager}, затем
 * кодируется в контейнер `mp4` или `webm`. Прогресс рендеринга транслируется
 * одновременно в колбэк из {@link ExportOptions} и в плагины.
 *
 * @public
 * @example
 * ```ts
 * import { createDefaultRemotionSuite } from '@web-react-player/remotion';
 *
 * const { exporter } = createDefaultRemotionSuite();
 * const result = await exporter.exportMedia(Composition, config, { title: 'Ролик' }, {
 *   format: 'mp4',
 *   quality: 'high',
 *   onProgress: ({ progress }) => console.log(Math.round(progress * 100)),
 * });
 * result.download('video.mp4');
 * ```
 */
export class WebRendererExportEngine implements IExportEngine {
  /**
   * Создаёт движок экспорта.
   *
   * @param pluginManager - Менеджер плагинов, применяемых к компоненту перед рендерингом.
   * @public
   * @example
   * ```ts
   * const { pluginManager, exporter } = createDefaultRemotionSuite();
   * ```
   */
  constructor(private pluginManager: RemotionPluginManager) {}

  /**
   * Проверяет, возможен ли рендеринг в текущем окружении.
   *
   * В SSR возвращается отказ, поскольку WebCodecs недоступен на сервере. В
   * браузере проверяется поддержка `VideoEncoder` и, если доступен
   * `@remotion/web-renderer`, запрашивается реальная проверка под целевое
   * разрешение кадра.
   *
   * @param config - Частичная конфигурация; размеры по умолчанию 1920x1080.
   * @returns Признак возможности рендеринга и причина отказа, если она есть.
   * @public
   * @example
   * ```ts
   * const { canRender, reason } = await exporter.canExport({ width: 3840, height: 2160 });
   * if (!canRender) console.warn(reason);
   * ```
   */
  public async canExport(
    config?: Partial<RemotionCompositionConfig>,
  ): Promise<{ canRender: boolean; reason?: string }> {
    if (typeof window === 'undefined') {
      return { canRender: false, reason: 'SSR environment not supported' };
    }

    try {
      const webRenderer = await import('@remotion/web-renderer');
      if (typeof webRenderer.canRenderMediaOnWeb === 'function') {
        // Проверяем реальное целевое разрешение композиции
        const check = await webRenderer.canRenderMediaOnWeb({
          width: config?.width ?? 1920,
          height: config?.height ?? 1080,
        });
        const errorIssue = check.issues.find((issue) => issue.severity === 'error');
        return {
          canRender: check.canRender,
          ...(errorIssue ? { reason: errorIssue.message } : {}),
        };
      }
      return { canRender: 'VideoEncoder' in window };
    } catch {
      return {
        canRender: 'VideoEncoder' in window,
        reason: 'WebCodecs VideoEncoder supported',
      };
    }
  }

  /**
   * Возвращает список видеокодеков, доступных в браузере.
   *
   * При недоступности `@remotion/web-renderer` предполагается `h264`.
   *
   * @returns Массив имён кодеков.
   * @public
   * @example
   * ```ts
   * console.log(await exporter.getAvailableCodecs()); // ['h264', 'vp8', 'vp9']
   * ```
   */
  public async getAvailableCodecs(): Promise<string[]> {
    try {
      const webRenderer = await import('@remotion/web-renderer');
      if (typeof webRenderer.getEncodableVideoCodecs === 'function') {
        // В @remotion/web-renderer@4.0.527 принимает контейнер ('mp4' или 'webm')
        return await webRenderer.getEncodableVideoCodecs('mp4');
      }
      return ['h264'];
    } catch {
      return ['h264'];
    }
  }

  /**
   * Рендерит и кодирует композицию в видеофайл.
   *
   * Пресет качества переводится в конкретные битрейты, но явные значения
   * `videoBitrate` и `audioBitrate` имеют приоритет.
   *
   * @param Component - Корневой компонент композиции.
   * @param config - Полная конфигурация композиции.
   * @param inputProps - Пропсы композиции.
   * @param options - Формат, кодек, качество и обработчик прогресса.
   * @returns Файл вместе со ссылкой и методом скачивания.
   * @throws Если рендеринг в текущем окружении невозможен.
   * @public
   * @example
   * ```ts
   * const result = await exporter.exportMedia(
   *   Composition,
   *   { durationInFrames: 300, fps: 30, width: 1920, height: 1080 },
   *   { title: 'Ролик' },
   *   { format: 'webm', videoCodec: 'vp9', quality: 'draft' },
   * );
   * result.download('draft.webm');
   * ```
   */
  public async exportMedia(
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
    inputProps: Record<string, unknown>,
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    const { canRender, reason } = await this.canExport(config);
    if (!canRender) {
      throw new Error(
        `[WebRendererExportEngine] Cannot render at ${config.width}x${config.height}: ${reason}`,
      );
    }

    const WrappedComponent = this.pluginManager.applyComponentWrappers(Component, config);
    const webRenderer = await import('@remotion/web-renderer');

    const handleProgress = (progressData: ExportProgressData) => {
      options.onProgress?.(progressData);
      this.pluginManager.notifyExportProgress(progressData);
    };

    // Качество: пресет -> конкретные битрейты (bps). Явные переопределения имеют приоритет.
    const videoBitrate: number =
      options.videoBitrate ?? this.resolveVideoBitrate(config, options.quality);
    const audioBitrate: number = options.audioBitrate ?? this.resolveAudioBitrate(options.quality);

    // Реальный API @remotion/web-renderer@4.0.527
    const renderHandle = await webRenderer.renderMediaOnWeb({
      composition: {
        component: WrappedComponent,
        durationInFrames: config.durationInFrames,
        fps: config.fps,
        width: config.width,
        height: config.height,
        id: 'exported-composition',
      },
      container: options.format === 'webm' ? 'webm' : 'mp4',
      videoCodec: options.videoCodec ?? 'h264',
      videoBitrate,
      audioBitrate,
      licenseKey: 'free-license',
      inputProps,
      onProgress: (p: { progress: number; renderedFrames: number; encodedFrames: number }) => {
        handleProgress({
          progress: p.progress ?? 0,
          renderedFrames: p.renderedFrames ?? 0,
          totalFrames: config.durationInFrames,
          encodedFrames: p.encodedFrames ?? p.renderedFrames ?? 0,
        });
      },
    });

    const blob = await renderHandle.getBlob();
    const buffer = await blob.arrayBuffer();
    const url = URL.createObjectURL(blob);

    const download = (fileName = options.fileName ?? `animation.${options.format ?? 'mp4'}`) => {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    };

    return {
      blob,
      buffer,
      url,
      download,
    };
  }

  // Пресет качества -> битрейт видео (bps)
  private resolveVideoBitrate(
    config: RemotionCompositionConfig,
    quality?: ExportOptions['quality'],
  ): number {
    switch (quality) {
      case 'draft':
        return 1_000_000; // 1 Mbps — быстрый рендер для теста
      case 'high':
        return 15_000_000; // 15 Mbps — максимальное качество
      default:
        // Динамическая оценка под разрешение и fps
        return Math.round(config.width * config.height * config.fps * 0.1);
    }
  }

  // Пресет качества -> битрейт аудио (bps)
  private resolveAudioBitrate(quality?: ExportOptions['quality']): number {
    switch (quality) {
      case 'draft':
        return 64_000; // 64 kbps
      case 'high':
        return 320_000; // 320 kbps
      default:
        return 128_000; // 128 kbps
    }
  }
}
