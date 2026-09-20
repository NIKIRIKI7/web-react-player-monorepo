import type { ComponentProps, Ref } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface MediaProviderProps extends ComponentProps<'video'> {
  src: string;
  type?: 'video' | 'hls' | 'remotion';
}

export function MediaProvider({ src, type = 'video', ...props }: MediaProviderProps) {
  const { videoRef } = usePlayerContext();

  // Remotion-specific engine (loaded lazily, mapped onto the FSM)
  if (type === 'remotion') {
    return <div data-media-provider="">(Remotion Engine Mock)</div>;
  }

  // HLS/Dash use the native <video> for now; hls.js will be wired in here.
  return (
    <video
      ref={videoRef as Ref<HTMLVideoElement>}
      src={src}
      data-media-provider=""
      crossOrigin="anonymous" // Critical for Web Audio API
      {...props}
    />
  );
}
