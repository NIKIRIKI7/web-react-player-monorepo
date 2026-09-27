import type { ComponentProps, Ref } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

/**
 * Свойства медиаадаптера {@link Html5VideoProvider}.
 *
 * Наследует все нативные атрибуты `<video>`, включая `src`, `poster`,
 * `crossOrigin` и `muted`.
 *
 * @public
 * @example
 * ```tsx
 * <Html5VideoProvider src="/media/movie.mp4" poster="/media/poster.jpg" />
 * ```
 */
export interface Html5VideoProviderProps extends ComponentProps<'video'> {}

/**
 * Медиаадаптер для обычного воспроизведения MP4/WebM.
 *
 * Намеренно «простой»: он лишь отрисовывает нативный элемент `<video>` и
 * переводит нативные медиасобытия в события общего FSM. Пакет UI ничего не
 * знает ни о Remotion, ни о HLS — другие движки живут в собственных пакетах
 * и взаимодействуют с тем же контекстом.
 *
 * Элемент всегда включает `playsInline`, поэтому на мобильных не уходит в
 * полноэкранный режим iOS, а его размеры растягиваются по контейнеру с
 * `object-fit: contain`.
 *
 * @public
 * @example
 * ```tsx
 * import { Html5VideoProvider, PlayerProvider, Root } from '@web-react-player/ui';
 *
 * <PlayerProvider>
 *   <Root>
 *     <Html5VideoProvider src="/media/movie.mp4" crossOrigin="anonymous" />
 *   </Root>
 * </PlayerProvider>
 * ```
 */
export function Html5VideoProvider({ src, style, crossOrigin, ...props }: Html5VideoProviderProps) {
  const { videoRef, send } = usePlayerContext();

  return (
    <video
      ref={videoRef as Ref<HTMLVideoElement>}
      src={src}
      crossOrigin={crossOrigin}
      playsInline
      data-media-provider=""
      onTimeUpdate={(e) => send({ type: 'TIME_UPDATE', currentTime: e.currentTarget.currentTime })}
      onLoadedMetadata={(e) =>
        send({ type: 'METADATA_LOADED', duration: e.currentTarget.duration })
      }
      onCanPlay={() => send({ type: 'CAN_PLAY' })}
      onPlay={() => send({ type: 'PLAYING' })}
      onPause={() => send({ type: 'PAUSE' })}
      onEnded={() => send({ type: 'ENDED' })}
      onError={(e) => {
        const mediaError = e.currentTarget.error;
        const errorMessage = mediaError
          ? `MediaError (code ${mediaError.code}): ${mediaError.message || 'Сетевая ошибка или неверный формат'}`
          : 'Video playback error';
        send({ type: 'ERROR', error: new Error(errorMessage) });
      }}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        ...style,
      }}
      {...props}
    />
  );
}
