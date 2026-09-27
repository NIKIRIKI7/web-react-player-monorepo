export interface FFmpegConfig {
  lufsNormalizer: boolean;
  reverb: boolean;
  grayscale: boolean;
  blur: boolean;
}

interface RenderProgress {
  status?: unknown;
  progress?: unknown;
  message?: unknown;
  downloadUrl?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class VidoraFFmpegService {
  private static readonly API_URL = 'http://localhost:8355/api/v1/render';

  public static async startPipeline(
    scenarioId: string,
    config: FFmpegConfig,
    onProgress: (percent: number) => void,
  ): Promise<string> {
    const response = await fetch(`${VidoraFFmpegService.API_URL}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, config }),
    });

    if (!response.ok) {
      throw new Error(`Render start failed: ${response.status}`);
    }

    const startPayload: unknown = await response.json();
    if (!isRecord(startPayload) || typeof startPayload.jobId !== 'string') {
      throw new Error('Render API returned no jobId');
    }

    const jobId = startPayload.jobId;
    const query = new URLSearchParams({
      lufs: config.lufsNormalizer.toString(),
      reverb: config.reverb.toString(),
      gray: config.grayscale.toString(),
      blur: config.blur.toString(),
    });

    return new Promise((resolve, reject) => {
      const source = new EventSource(
        `${VidoraFFmpegService.API_URL}/progress/${encodeURIComponent(jobId)}?${query.toString()}`,
      );
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        source.close();
        reject(error);
      };

      source.onmessage = (event) => {
        let payload: RenderProgress;
        try {
          const parsed: unknown = JSON.parse(event.data);
          if (!isRecord(parsed)) throw new Error('Invalid progress payload');
          payload = parsed;
        } catch (error) {
          fail(error instanceof Error ? error : new Error('Invalid progress payload'));
          return;
        }

        if (payload.status === 'processing') {
          const progress = typeof payload.progress === 'number' ? payload.progress : 0;
          if (Number.isFinite(progress)) {
            onProgress(Math.max(0, Math.min(99, progress)));
          }
          return;
        }

        if (payload.status === 'completed') {
          onProgress(100);
          if (typeof payload.downloadUrl !== 'string' || payload.downloadUrl.length === 0) {
            fail(new Error('Render completed without downloadUrl'));
            return;
          }
          settled = true;
          source.close();
          resolve(payload.downloadUrl);
          return;
        }

        if (payload.status === 'error') {
          fail(
            new Error(
              typeof payload.message === 'string' ? payload.message : 'Render pipeline failed',
            ),
          );
        }
      };

      source.onerror = () => {
        fail(new Error('SSE connection lost'));
      };
    });
  }

  public async cancel(jobId: string): Promise<void> {
    if (jobId.trim().length === 0) {
      throw new Error('jobId must not be empty');
    }

    const response = await fetch(
      `${VidoraFFmpegService.API_URL}/jobs/${encodeURIComponent(jobId)}`,
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`Unable to cancel render pipeline: ${response.status}`);
    }
  }
}
