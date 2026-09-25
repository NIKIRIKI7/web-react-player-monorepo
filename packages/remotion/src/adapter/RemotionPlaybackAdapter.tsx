import type { PlayerRef } from '@remotion/player';
import { Player } from '@remotion/player';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type {
  CompilerError,
  ITsxCompiler,
  RemotionCompositionConfig,
  RemotionSource,
} from '../types';

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

// React Error Boundary для перехвата рантайм-ошибок внутри Remotion Player
class AdapterErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

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
  const [compileError, setCompileError] = useState<Error | CompilerError | null>(null);
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);

  const isInternalSeeking = useRef(false);

  // Стабильные ссылки
  const onMetadataLoadedRef = useRef(onMetadataLoaded);
  onMetadataLoadedRef.current = onMetadataLoaded;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  onPlaybackStateChangeRef.current = onPlaybackStateChange;

  // 1. Компиляция и рефлексия
  useEffect(() => {
    let isCancelled = false;
    const resolveSource = async () => {
      setIsCompiling(true);
      setCompileError(null);
      setRuntimeError(null); // Сбрасываем старые ошибки при новом коде

      try {
        if (source.type === 'component') {
          const mergedConfig: RemotionCompositionConfig = {
            ...defaultConfig,
            ...source.config,
          };
          if (isCancelled) return;
          setActiveConfig(mergedConfig);
          setResolvedComponent(() => source.component);
          onMetadataLoadedRef.current(
            mergedConfig.durationInFrames / mergedConfig.fps,
            mergedConfig.fps,
          );
        } else {
          // Вызываем компилятор, прокидываем VFS (assets)
          const { Component, detectedConfig } = await compiler.compile(
            source.code,
            source.assets || {},
          );

          if (isCancelled) return;
          const mergedConfig: RemotionCompositionConfig = {
            ...defaultConfig,
            ...detectedConfig,
            ...source.config,
          };

          setActiveConfig(mergedConfig);
          setResolvedComponent(() => Component);
          onMetadataLoadedRef.current(
            mergedConfig.durationInFrames / mergedConfig.fps,
            mergedConfig.fps,
          );
        }
      } catch (err) {
        if (!isCancelled) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          setCompileError(errorObj);
          onErrorRef.current(errorObj);
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
  }, [source, compiler, defaultConfig]);

  // 2. Оборачивание в плагины
  const FinalRenderComponent = useMemo(() => {
    if (!resolvedComponent) return null;
    return pluginManager.applyComponentWrappers(resolvedComponent, activeConfig);
  }, [resolvedComponent, pluginManager, activeConfig]);

  // 3-5. Синхронизация состояний (Пропуск если ошибка)
  useEffect(() => {
    const player = playerRef.current;
    if (!player || compileError || runtimeError) return;

    if (fsmStatus === 'playing' && !player.isPlaying()) {
      player.play();
    } else if (fsmStatus !== 'playing' && player.isPlaying()) {
      player.pause();
    }
  }, [fsmStatus, compileError, runtimeError]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || isInternalSeeking.current || compileError || runtimeError) return;
    const targetFrame = Math.round(currentTime * activeConfig.fps);
    if (Math.abs(player.getCurrentFrame() - targetFrame) > 1) {
      player.seekTo(targetFrame);
    }
  }, [currentTime, activeConfig.fps, compileError, runtimeError]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || compileError || runtimeError) return;
    if (muted) {
      player.mute();
    } else {
      player.unmute();
      player.setVolume(volume);
    }
  }, [volume, muted, compileError, runtimeError]);

  // 6. Подписка на события
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      isInternalSeeking.current = true;
      onTimeUpdateRef.current(e.detail.frame / activeConfig.fps);
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
  }, [activeConfig.fps]); // Переподписка при смене компонента

  // --- RENDER PHASES ---

  // Фаза ошибки DX
  const activeError = compileError || runtimeError;
  if (activeError) {
    const isCompilerErr = 'type' in activeError;
    const typeLabel = isCompilerErr ? (activeError as CompilerError).type : 'Runtime Error';
    const suggestion = isCompilerErr
      ? (activeError as CompilerError).suggestion
      : 'Проверьте логику ваших React-компонентов или хуков Remotion.';

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '2rem',
          background: '#020617',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
          ...style,
        }}
        className={className}
      >
        <div
          style={{
            background: '#0f172a',
            borderLeft: '4px solid #ef4444',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.75rem 0',
              color: '#ef4444',
              fontSize: '1.125rem',
              fontFamily: 'sans-serif',
            }}
          >
            {typeLabel}
          </h3>
          <p
            style={{
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              opacity: 0.9,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
            }}
          >
            {activeError.message}
          </p>
          {suggestion && (
            <div
              style={{
                marginTop: '1rem',
                color: '#38bdf8',
                fontSize: '0.9rem',
                fontFamily: 'sans-serif',
                background: '#0369a120',
                padding: '0.75rem',
                borderRadius: '0.375rem',
              }}
            >
              💡 <b>Подсказка:</b> {suggestion}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Фаза загрузки
  if (isCompiling) {
    return (
      <div
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
        <span style={{ animation: 'pulse 1.5s infinite opacity' }}>Compiling TSX Engine...</span>
      </div>
    );
  }

  if (!FinalRenderComponent) return null;

  // Фаза плеера
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
        backgroundColor: '#000',
        ...style,
      }}
      className={className}
    >
      <AdapterErrorBoundary onError={setRuntimeError}>
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
      </AdapterErrorBoundary>
    </div>
  );
};
