import type React from 'react';

/**
 * Базовый контракт для любой аудиодорожки (голос, музыка, эффекты).
 * Поддерживает как позиционирование на таймлайне, так и обрезку самого аудиофайла.
 *
 * @public
 * @example
 * ```ts
 * import type { BaseAudioTrack } from '@web-react-player/remotion';
 *
 * const track: BaseAudioTrack = {
 *   src: 'bg-music.mp3',
 *   volume: 0.6,
 *   startFrom: 0,
 *   durationFrames: 150,
 *   trimStartFrames: 30,
 * };
 * ```
 */
export interface BaseAudioTrack {
  /**
   * Относительный путь к файлу (например `bg-music.mp3`) или URL.
   *
   * Путь разрешается через резолвер ресурсов композиции.
   *
   * @example
   * ```ts
   * src: 'bg-music.mp3'
   * src: 'https://cdn.example.com/theme.mp3'
   * ```
   */
  src: string;
  /**
   * Базовая громкость дорожки.
   *
   * @defaultValue `1`
   * @example
   * ```ts
   * volume: 0.8
   * ```
   */
  volume?: number;

  // --- 1. Позиционирование на общем таймлайне видео ---
  /**
   * Кадр таймлайна видео, на котором начинается воспроизведение дорожки.
   *
   * @defaultValue `0`
   * @example
   * ```ts
   * startFrom: 60
   * ```
   */
  startFrom?: number;
  /**
   * Кадр таймлайна видео, на котором звук обрезается.
   *
   * @example
   * ```ts
   * endAt: 300
   * ```
   */
  endAt?: number;
  /**
   * Сколько кадров звучит дорожка на таймлайне.
   *
   * Если не указано, играет до конца композиции или до `endAt`.
   *
   * @example
   * ```ts
   * durationFrames: 150
   * ```
   */
  durationFrames?: number;

  // --- 2. Обрезка самого исходного аудиофайла (In / Out points) ---
  /**
   * С какого кадра внутри исходного аудиофайла начать воспроизведение
   * (пропуск интро).
   *
   * @example
   * ```ts
   * trimStartFrames: 45
   * ```
   */
  trimStartFrames?: number;
  /**
   * На каком кадре внутри исходного аудиофайла остановить воспроизведение.
   *
   * @example
   * ```ts
   * trimEndFrames: 240
   * ```
   */
  trimEndFrames?: number;
}

/**
 * Аудиодорожка закадрового голоса (диктор).
 *
 * @public
 * @example
 * ```ts
 * import type { AudioTrackVoiceover } from '@web-react-player/remotion';
 *
 * const voiceover: AudioTrackVoiceover = { src: 'narration.mp3', volume: 1 };
 * ```
 */
export interface AudioTrackVoiceover extends BaseAudioTrack {}

/**
 * Аудиодорожка музыки с необязательными настройками зацикливания, фейдов
 * и автоматического приглушения под речь диктора.
 *
 * @public
 * @example
 * ```ts
 * import type { AudioTrackMusic } from '@web-react-player/remotion';
 *
 * const music: AudioTrackMusic = {
 *   src: 'theme.mp3',
 *   loop: true,
 *   fadeInFrames: 30,
 *   fadeOutFrames: 60,
 *   ducking: true,
 * };
 * ```
 */
export interface AudioTrackMusic extends BaseAudioTrack {
  /**
   * Зацикливать ли трек.
   *
   * @example
   * ```ts
   * loop: true
   * ```
   */
  loop?: boolean;
  /**
   * Плавное нарастание громкости на старте дорожки, в кадрах.
   *
   * @example
   * ```ts
   * fadeInFrames: 30
   * ```
   */
  fadeInFrames?: number;
  /**
   * Плавное затухание громкости в конце дорожки, в кадрах.
   *
   * @example
   * ```ts
   * fadeOutFrames: 45
   * ```
   */
  fadeOutFrames?: number;
  /**
   * Авто-приглушение музыки во время речи диктора.
   *
   * @example
   * ```ts
   * ducking: true
   * ```
   */
  ducking?: boolean;
}

/**
 * Аудиодорожка звуковых эффектов.
 *
 * @public
 * @example
 * ```ts
 * import type { AudioTrackSFX } from '@web-react-player/remotion';
 *
 * const sfx: AudioTrackSFX = { src: 'whoosh.mp3', startFrom: 12, durationFrames: 8 };
 * ```
 */
export interface AudioTrackSFX extends BaseAudioTrack {}

/**
 * Конфигурация аудиомикса композиции.
 *
 * @public
 * @example
 * ```ts
 * import type { AudioMixConfig } from '@web-react-player/remotion';
 *
 * const audioMix: AudioMixConfig = {
 *   voiceover: { src: 'narration.mp3' },
 *   music: [{ src: 'theme.mp3', loop: true, ducking: true }],
 *   sfx: [{ src: 'click.mp3', startFrom: 30 }],
 * };
 * ```
 */
