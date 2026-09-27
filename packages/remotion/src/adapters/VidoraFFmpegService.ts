import type { ExportProgressData } from '../types';

/**
 * Параметры мастеринга видео на стороне FFmpeg-бэкенда.
 *
 * @public
 * @example
 * ```ts
 * import type { MasteringConfig } from '@web-react-player/remotion';
 *
 * const config: MasteringConfig = {
 *   lufsTarget: -14,
 *   applyNoiseGate: true,
 *   removeSilence: false,
 *   videoQuality: 'high',
 * };
 * ```
 */
export interface MasteringConfig {
  /**
   * Целевая громкость по стандарту LUFS.
   *
   * Для потоковой публикации обычно `-14`, для YouTube — `-14 LUFS`.
   *
   * @example
   * ```ts
   * lufsTarget: -14
   * ```
   */
  lufsTarget: number;
  /**
   * Применять ли шумовой gate к аудиодорожкам.
   *
   * Подавляет постоянный фоновый шум в тихих участках.
   *
   * @example
   * ```ts
   * applyNoiseGate: true
   * ```
   */
  applyNoiseGate: boolean;
  /**
   * Удалять ли паузы из дорожки диктора.
   *
   * @example
   * ```ts
   * removeSilence: true
   * ```
   */
  removeSilence: boolean;
  /**
   * Пресет качества видео на выходе.
   *
   * @example
   * ```ts
   * videoQuality: 'high'
   * ```
   */
  videoQuality: 'draft' | 'standard' | 'high';
}

/**
 * Статус задачи рендеринга на бэкенде.
 *
 * - `processing` — идёт рендеринг;
 * - `completed` — файл готов;
 * - `error` — рендеринг завершился ошибкой.
 *
 * @public
 * @example
 * ```ts
 * import type { VidoraRenderStatus } from '@web-react-player/remotion';
 *
 * const status: VidoraRenderStatus = 'completed';
 * ```
 */
export type VidoraRenderStatus = 'processing' | 'completed' | 'error';

/**
 * Прогресс рендеринга с серверным статусом и ссылкой на результат.
 *
 * @public
 * @example
 * ```ts
 * service.startPipeline('scenario-1', config, ({ progress, status, downloadUrl }) => {
 *   console.log(progress, status, downloadUrl);
 * });
 * ```
 */
export interface VidoraRenderProgress extends ExportProgressData {
  /**
   * Текущий статус задачи.
   *
   * @example
   * ```ts
   * status: 'processing'
   * ```
   */
  status: VidoraRenderStatus;
  /**
   * Текстовое сообщение о ходе рендеринга.
   *
   * @example
   * ```ts
   * message: 'Кодирование кадра 120'
   * ```
   */
  message?: string;
  /**
   * Ссылка на скачивание готового файла.
   *
   * Заполняется только при статусе `completed`.
   *
   * @example
   * ```ts
   * downloadUrl: 'https://example.com/out/video.mp4'
   * ```
   */
  downloadUrl?: string;
}

/**
 * Параметры клиента FFmpeg-бэкенда.
 *
 * Все сетевые зависимости инъецируются, что упрощает тестирование.
 *
 * @public
 * @example
 * ```ts
 * import { VidoraFFmpegService, type VidoraFFmpegServiceOptions } from '@web-react-player/remotion';
 *
 * const options: VidoraFFmpegServiceOptions = {
 *   apiUrl: 'https://api.example.com/render',
 *   headers: { Authorization: `Bearer ${token}` },
 * };
 * const service = new VidoraFFmpegService(options);
 * ```
 */
