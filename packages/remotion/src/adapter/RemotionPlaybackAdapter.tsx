import type { PlayerRef } from '@remotion/player';
import { Player } from '@remotion/player';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type { ITsxCompiler, RemotionCompositionConfig, RemotionSource } from '../types';

export interface RemotionPlaybackAdapterProps {
  source: RemotionSource;
  pluginManager: RemotionPluginManager;
  compiler: ITsxCompiler;
  fsmStatus: string;
  currentTime: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
  onTimeUpdate: (seconds: number) => void;
  onMetadataLoaded: (duration: number, fps: number) => void;
  onPlaybackStateChange: (isPlaying: boolean) => void;
  onError: (error: Error) => void;
  defaultConfig?: RemotionCompositionConfig;
  style?: React.CSSProperties;
  className?: string;
}

const DEFAULT_CONFIG: RemotionCompositionConfig = {
  durationInFrames: 150,
  fps: 30,
  width: 1920,
  height: 1080,
};

export const RemotionPlaybackAdapter: React.FC<RemotionPlaybackAdapterProps> = ({
  source,
  pluginManager,
  compiler,
  fsmStatus,
  currentTime,
  playbackRate,
  volume,
  muted,
  onTimeUpdate,
  onMetadataLoaded,
  onPlaybackStateChange,
  onError,
  defaultConfig = DEFAULT_CONFIG,
  style,
  className,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const [resolvedComponent, setResolvedComponent] = useState<React.ComponentType<
    Record<string, unknown>
  > | null>(null);
  const [activeConfig, setActiveConfig] = useState<RemotionCompositionConfig>(defaultConfig);
  const [isCompiling, setIsCompiling] = useState(false);
  const isInternalSeeking = useRef(false);

  // Стабильные ссылки на колбэки для исключения циклов
  const onMetadataLoadedRef = useRef(onMetadataLoaded);
  onMetadataLoadedRef.current = onMetadataLoaded;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  onPlaybackStateChangeRef.current = onPlaybackStateChange;

  // Кэш последнего источника — предотвращает зацикливание при ошибке компиляции
  const lastSourceKeyRef = useRef<string | null>(null);

  const currentSourceKey =
    source.type === 'code'
      ? `code:${source.code}`
      : `component:${source.component.displayName || source.component.name || 'Anonymous'}`;

  // 1. Компиляция и резолвинг компонента при изменении источника
  useEffect(() => {
    if (lastSourceKeyRef.current === currentSourceKey) {
      return;
    }

    let isCancelled = false;

    const resolveSource = async () => {
      setIsCompiling(true);
      try {
        if (source.type === 'component') {
          const mergedConfig: RemotionCompositionConfig = {
            ...defaultConfig,
            ...source.config,
          };
          if (isCancelled) return;
          lastSourceKeyRef.current = currentSourceKey;
          setActiveConfig(mergedConfig);
          setResolvedComponent(() => source.component);
          onMetadataLoadedRef.current(
            mergedConfig.durationInFrames / mergedConfig.fps,
            mergedConfig.fps,
          );
        } else {
          const { Component, detectedConfig } = await compiler.compile(source.code);
          if (isCancelled) return;

          const mergedConfig: RemotionCompositionConfig = {
            ...defaultConfig,
            ...detectedConfig,
            ...source.config,
          };
          lastSourceKeyRef.current = currentSourceKey;
          setActiveConfig(mergedConfig);
          setResolvedComponent(() => Component);
          onMetadataLoadedRef.current(
            mergedConfig.durationInFrames / mergedConfig.fps,
            mergedConfig.fps,
          );
        }
      } catch (err) {
        if (!isCancelled) {
          // Запоминаем текущий ошибочный ключ, чтобы не повторять компиляцию в цикле
          lastSourceKeyRef.current = currentSourceKey;
          onErrorRef.current(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!isCancelled) {
          setIsCompiling(false);
        }
      }
    };

    resolveSource();
    return () => {
      isCancelled = true;
    };
  }, [currentSourceKey, source, compiler, defaultConfig]);

  // 2. Оборачивание в плагины
  const FinalRenderComponent = useMemo(() => {
    if (!resolvedComponent) return null;
    return pluginManager.applyComponentWrappers(resolvedComponent, activeConfig);
  }, [resolvedComponent, pluginManager, activeConfig]);

  // 3. Синхронизация FSM -> Remotion Player (Воспроизведение / Пауза)
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (fsmStatus === 'playing' && !player.isPlaying()) {
      player.play();
    } else if (fsmStatus !== 'playing' && player.isPlaying()) {
      player.pause();
    }
  }, [fsmStatus]);

  // 4. Синхронизация FSM -> Remotion Player (Перемотка)
  useEffect(() => {
    const player = playerRef.current;
    if (!player || isInternalSeeking.current) return;

    const targetFrame = Math.round(currentTime * activeConfig.fps);
    const currentFrame = player.getCurrentFrame();

    if (Math.abs(currentFrame - targetFrame) > 1) {
      player.seekTo(targetFrame);
    }
  }, [currentTime, activeConfig.fps]);

  // 5. Синхронизация громкости
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (muted) {
      player.mute();
    } else {
      player.unmute();
      player.setVolume(volume);
    }
  }, [volume, muted]);

  // 6. Подписка Remotion Player -> FSM (Обратный поток событий)
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      isInternalSeeking.current = true;
      const seconds = e.detail.frame / activeConfig.fps;
      onTimeUpdateRef.current(seconds);
      window.requestAnimationFrame(() => {
        isInternalSeeking.current = false;
      });
    };

    const handlePlay = () => onPlaybackStateChangeRef.current(true);
    const handlePause = () => onPlaybackStateChangeRef.current(false);

    player.addEventListener('frameupdate', handleFrameUpdate);
    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);

    return () => {
      player.removeEventListener('frameupdate', handleFrameUpdate);
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
    };
  }, [activeConfig.fps]);

  if (isCompiling) {
    return (
      <div
        data-media-provider-loading=""
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          color: '#38bdf8',
          fontFamily: 'monospace',
          fontSize: '14px',
          ...style,
        }}
        className={className}
      >
        <span>Compiling TSX Animation...</span>
      </div>
    );
  }

  if (!FinalRenderComponent) return null;

  return (
    <div
      data-media-provider="remotion"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        ...style,
      }}
      className={className}
    >
      <Player
        ref={playerRef}
        acknowledgeRemotionLicense
        component={FinalRenderComponent}
        inputProps={source.inputProps ?? {}}
        durationInFrames={activeConfig.durationInFrames}
        compositionWidth={activeConfig.width}
        compositionHeight={activeConfig.height}
        fps={activeConfig.fps}
        playbackRate={playbackRate}
        controls={false}
        loop={false}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      />
    </div>
  );
};
