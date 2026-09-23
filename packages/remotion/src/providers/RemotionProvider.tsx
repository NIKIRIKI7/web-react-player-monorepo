import { usePlayerContext } from '@web-react-player/ui';
import type React from 'react';
import { useEffect } from 'react';
import { RemotionPlaybackAdapter } from '../adapter/RemotionPlaybackAdapter';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type { ITsxCompiler, RemotionCompositionConfig, RemotionSource } from '../types';

export interface RemotionProviderProps {
  source: RemotionSource;
  config?: RemotionCompositionConfig;
  pluginManager: RemotionPluginManager;
  compiler: ITsxCompiler;
  style?: React.CSSProperties;
  className?: string;
}

// Engine adapter for the Remotion package. It bridges the headless FSM from
// `@web-react-player/ui` (which knows nothing about Remotion) with the Remotion
// runtime by forwarding state down and media events back up.
export function RemotionProvider({
  source,
  config,
  pluginManager,
  compiler,
  style,
  className,
}: RemotionProviderProps) {
  const { state, send } = usePlayerContext();

  // On mount, tell the FSM which source is being loaded. The adapter itself is
  // responsible for compiling the source and emitting METADATA_LOADED + CAN_PLAY.
  useEffect(() => {
    send({
      type: 'LOAD',
      src: source.type === 'code' ? 'remotion://code' : 'remotion://component',
    });
  }, [source, send]);

  return (
    <RemotionPlaybackAdapter
      source={source}
      defaultConfig={config}
      pluginManager={pluginManager}
      compiler={compiler}
      fsmStatus={state.status}
      currentTime={state.context.currentTime}
      playbackRate={state.context.playbackRate}
      volume={state.context.volume}
      muted={state.context.muted}
      onTimeUpdate={(currentTime) => send({ type: 'TIME_UPDATE', currentTime })}
      onMetadataLoaded={(duration, fps) => {
        send({ type: 'METADATA_LOADED', duration, fps });
        send({ type: 'CAN_PLAY' });
      }}
      onPlaybackStateChange={(isPlaying) => send({ type: isPlaying ? 'PLAYING' : 'PAUSE' })}
      onError={(error) => send({ type: 'ERROR', error })}
      style={style}
      className={className}
    />
  );
}