export interface VidoraFFmpegServiceOptions {
  /**
   * Базовый URL API рендеринга без завершающего слэша.
   *
   * @defaultValue `'http://localhost:8355/api/v1/render'`
   * @example
   * ```ts
   * apiUrl: 'https://api.example.com/api/v1/render'
   * ```
   */
  apiUrl?: string | undefined;
  /**
   * Заголовки, добавляемые ко всем запросам.
   *
   * @example
   * ```ts
   * headers: { Authorization: 'Bearer token' }
   * ```
   */
  headers?: HeadersInit | undefined;
  /**
   * Реализация `fetch` (например, мок в тестах).
   *
   * @defaultValue `globalThis.fetch`
   * @example
   * ```ts
   * fetch: async () => new Response('{}')
   * ```
   */
  fetch?: typeof globalThis.fetch | undefined;
  /**
   * Фабрика `EventSource` для подписки на SSE-прогресс.
   *
   * @example
   * ```ts
   * createEventSource: (url) => new EventSource(url)
   * ```
   */
  createEventSource?: ((url: string) => EventSource) | undefined;
  /**
   * Сигнал отмены по умолчанию для всех операций.
   *
   * @example
   * ```ts
   * const controller = new AbortController();
   * signal: controller.signal
   * ```
   */
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

/**
 * Клиент серверного FFmpeg-пайплайна мастеринга.
 *
 * Отправляет сценарий с конфигурацией мастеринга на бэкенд, подписывается на
 * SSE-поток прогресса и возвращает ссылку на готовый файл. Сетевые
 * зависимости (`fetch`, `EventSource`) внедряются через
 * {@link VidoraFFmpegServiceOptions}, поэтому сервис легко тестируется.
 *
 * Ответы и события прогресса проходят через нормализацию: неизвестные поля
 * игнорируются, числовые значения зажимаются в допустимые диапазоны,
 * а ссылка на результат принимается как в `downloadUrl`, так и в
 * `download_url`.
 *
 * @public
 * @example
 * ```ts
 * import { VidoraFFmpegService, type MasteringConfig } from '@web-react-player/remotion';
 *
 * const service = new VidoraFFmpegService({ apiUrl: 'https://api.example.com/render' });
 * const config: MasteringConfig = {
 *   lufsTarget: -14,
 *   applyNoiseGate: true,
 *   removeSilence: false,
 *   videoQuality: 'high',
 * };
 *
 * const downloadUrl = await service.startPipeline('scenario-1', config, ({ progress }) => {
 *   console.log(`${Math.round(progress * 100)}%`);
 * });
 * console.log(downloadUrl);
 * ```
 */
export class VidoraFFmpegService {
  private readonly apiUrl: string;
  private readonly headers: Headers;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly createEventSource: (url: string) => EventSource;
  private readonly signal?: AbortSignal | undefined;

  /**
   * Создаёт клиент FFmpeg-бэкенда.
   *
   * @param options - URL API, заголовки, сетевые зависимости и сигнал отмены.
   * @public
   * @example
   * ```ts
   * const service = new VidoraFFmpegService({
   *   apiUrl: 'http://localhost:8355/api/v1/render',
   *   headers: { Authorization: 'Bearer token' },
   * });
   * ```
   */
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

  /**
   * Запускает рендеринг и подписывается на прогресс.
   *
   * Отправляет `POST /start` с идентификатором сценария и конфигурацией
   * мастеринга, затем открывает SSE-подписку на `GET /progress/{jobId}`.
   * Промис разрешается ссылкой на скачивание при статусе `completed` и
   * отклоняется при статусе `error`, разрыве потока или отмене сигнала.
   *
   * @param scenarioId - Идентификатор сценария; не может быть пустым.
   * @param config - Параметры мастеринга.
   * @param onProgress - Обработчик каждого события прогресса.
   * @param signal - Сигнал отмены; по умолчанию берётся из конструктора.
   * @returns Ссылка на скачивание готового файла.
   * @throws Если `scenarioId` пуст, ответ сервера некорректен или рендеринг
   * завершился ошибкой.
   * @public
   * @example
   * ```ts
   * const url = await service.startPipeline(
   *   'scenario-1',
   *   { lufsTarget: -14, applyNoiseGate: true, removeSilence: false, videoQuality: 'standard' },
   *   ({ status, progress, downloadUrl }) => console.log(status, progress, downloadUrl),
   * );
   * ```
   */
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

  /**
   * Отменяет запущенный рендеринг.
   *
   * Отправляет `DELETE /jobs/{jobId}`. Ответ `404` считается успехом,
   * поскольку задача уже не существует и отменять её не требуется.
   *
   * @param jobId - Идентификатор задачи; не может быть пустым.
   * @param signal - Сигнал отмены; по умолчанию берётся из конструктора.
   * @throws Если `jobId` пуст или сервер вернул ошибку, отличную от `404`.
   * @public
   * @example
   * ```ts
   * const controller = new AbortController();
   * const job = service.startPipeline('scenario-1', config, undefined, controller.signal);
   * controller.abort();
   * await service.cancel('job-42');
   * ```
   */
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
