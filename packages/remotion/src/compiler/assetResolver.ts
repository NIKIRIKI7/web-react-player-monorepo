import type { AudioMixConfig, BaseAudioTrack, RemotionCompilerOptions } from '../types';
import { RemotionCompilerError } from './RemotionCompilerError';

const DEFAULT_ASSET_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:', 'vidora-local:'];

/** Резолвит относительный путь ассета ("bg-music.mp3") в итоговый URL */
export type RemotionAssetPathResolver = (assetPath: string) => string;

function getProtocol(value: string): string | null {
  try {
    return new URL(value).protocol.toLowerCase();
  } catch {
    return null;
  }
}

function getAllowedProtocols(protocols?: readonly string[]): Set<string> {
  return new Set([
    ...DEFAULT_ASSET_PROTOCOLS,
    ...(protocols ?? []).map((protocol) =>
      protocol.toLowerCase().endsWith(':') ? protocol.toLowerCase() : `${protocol.toLowerCase()}:`,
    ),
  ]);
}

function trimTrailingSlashes(str: string): string {
  let end = str.length;
  while (end > 0 && str.charCodeAt(end - 1) === 47 /* '/' */) {
    end -= 1;
  }
  return str.slice(0, end);
}

function trimLeadingSlashes(str: string): string {
  let start = 0;
  while (start < str.length && str.charCodeAt(start) === 47 /* '/' */) {
    start += 1;
  }
  return str.slice(start);
}

function joinAssetBaseUrl(baseUrl: string, assetPath: string): string {
  return `${trimTrailingSlashes(baseUrl)}/${trimLeadingSlashes(assetPath)}`;
}

/**
 * Единая точка разрешения путей: кастомный резолвер -> проверка протокола ->
 * VFS (`assets`) -> assetBaseUrl. Используется и для `staticFile()` в песочнице,
 * и для `audioMix` в конфиге композиции.
 */
export function createAssetResolver(
  assets: Record<string, string> = {},
  options: RemotionCompilerOptions = {},
  scopeAssetBaseUrl?: string,
): RemotionAssetPathResolver {
  const assetBaseUrl = options.assetBaseUrl ?? scopeAssetBaseUrl;
  const allowedProtocols = getAllowedProtocols(options.allowedAssetProtocols);

  return (assetPath: string): string => {
    const customResolution = options.assetResolver?.(assetPath, assets);
    if (typeof customResolution === 'string') return customResolution;

    const protocol = getProtocol(assetPath);
    if (protocol) {
      if (!allowedProtocols.has(protocol)) {
        throw new RemotionCompilerError(
          'InvalidConfigError',
          `Протокол "${protocol}" не разрешён для ресурса "${assetPath}".`,
          'Добавьте протокол в allowedAssetProtocols или передайте разрешённый URL.',
        );
      }
      return assetPath;
    }

    const cleanPath = trimLeadingSlashes(assetPath);
    const cleanAsset = assets[cleanPath];
    if (cleanAsset !== undefined) return cleanAsset;

    const directAsset = assets[assetPath];
    if (directAsset !== undefined) return directAsset;

    if (assetBaseUrl) return joinAssetBaseUrl(assetBaseUrl, assetPath);

    return assetPath;
  };
}

function resolveTrackSrc(track: BaseAudioTrack, resolveAsset: RemotionAssetPathResolver): string {
  return typeof track.src === 'string' ? resolveAsset(track.src) : track.src;
}

/**
 * Прогоняет `src` всех дорожек через VFS. Идемпотентна: уже абсолютный URL
 * (в т.ч. `blob:`) возвращается как есть, поэтому повторный вызов безопасен.
 */
export function resolveAudioMixAssets(
  audioMix: AudioMixConfig,
  resolveAsset: RemotionAssetPathResolver,
): AudioMixConfig {
  return {
    ...(audioMix.voiceover
      ? {
          voiceover: {
            ...audioMix.voiceover,
            src: resolveTrackSrc(audioMix.voiceover, resolveAsset),
          },
        }
      : {}),
    ...(audioMix.music
      ? {
          music: audioMix.music.map((track) => ({
            ...track,
            src: resolveTrackSrc(track, resolveAsset),
          })),
        }
      : {}),
    ...(audioMix.sfx
      ? {
          sfx: audioMix.sfx.map((track) => ({
            ...track,
            src: resolveTrackSrc(track, resolveAsset),
          })),
        }
      : {}),
  };
}

