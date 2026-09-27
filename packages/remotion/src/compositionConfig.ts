import type React from 'react';

/**
 * Базовый контракт для любой аудиодорожки (голос, музыка, эффекты).
 * Поддерживает как позиционирование на таймлайне, так и обрезку самого аудиофайла.
 */
export interface BaseAudioTrack {
  /** Относительный путь к файлу (например "bg-music.mp3") или URL */
  src: string;
  /** Базовая громкость от 0 до 1 (по умолчанию 1) */
  volume?: number;

  // --- 1. Позиционирование на общем таймлайне видео ---
  /** Кадр таймлайна видео, на котором начинается воспроизведение (по умолчанию 0) */
  startFrom?: number;
  /** Кадр таймлайна видео, на котором звук обрезается */
  endAt?: number;
  /** Сколько кадров звучит на таймлайне (если не указано, играет до конца или до endAt) */
  durationFrames?: number;

  // --- 2. Обрезка самого исходного аудиофайла (In / Out points) ---
  /** С какого кадра внутри исходного аудиофайла начать воспроизведение (пропуск интро) */
  trimStartFrames?: number;
  /** На каком кадре внутри исходного аудиофайла остановить воспроизведение */
  trimEndFrames?: number;
}

export interface AudioTrackVoiceover extends BaseAudioTrack {}

export interface AudioTrackMusic extends BaseAudioTrack {
  /** Зацикливать ли трек */
  loop?: boolean;
  /** Плавное нарастание громкости на старте (в кадрах) */
  fadeInFrames?: number;
  /** Плавное затухание громкости в конце трека (в кадрах) */
  fadeOutFrames?: number;
  /** Авто-приглушение музыки во время речи диктора */
  ducking?: boolean;
}

export interface AudioTrackSFX extends BaseAudioTrack {}

export interface AudioMixConfig {
  voiceover?: AudioTrackVoiceover;
  music?: AudioTrackMusic[];
  sfx?: AudioTrackSFX[];
}

export interface RemotionCompositionConfig {
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  audioMix?: AudioMixConfig;
}

export type RemotionAssetResolver = (
  assetPath: string,
  assets: Record<string, string>,
) => string | null | undefined;

export interface RemotionCompilerOptions {
  assetBaseUrl?: string;
  allowedAssetProtocols?: readonly string[];
  assetResolver?: RemotionAssetResolver;
  virtualModules?: Record<string, unknown>;
}

export interface ITsxCompiler {
  compile(
    code: string,
    assets?: Record<string, string>,
    virtualScope?: Record<string, unknown>,
    options?: RemotionCompilerOptions,
  ): Promise<{
    Component: React.ComponentType<Record<string, unknown>>;
    detectedConfig?: Partial<RemotionCompositionConfig>;
  }>;
}
