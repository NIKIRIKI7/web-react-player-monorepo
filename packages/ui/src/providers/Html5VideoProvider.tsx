import type { ComponentProps, Ref } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface Html5VideoProviderProps extends ComponentProps<'video'> {}

// Media adapter for plain MP4/WebM playback. It is intentionally "dumb": it only
// renders a native <video> element and forwards native media events into the
// shared FSM. The UI package does not know anything about Remotion or HLS —
// other engines live in their own packages and speak to the same context.
export function Html5VideoProvider({ src, style, ...props }: Html5VideoProviderProps) {
  const { videoRef, send } = usePlayerContext();

  return (
    <video
      ref={videoRef as Ref<HTMLVideoElement>}
      src={src}
      crossOrigin="anonymous"
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
      onError={() => send({ type: 'ERROR', error: new Error('Video playback error') })}
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
