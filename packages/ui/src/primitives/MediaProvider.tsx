import {
  createDefaultRemotionSuite,
  type ITsxCompiler,
  type RemotionCompositionConfig,
  RemotionPlaybackAdapter,
  type RemotionPluginManager,
  type RemotionSource,
} from '@web-react-player/remotion';
import { type ComponentProps, type Ref, useCallback, useEffect, useMemo } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface MediaProviderProps extends Omit<ComponentProps<'video'>, 'src'> {
  src?: string;
  type?: 'video' | 'hls' | 'remotion';
  remotionSource?: RemotionSource;
  remotionConfig?: RemotionCompositionConfig;
  pluginManager?: RemotionPluginManager;
  compiler?: ITsxCompiler;
}

export function MediaProvider({
  src,
  type = 'video',
  remotionSource,
  remotionConfig,
  pluginManager: customPluginManager,
  compiler: customCompiler,
  ...props
}: MediaProviderProps) {
  const { state, videoRef, send } = usePlayerContext();

  const defaultSuite = useMemo(() => createDefaultRemotionSuite(), []);
  const activePluginManager = customPluginManager ?? defaultSuite.pluginManager;
  const activeCompiler = customCompiler ?? defaultSuite.compiler;

  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      send({ type: 'TIME_UPDATE', currentTime });
    },
    [send],
  );

  useEffect(() => {
    if (type === 'remotion' && remotionSource) {
      send({
        type: 'LOAD',
        src: remotionSource.type === 'code' ? 'remotion://code' : 'remotion://component',
      });
    }
  }, [type, remotionSource, send]);

  const handleMetadataLoaded = useCallback(
    (duration: number, fps: number) => {
      send({ type: 'METADATA_LOADED', duration, fps });
      send({ type: 'CAN_PLAY' });
    },
    [send],
  );

  const handlePlaybackStateChange = useCallback(
    (isPlaying: boolean) => {
      if (isPlaying && state.status !== 'playing') {
        send({ type: 'PLAY' });
      } else if (!isPlaying && state.status === 'playing') {
        send({ type: 'PAUSE' });
      }
    },
    [send, state.status],
  );

  const handleError = useCallback(
    (error: Error) => {
      send({ type: 'ERROR', error });
    },
    [send],
  );

  if (type === 'remotion') {
    if (!remotionSource) {
      return (
        <div
          data-media-provider-empty=""
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: '#9ca3af',
            fontSize: '13px',
          }}
        >
          No Remotion animation provided.
        </div>
      );
    }

    return (
      <RemotionPlaybackAdapter
        source={remotionSource}
        pluginManager={activePluginManager}
        compiler={activeCompiler}
        defaultConfig={remotionConfig}
        fsmStatus={state.status}
        currentTime={state.context.currentTime}
        playbackRate={state.context.playbackRate}
        volume={state.context.volume}
        muted={state.context.muted}
        onTimeUpdate={handleTimeUpdate}
        onMetadataLoaded={handleMetadataLoaded}
        onPlaybackStateChange={handlePlaybackStateChange}
        onError={handleError}
      />
    );
  }

  return (
    <video
      ref={videoRef as Ref<HTMLVideoElement>}
      src={src}
      data-media-provider=""
      crossOrigin="anonymous"
      {...props}
    />
  );
}
