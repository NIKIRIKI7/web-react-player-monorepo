import { Audio } from '@remotion/media';
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type {
  AudioTrackMusic,
  BaseAudioTrack,
  IRemotionPlugin,
  RemotionCompositionConfig,
} from '../types';

/** Громкость музыки во время речи диктора, если не задана явно */
const DEFAULT_DUCKING_VOLUME = 0.15;
/** Длительность плавного входа/выхода из приглушения (0.5 сек при 30fps) */
const DEFAULT_DUCKING_FADE_FRAMES = 15;
/** За сколько кадров до вступления дорожки монтировать <Audio>, чтобы не было буферизации */
const DEFAULT_PREMOUNT_FRAMES = 30;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Кадр таймлайна композиции, на котором дорожка включается */
function resolveTimelineStart(track: BaseAudioTrack): number {
  return Math.max(0, track.startFrom ?? 0);
}

/**
 * Кадр таймлайна композиции, на котором дорожка выключается.
 * Если не заданы ни durationFrames, ни endAt, дорожка звучит до конца композиции
 * (аудиофайл при этом проигрывается целиком — его обрезает только конец видео).
 */
function resolveTimelineEnd(track: BaseAudioTrack, compositionDurationInFrames: number): number {
  const start = resolveTimelineStart(track);
  let end: number;

  if (track.durationFrames !== undefined) {
    end = start + track.durationFrames;
  } else if (track.endAt !== undefined) {
    end = track.endAt;
  } else {
    end = compositionDurationInFrames;
  }

  return compositionDurationInFrames > 0 ? Math.min(end, compositionDurationInFrames) : end;
}

/** Сколько кадров дорожка звучит на таймлайне */
function resolveTimelineDuration(
  track: BaseAudioTrack,
  compositionDurationInFrames: number,
): number {
  return Math.max(
    1,
    resolveTimelineEnd(track, compositionDurationInFrames) - resolveTimelineStart(track),
  );
}

/** Окно речи диктора на таймлайне в абсолютных кадрах композиции */
interface VoiceWindow {
  from: number;
  to: number;
}

/** Плавная огибающая приглушения музыки на кадре таймлайна */
function duckingFactorAt(
  absoluteFrame: number,
  window: VoiceWindow,
  volume: number,
  fadeFrames: number,
): number {
  if (fadeFrames <= 0) {
    return absoluteFrame >= window.from && absoluteFrame <= window.to ? volume : 1;
  }
  if (absoluteFrame <= window.from - fadeFrames || absoluteFrame >= window.to + fadeFrames) {
    return 1;
  }
  // Плавное погружение в приглушение перед началом речи
  if (absoluteFrame < window.from) {
    return 1 - (1 - volume) * ((absoluteFrame - (window.from - fadeFrames)) / fadeFrames);
  }
  // Речь идёт — держим приглушение
  if (absoluteFrame <= window.to) {
    return volume;
  }
  // Плавный выход из приглушения после конца речи
  return volume + (1 - volume) * ((absoluteFrame - window.to) / fadeFrames);
}

/**
 * Строит функцию громкости Remotion: она вызывается для каждого кадра дорожки,
 * поэтому fade in/out и ducking считаются покадрово без ручных счётчиков.
 */
function createMusicVolumeEvaluator(
  track: AudioTrackMusic,
  trackDuration: number,
  voiceWindow: VoiceWindow | null,
): (relativeFrame: number) => number {
  const baseVolume = clamp01(track.volume ?? 1);
  const fadeInFrames = Math.max(0, track.fadeInFrames ?? 0);
  const fadeOutFrames = Math.max(0, track.fadeOutFrames ?? 0);
  const timelineOffset = resolveTimelineStart(track);
  const withDucking = track.ducking === true && voiceWindow !== null;

  return (relativeFrame: number): number => {
    let gain = 1;

    if (fadeInFrames > 0 && relativeFrame < fadeInFrames) {
      gain *= relativeFrame / fadeInFrames;
    }

    if (fadeOutFrames > 0) {
      const framesLeft = trackDuration - relativeFrame;
      if (framesLeft < fadeOutFrames) {
        gain *= clamp01(framesLeft / fadeOutFrames);
      }
    }

    if (withDucking && voiceWindow) {
      gain *= duckingFactorAt(
        relativeFrame + timelineOffset,
        voiceWindow,
        DEFAULT_DUCKING_VOLUME,
        DEFAULT_DUCKING_FADE_FRAMES,
      );
    }

    return clamp01(baseVolume * gain);
  };
}

