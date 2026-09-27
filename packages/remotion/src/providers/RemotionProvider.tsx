import { usePlayerContext } from '@web-react-player/ui';
import type React from 'react';
import { useEffect, useRef } from 'react';
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
  const lastLoadKeyRef = useRef<string | null>(null);

  // On mount, tell the FSM which source is being loaded. The adapter itself is
  // responsible for compiling the source and emitting METADATA_LOADED + CAN_PLAY.
  useEffect(() => {
    const loadKey =
      source.type === 'component'
        ? 'component'
        : source.type === 'code'
          ? `code:${source.code}`
          : `widget:${typeof source.widget === 'string' ? source.widget : source.widget.id}`;

    // Пропсы виджета меняются на каждом движении слайдера инспектора, поэтому
    // LOAD отправляем только при смене самого источника, иначе плеер каждый
    // раз сбрасывал бы текущее время и длительность.
    if (lastLoadKeyRef.current === loadKey) return;
    lastLoadKeyRef.current = loadKey;

    send({
      type: 'LOAD',
      src:
        source.type === 'code'
          ? 'remotion://code'
          : source.type === 'widget'
            ? 'remotion://widget'
            : 'remotion://component',
    });
  }, [source, send]);

  return (
    <RemotionPlaybackAdapter
      source={source}
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
      {...(config !== undefined ? { defaultConfig: config } : {})}
      {...(style !== undefined ? { style } : {})}
      {...(className !== undefined ? { className } : {})}
    />
  );
}