const NON_NEGATIVE_FRAME_FIELDS = [
  'startFrom',
  'endAt',
  'durationFrames',
  'trimStartFrames',
  'trimEndFrames',
  'fadeInFrames',
  'fadeOutFrames',
  'duckingFadeFrames',
  'premountFrames',
] as const;

const NUMBER_FIELDS = ['volume', 'duckingVolume'] as const;

function invalidAudioMix(message: string, suggestion: string): RemotionCompilerError {
  return new RemotionCompilerError('InvalidConfigError', message, suggestion);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateTrack(value: unknown, path: string): void {
  if (!isPlainObject(value)) {
    throw invalidAudioMix(
      `Поле "${path}" должно быть объектом дорожки.`,
      'Опишите дорожку как объект с полем src, например: { src: "voiceover.mp3" }.',
    );
  }

  if (typeof value.src !== 'string' || value.src.trim() === '') {
    throw invalidAudioMix(
      `Поле "${path}.src" должно быть непустой строкой.`,
      'Укажите относительный путь к файлу, например: src: "bg-music.mp3".',
    );
  }

  for (const field of NON_NEGATIVE_FRAME_FIELDS) {
    if (!(field in value) || value[field] === undefined) continue;
    const frame = value[field];
    if (typeof frame !== 'number' || !Number.isFinite(frame) || frame < 0) {
      throw invalidAudioMix(
        `Поле "${path}.${field}" должно быть неотрицательным числом кадров.`,
        'Укажите целое число кадров, например: startFrom: 30, durationFrames: 240.',
      );
    }
  }

  for (const field of NUMBER_FIELDS) {
    if (!(field in value)) continue;
    const amount = value[field];
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      throw invalidAudioMix(
        `Поле "${path}.${field}" должно быть неотрицательным числом.`,
        'Громкость задаётся в диапазоне 0..1, например: volume: 0.8.',
      );
    }
  }

  const startFrom = typeof value.startFrom === 'number' ? value.startFrom : 0;
  if (typeof value.endAt === 'number' && value.endAt < startFrom) {
    throw invalidAudioMix(
      `Поле "${path}.endAt" (${value.endAt}) меньше, чем startFrom (${startFrom}).`,
      'endAt — это кадр на таймлайне композиции, он должен быть не раньше startFrom.',
    );
  }
}

function validateTrackList(value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    throw invalidAudioMix(
      `Поле "${path}" должно быть массивом дорожек.`,
      `Опишите несколько дорожек как массив, например: ${path}: [{ src: "bg-music.mp3" }].`,
    );
  }
  value.forEach((track, index) => {
    validateTrack(track, `${path}[${index}]`);
  });
}

/**
 * Строгая валидация `audioMix` из экспортируемого конфига: ловит опечатки
 * нейросети до рендера и превращает их в понятную ошибку компилятора.
 */
export function validateAudioMixConfig(value: unknown): AudioMixConfig | undefined {
  if (value === undefined) return undefined;

  if (!isPlainObject(value)) {
    throw invalidAudioMix(
      'Поле "audioMix" должно быть объектом.',
      'Опишите звук как объект: audioMix: { voiceover: { src: "voice.mp3" }, music: [] }.',
    );
  }

  const mix = value as Record<string, unknown>;

  if ('voiceover' in mix && mix.voiceover !== undefined) {
    validateTrack(mix.voiceover, 'audioMix.voiceover');
  }
  if ('music' in mix && mix.music !== undefined) {
    validateTrackList(mix.music, 'audioMix.music');
  }
  if ('sfx' in mix && mix.sfx !== undefined) {
    validateTrackList(mix.sfx, 'audioMix.sfx');
  }

  return value as AudioMixConfig;
}
