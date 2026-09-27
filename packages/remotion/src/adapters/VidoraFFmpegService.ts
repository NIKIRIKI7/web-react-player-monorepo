import type { ExportProgressData } from '../types';

export interface MasteringConfig {
  lufsTarget: number;
  applyNoiseGate: boolean;
  removeSilence: boolean;
  videoQuality: 'draft' | 'standard' | 'high';
}

export type VidoraRenderStatus = 'processing' | 'completed' | 'error';

export interface VidoraRenderProgress extends ExportProgressData {
  status: VidoraRenderStatus;
  message?: string;
  downloadUrl?: string;
}

export interface VidoraFFmpegServiceOptions {
  apiUrl?: string | undefined;
  headers?: HeadersInit | undefined;
  fetch?: typeof globalThis.fetch | undefined;
  createEventSource?: ((url: string) => EventSource) | undefined;
  signal?: AbortSignal | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toNonNegativeInteger(value: unknown): number {
  return Math.max(0, Math.round(toNumber(value, 0)));
}

function clampProgress(value: unknown): number {
  return Math.max(0, Math.min(1, toNumber(value, 0)));
}

function getStatus(value: unknown): VidoraRenderStatus {
  return value === 'completed' || value === 'error' ? value : 'processing';
}

function getMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getDownloadUrl(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.downloadUrl === 'string') return value.downloadUrl;
  if (typeof value.download_url === 'string') return value.download_url;
  return undefined;
}

function parseJobId(value: unknown): string {
  if (!isRecord(value)) throw new Error('Render API returned an invalid response.');
  const jobId = value.jobId ?? value.id;
  if (typeof jobId !== 'string' || jobId.length === 0) {
    throw new Error('Render API response does not contain a jobId.');
  }
  return jobId;
}

function parseProgress(value: unknown): VidoraRenderProgress {
  if (!isRecord(value)) throw new Error('Render progress event is not a JSON object.');

  const status = getStatus(value.status);
  const progress = clampProgress(value.progress);
  const renderedFrames = toNonNegativeInteger(value.renderedFrames);
  const totalFrames = toNonNegativeInteger(value.totalFrames);
  const encodedFrames = toNonNegativeInteger(value.encodedFrames ?? renderedFrames);
  const message = getMessage(value.message);
  const downloadUrl = getDownloadUrl(value);

  return {
    status,
    progress,
    renderedFrames,
    totalFrames,
    encodedFrames,
    ...(message ? { message } : {}),
    ...(downloadUrl ? { downloadUrl } : {}),
  };
}

export class VidoraFFmpegService {
  private readonly apiUrl: string;
  private readonly headers: Headers;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly createEventSource: (url: string) => EventSource;
  private readonly signal?: AbortSignal | undefined;

  constructor(options: VidoraFFmpegServiceOptions = {}) {
    this.apiUrl = (options.apiUrl ?? 'http://localhost:8355/api/v1/render').replace(/\/+$/, '');
    this.headers = new Headers(options.headers);
    this.headers.set('Content-Type', 'application/json');
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.createEventSource =
      options.createEventSource ??
      ((url) => {
        if (typeof EventSource === 'undefined') {
          throw new Error('EventSource is not available in this environment.');
        }
        return new EventSource(url);
      });
    this.signal = options.signal;
  }

  public async startPipeline(
    scenarioId: string,
    config: MasteringConfig,
    onProgress?: (progress: VidoraRenderProgress) => void,
    signal = this.signal,
  ): Promise<string> {
    if (scenarioId.trim().length === 0) {
      throw new Error('scenarioId must not be empty.');
    }

    const response = await this.fetcher(`${this.apiUrl}/start`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ scenarioId, config }),
      ...(signal ? { signal } : {}),
    });

    if (!response.ok) {
      throw new Error(`Unable to start render pipeline: ${response.status} ${response.statusText}`);
    }

    const startResponse = parseJobId((await response.json()) as unknown);
    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let eventSource: EventSource | null = null;

      const close = () => {
        eventSource?.close();
        eventSource = null;
      };

      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        close();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const complete = (downloadUrl: string) => {
        if (settled) return;
        settled = true;
        close();
        resolve(downloadUrl);
      };

      try {
        eventSource = this.createEventSource(
          `${this.apiUrl}/progress/${encodeURIComponent(startResponse)}`,
        );
      } catch (error) {
        fail(error);
        return;
      }

      eventSource.onmessage = (event) => {
        let payload: unknown;
        try {
          payload = JSON.parse(event.data) as unknown;
        } catch (error) {
          fail(new Error(`Invalid render progress event: ${String(error)}`));
          return;
        }

        let progress: VidoraRenderProgress;
        try {
          progress = parseProgress(payload);
          onProgress?.(progress);
        } catch (error) {
          fail(error);
          return;
        }

        if (progress.status === 'error') {
          fail(new Error(progress.message ?? 'Render pipeline failed.'));
          return;
        }

        if (progress.status === 'completed') {
          if (!progress.downloadUrl) {
            fail(new Error('Render pipeline completed without a downloadUrl.'));
            return;
          }
          complete(progress.downloadUrl);
        }
      };

      eventSource.onerror = () => {
        fail(new Error('Render progress stream closed before completion.'));
      };
    });
  }

  public async cancel(jobId: string, signal = this.signal): Promise<void> {
    if (jobId.trim().length === 0) {
      throw new Error('jobId must not be empty.');
    }

    const response = await this.fetcher(`${this.apiUrl}/jobs/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
      headers: this.headers,
      ...(signal ? { signal } : {}),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(
        `Unable to cancel render pipeline: ${response.status} ${response.statusText}`,
      );
    }
  }
}
