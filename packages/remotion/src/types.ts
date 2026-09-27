import type React from 'react';
import type { RemotionAssetResolver, RemotionCompositionConfig } from './compositionConfig';
import type { VidoraWidgetDefinition } from './widgets/types';
import type { WidgetRegistry } from './widgets/WidgetRegistry';

export * from './compositionConfig';
export * from './widgets/types';

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
      assets?: Record<string, string>;
      assetBaseUrl?: string;
      allowedAssetProtocols?: readonly string[];
      assetResolver?: RemotionAssetResolver;
      virtualModules?: Record<string, unknown>;
      inputProps?: Record<string, unknown>;
      config?: Partial<RemotionCompositionConfig>;
    }
  | {
      type: 'widget';
      widget: string | VidoraWidgetDefinition;
      widgetProps?: Record<string, unknown>;
      registry: WidgetRegistry;
      config?: Partial<RemotionCompositionConfig>;
    };

export interface PluginPreflightContext {
  config: RemotionCompositionConfig;
  inputProps: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ExportProgressData {
  progress: number;
  renderedFrames: number;
  totalFrames: number;
  encodedFrames: number;
}

export interface ExportOptions {
  format?: 'mp4' | 'webm';
  videoCodec?: 'h264' | 'vp8' | 'vp9';
  audioCodec?: string;
  fileName?: string;
  quality?: 'draft' | 'standard' | 'high';
  videoBitrate?: number;
  audioBitrate?: number;
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

export interface CompilerError extends Error {
  type: 'SyntaxError' | 'MissingComponentError' | 'InvalidConfigError' | 'RuntimeError';
  suggestion?: string | undefined;
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
