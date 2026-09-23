import type React from 'react';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type {
  ExportOptions,
  ExportProgressData,
  ExportResult,
  IExportEngine,
  RemotionCompositionConfig,
} from '../types';

export class WebRendererExportEngine implements IExportEngine {
  constructor(private pluginManager: RemotionPluginManager) {}

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
}