export interface AudioMixConfig {
  /**
   * Единственная дорожка голоса диктора.
   *
   * @example
   * ```ts
   * voiceover: { src: 'narration.mp3' }
   * ```
   */
  voiceover?: AudioTrackVoiceover;
  /**
   * Музыкальные дорожки; допускается несколько.
   *
   * @example
   * ```ts
   * music: [{ src: 'theme.mp3', loop: true }]
   * ```
   */
  music?: AudioTrackMusic[];
  /**
   * Дорожки звуковых эффектов.
   *
   * @example
   * ```ts
   * sfx: [{ src: 'click.mp3', startFrom: 30 }]
   * ```
   */
  sfx?: AudioTrackSFX[];
}

/**
 * Полная конфигурация композиции Remotion.
 *
 * @public
 * @example
 * ```ts
 * import type { RemotionCompositionConfig } from '@web-react-player/remotion';
 *
 * const config: RemotionCompositionConfig = {
 *   durationInFrames: 300,
 *   fps: 30,
 *   width: 1920,
 *   height: 1080,
 *   audioMix: { voiceover: { src: 'narration.mp3' } },
 * };
 * ```
 */
export interface RemotionCompositionConfig {
  /**
   * Длительность композиции в кадрах.
   *
   * @example
   * ```ts
   * durationInFrames: 300
   * ```
   */
  durationInFrames: number;
  /**
   * Кадров в секунду.
   *
   * @example
   * ```ts
   * fps: 30
   * ```
   */
  fps: number;
  /**
   * Ширина кадра в пикселях.
   *
   * @example
   * ```ts
   * width: 1920
   * ```
   */
  width: number;
  /**
   * Высота кадра в пикселях.
   *
   * @example
   * ```ts
   * height: 1080
   * ```
   */
  height: number;
  /**
   * Аудиомикс композиции.
   *
   * @example
   * ```ts
   * audioMix: { music: [{ src: 'theme.mp3' }] }
   * ```
   */
  audioMix?: AudioMixConfig;
}

/**
 * Пользовательская функция разрешения пути ресурса.
 *
 * Возвращает итоговый URL либо `null`/`undefined`, если ресурс разрешить
 * не удалось и нужно обратиться к стандартной логике.
 *
 * @public
 * @example
 * ```ts
 * import type { RemotionAssetResolver } from '@web-react-player/remotion';
 *
 * const resolver: RemotionAssetResolver = (path, assets) => assets[path] ?? null;
 * ```
 */
export type RemotionAssetResolver = (
  assetPath: string,
  assets: Record<string, string>,
) => string | null | undefined;

/**
 * Параметры компиляции TSX в браузере.
 *
 * @public
 * @example
 * ```ts
 * import type { RemotionCompilerOptions } from '@web-react-player/remotion';
 *
 * const options: RemotionCompilerOptions = {
 *   assetBaseUrl: 'https://cdn.example.com/',
 *   allowedAssetProtocols: ['https:', 'data:'],
 *   virtualModules: { 'my-lib': {} },
 * };
 * ```
 */
export interface RemotionCompilerOptions {
  /**
   * Базовый URL для относительных путей ресурсов.
   *
   * @example
   * ```ts
   * assetBaseUrl: 'https://cdn.example.com/media/'
   * ```
   */
  assetBaseUrl?: string;
  /**
   * Белый список протоколов загрузки ресурсов.
   *
   * @example
   * ```ts
   * allowedAssetProtocols: ['https:', 'data:', 'blob:']
   * ```
   */
  allowedAssetProtocols?: readonly string[];
  /**
   * Пользовательский резолвер ресурсов.
   *
   * @example
   * ```ts
   * assetResolver: (path, assets) => assets[path] ?? null
   * ```
   */
  assetResolver?: RemotionAssetResolver;
  /**
   * Виртуальные модули, доступные коду композиции.
   *
   * @example
   * ```ts
   * virtualModules: { 'my-lib': { helper: () => 1 } }
   * ```
   */
  virtualModules?: Record<string, unknown>;
}

/**
 * Контракт компилятора TSX.
 *
 * @public
 * @example
 * ```ts
 * import type { ITsxCompiler } from '@web-react-player/remotion';
 *
 * async function build(compiler: ITsxCompiler, code: string) {
 *   const { Component, detectedConfig } = await compiler.compile(code);
 *   return { Component, detectedConfig };
 * }
 * ```
 */
export interface ITsxCompiler {
  /**
   * Компилирует TSX-код в исполняемый React-компонент.
   *
   * @param code - Исходный код композиции.
   * @param assets - Карта доступных ресурсов.
   * @param virtualScope - Виртуальные модули для инъекции в сборку.
   * @param options - Дополнительные параметры компиляции.
   * @returns Компонент и конфигурация, распознанная из кода.
   * @example
   * ```ts
   * const { Component, detectedConfig } = await compiler.compile(code, { logo: '/logo.png' });
   * ```
   */
  compile(
    code: string,
    assets?: Record<string, string>,
    virtualScope?: Record<string, unknown>,
    options?: RemotionCompilerOptions,
  ): Promise<{
    /**
     * Скомпилированный корневой компонент композиции.
     *
     * @example
     * ```ts
     * <Component inputProps={{ title: 'Ролик' }} />
     * ```
     */
    Component: React.ComponentType<Record<string, unknown>>;
    /**
     * Конфигурация, распознанная из кода (fps, размеры, длительность).
     *
     * @example
     * ```ts
     * detectedConfig?.fps; // 30
     * ```
     */
    detectedConfig?: Partial<RemotionCompositionConfig>;
  }>;
}
