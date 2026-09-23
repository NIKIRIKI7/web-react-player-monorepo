import type React from 'react';

export interface RemotionCompositionConfig {
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}

export type RemotionSource =
  | {
      type: 'component';
      component: React.ComponentType<Record<string, unknown>>;
      inputProps?: Record<string, unknown>;
      config?: Partial<RemotionCompositionConfig>;
    }
  | {
      type: 'code';
      code: string;
      inputProps?: Record<string, unknown>;
      config?: Partial<RemotionCompositionConfig>;
    };

export interface PluginPreflightContext {
  config: RemotionCompositionConfig;
  inputProps: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ExportProgressData {
  progress: number; // 0 to 1
  renderedFrames: number;
  totalFrames: number;
  encodedFrames: number;
}

export interface ExportOptions {
  format?: 'mp4' | 'webm';
  videoCodec?: 'h264' | 'vp8' | 'vp9';
  audioCodec?: string;
  fileName?: string;
  onProgress?: (progress: ExportProgressData) => void;
}

export interface ExportResult {
  blob: Blob;
  buffer: ArrayBuffer | Uint8Array;
  url: string;
  download: (fileName?: string) => void;
}

export interface IRemotionPlugin {
  readonly id: string;
  readonly name: string;
  readonly version?: string;
  preflight?: (context: PluginPreflightContext) => Promise<void>;
  resolveImports?: (moduleName: string) => Record<string, unknown> | null | undefined;
  wrapComponent?: (
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
  ) => React.ComponentType<Record<string, unknown>>;
  transformSource?: (code: string) => string;
  onExportProgress?: (progress: ExportProgressData) => void;
  dispose?: () => void;
}

export interface ITsxCompiler {
  compile(
    code: string,
    virtualScope?: Record<string, unknown>,
  ): Promise<{
    Component: React.ComponentType<Record<string, unknown>>;
    detectedConfig?: Partial<RemotionCompositionConfig>;
  }>;
}

export interface IExportEngine {
  canExport(
    config?: Partial<RemotionCompositionConfig>,
  ): Promise<{ canRender: boolean; reason?: string }>;
  getAvailableCodecs(): Promise<string[]>;
  exportMedia(
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
    inputProps: Record<string, unknown>,
    options?: ExportOptions,
  ): Promise<ExportResult>;
}