/** Музыкальная дорожка с покадровым fade in/out и авто-приглушением под голос */
function MusicTrack({
  track,
  trackDuration,
  voiceWindow,
}: {
  track: AudioTrackMusic;
  trackDuration: number;
  voiceWindow: VoiceWindow | null;
}) {
  const volume = React.useMemo(
    () => createMusicVolumeEvaluator(track, trackDuration, voiceWindow),
    [track, trackDuration, voiceWindow],
  );

  return (
    <Audio
      src={track.src}
      volume={volume}
      premountFor={DEFAULT_PREMOUNT_FRAMES}
      {...(track.loop !== undefined ? { loop: track.loop } : {})}
      {...(track.trimStartFrames !== undefined ? { trimBefore: track.trimStartFrames } : {})}
      {...(track.trimEndFrames !== undefined ? { trimAfter: track.trimEndFrames } : {})}
    />
  );
}

/**
 * Наложение аудиодорожек поверх скомпилированного визуала.
 *
 * Нейросеть не считает ни кадры, ни громкость: она только описывает
 * `audioMix` в конфиге композиции, а всю покадровую математику делает плагин.
 */
export class AudioMixerPlugin implements IRemotionPlugin {
  public readonly id = 'remotion-plugin-audio-mixer';
  public readonly name = 'Cinematic Audio Mixer';

  public wrapComponent(
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
  ): React.ComponentType<Record<string, unknown>> {
    const { audioMix } = config;

    // Fast-path: звука в конфиге нет — визуал рендерим без лишних слоёв
    if (!(audioMix && (audioMix.voiceover || audioMix.music?.length || audioMix.sfx?.length))) {
      return Component;
    }

    const compositionDuration = config.durationInFrames;
    const voiceover = audioMix.voiceover;
    const music = audioMix.music ?? [];
    const sfx = audioMix.sfx ?? [];

    // Окно речи считается один раз на обёртку, а не на каждый кадр
    const voiceWindow: VoiceWindow | null = voiceover
      ? {
          from: resolveTimelineStart(voiceover),
          to: resolveTimelineEnd(voiceover, compositionDuration),
        }
      : null;

    return function AudioMixerWrapper(props: Record<string, unknown>) {
      return (
        <AbsoluteFill>
          {/* Слой 1: визуальная анимация из сгенерированного TSX */}
          <Component {...props} />

          {/* Слой 2: голос диктора */}
          {voiceover && (
            <Sequence
              from={resolveTimelineStart(voiceover)}
              durationInFrames={resolveTimelineDuration(voiceover, compositionDuration)}
            >
              <Audio
                src={voiceover.src}
                volume={clamp01(voiceover.volume ?? 1)}
                premountFor={DEFAULT_PREMOUNT_FRAMES}
                {...(voiceover.trimStartFrames !== undefined
                  ? { trimBefore: voiceover.trimStartFrames }
                  : {})}
                {...(voiceover.trimEndFrames !== undefined
                  ? { trimAfter: voiceover.trimEndFrames }
                  : {})}
              />
            </Sequence>
          )}

          {/* Слой 3: музыка (fade in/out + ducking) */}
          {music.map((track) => {
            const duration = resolveTimelineDuration(track, compositionDuration);
            return (
              <Sequence
                key={`${track.src}@${resolveTimelineStart(track)}`}
                from={resolveTimelineStart(track)}
                durationInFrames={duration}
              >
                <MusicTrack track={track} trackDuration={duration} voiceWindow={voiceWindow} />
              </Sequence>
            );
          })}

          {/* Слой 4: звуковые эффекты */}
          {sfx.map((track) => (
            <Sequence
              key={`${track.src}@${resolveTimelineStart(track)}`}
              from={resolveTimelineStart(track)}
              durationInFrames={resolveTimelineDuration(track, compositionDuration)}
            >
              <Audio
                src={track.src}
                volume={clamp01(track.volume ?? 1)}
                premountFor={DEFAULT_PREMOUNT_FRAMES}
                {...(track.trimStartFrames !== undefined
                  ? { trimBefore: track.trimStartFrames }
                  : {})}
                {...(track.trimEndFrames !== undefined ? { trimAfter: track.trimEndFrames } : {})}
              />
            </Sequence>
          ))}
        </AbsoluteFill>
      );
    };
  }
}
