import type { PlayerRef } from '@remotion/player';
import { Player } from '@remotion/player';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createAssetResolver, resolveAudioMixAssets } from '../compiler/assetResolver';
import type { RemotionCompilerOptions } from '../compositionConfig';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type {
  CompilerError,
  ITsxCompiler,
  RemotionCompositionConfig,
  RemotionSource,
  VidoraWidgetDefinition,
} from '../types';

/**
 * Свойства низкоуровневого адаптера воспроизведения Remotion.
 *
 * В отличие от {@link RemotionProviderProps} адаптер не зависит от контекста
 * плеера: состояние передаётся пропсами, а события возвращаются колбэками.
 * Обычно используется {@link RemotionProvider}, который подставляет эти
 * значения из FSM.
 *
 * @public
 * @example
 * ```tsx
 * <RemotionPlaybackAdapter
 *   source={{ type: 'code', code }}
 *   pluginManager={suite.pluginManager}
 *   compiler={suite.compiler}
 *   fsmStatus="paused"
 *   currentTime={0}
 *   playbackRate={1}
 *   volume={1}
 *   muted={false}
 *   onTimeUpdate={(seconds) => console.log(seconds)}
 *   onMetadataLoaded={(duration, fps) => console.log(duration, fps)}
 *   onPlaybackStateChange={(playing) => console.log(playing)}
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */
export interface RemotionPlaybackAdapterProps {
  /**
   * Описание композиции: готовый компонент, TSX-код или виджет из реестра.
   *
   * @example
   * ```tsx
   * source={{ type: 'code', code, assets: { logo: '/media/logo.png' } }}
   * ```
   */
  source: RemotionSource;
  /**
   * Менеджер плагинов, оборачивающих компонент перед рендерингом.
   *
   * @example
   * ```tsx
   * pluginManager={suite.pluginManager}
   * ```
   */
  pluginManager: RemotionPluginManager;
  /**
   * Компилятор TSX, используемый для источников типа `code`.
   *
   * @example
   * ```tsx
   * compiler={suite.compiler}
   * ```
   */
  compiler: ITsxCompiler;
  /**
   * Текущий статус FSM плеера.
   *
   * При значении `playing` адаптер вызывает `play()`, при любом другом
   * значении, если плеер играет, — `pause()`.
   *
   * @example
   * ```tsx
   * fsmStatus="playing"
   * ```
   */
  fsmStatus: string;
  /**
   * Текущее время воспроизведения в секундах.
   *
   * Переводится в кадр через `activeConfig.fps` и применяется через
   * `seekTo`, если расхождение больше одного кадра.
   *
   * @example
   * ```tsx
   * currentTime={12.5}
   * ```
   */
  currentTime: number;
  /**
   * Скорость воспроизведения.
   *
   * @example
   * ```tsx
   * playbackRate={0.5}
   * ```
   */
  playbackRate: number;
  /**
   * Громкость в диапазоне 0..1; игнорируется, если включён `muted`.
   *
   * @example
   * ```tsx
   * volume={0.8}
   * ```
   */
  volume: number;
  /**
   * Признак отключения звука.
   *
   * @example
   * ```tsx
   * muted={false}
   * ```
   */
  muted: boolean;
  /**
   * Вызывается при смене кадра: получает время в секундах.
   *
   * @example
   * ```tsx
   * onTimeUpdate={(seconds) => send({ type: 'TIME_UPDATE', currentTime: seconds })}
   * ```
   */
  onTimeUpdate: (seconds: number) => void;
  /**
   * Вызывается после успешной компиляции: получает длительность в секундах и `fps`.
   *
   * @example
   * ```tsx
   * onMetadataLoaded={(duration, fps) => console.log(`${duration}s @ ${fps}fps`)}
   * ```
   */
  onMetadataLoaded: (duration: number, fps: number) => void;
  /**
   * Вызывается при старте и паузе воспроизведения.
   *
   * @example
   * ```tsx
   * onPlaybackStateChange={(isPlaying) => send({ type: isPlaying ? 'PLAYING' : 'PAUSE' })}
   * ```
   */
  onPlaybackStateChange: (isPlaying: boolean) => void;
  /**
   * Вызывается при ошибке компиляции или рантайм-ошибке внутри сцены.
   *
   * @example
   * ```tsx
   * onError={(error) => send({ type: 'ERROR', error })}
   * ```
   */
  onError: (error: Error) => void;
  /**
   * Конфигурация по умолчанию: 150 кадров, 30 fps, 1920x1080.
   *
   * Распознанная из кода и из виджета конфигурация накладывается поверх
   * неё, а `source.config` имеет высший приоритет.
   *
   * @example
   * ```tsx
   * defaultConfig={{ durationInFrames: 300, fps: 30, width: 1080, height: 1920 }}
   * ```
   */
  defaultConfig?: RemotionCompositionConfig | undefined;
  /**
   * Инлайновые стили внешнего контейнера.
   *
   * @example
   * ```tsx
   * style={{ aspectRatio: '16 / 9' }}
   * ```
   */
  style?: React.CSSProperties | undefined;
  /**
   * CSS-класс внешнего контейнера.
   *
   * @example
   * ```tsx
   * className="remotion-player"
   * ```
   */
  className?: string | undefined;
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
  override componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  override render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Адаптер, монтирующий Remotion `Player` и синхронизирующий его с плеером.
 *
 * Адаптер выполняет пять задач:
 *
 * 1. Компилирует источник (компонент, виджет или TSX-код) и строит финальную
 *    конфигурацию композиции.
 * 2. Разрешает относительные пути аудиодорожек в финальном конфиге.
 * 3. Оборачивает компонент плагинами через
 *    {@link RemotionPluginManager.applyComponentWrappers}.
 * 4. Синхронизирует состояние FSM с плеером: воспроизведение, позицию,
 *    скорость, громкость и mute.
 * 5. Транслирует события плеера обратно в колбэки: смена кадра, play, pause
 *    и рантайм-ошибки через error boundary.
 *
 * Компиляция кешируется по ключу источника, поэтому изменения пропсов виджета
 * не вызывают пересборку. Различие кадра больше одного кадра считается
 * расхождением; при обратной синхронизации позиция игнорируется до конца
 * кадра, чтобы не бороться с плеером.
 *
 * @public
 * @example
 * ```tsx
 * import { createDefaultRemotionSuite, RemotionPlaybackAdapter } from '@web-react-player/remotion';
 *
 * const suite = createDefaultRemotionSuite();
 *
 * export function Scene() {
 *   const [time, setTime] = useState(0);
 *   return (
 *     <RemotionPlaybackAdapter
 *       source={{ type: 'code', code: 'export const C = () => <div/>;' }}
 *       pluginManager={suite.pluginManager}
 *       compiler={suite.compiler}
 *       fsmStatus="playing"
 *       currentTime={time}
 *       playbackRate={1}
 *       volume={0.9}
 *       muted={false}
 *       onTimeUpdate={setTime}
 *       onMetadataLoaded={(duration) => console.log(duration)}
 *       onPlaybackStateChange={(playing) => console.log(playing)}
 *       onError={(error) => console.error(error)}
 *     />
 *   );
 * }
 * ```
 */
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

  // --- Поддержка source.type = 'widget' ---
  // Виджет компилируется один раз (кэш в WidgetRegistry), а пропсы приходят
  // обычным объектом: правка инспектора не должна перезапускать компиляцию.
  const widgetDefinition = useMemo<VidoraWidgetDefinition | null>(() => {
    if (source.type !== 'widget') return null;
    return typeof source.widget === 'string'
      ? (source.registry.get(source.widget) ?? null)
      : source.widget;
  }, [source]);

  const playerInputProps = useMemo<Record<string, unknown>>(() => {
    if (source.type !== 'widget') return source.inputProps ?? {};
    if (!widgetDefinition) return {};
    return source.registry.normalizeProps(widgetDefinition, source.widgetProps ?? {});
  }, [source, widgetDefinition]);

  // Ключ того, что именно нужно скомпилировать. Смена пропсов его не меняет.
  const lastCompileKeyRef = useRef<string | null>(null);
  const lastComponentRef = useRef<React.ComponentType<Record<string, unknown>> | null>(null);
  const lastDefaultConfigRef = useRef<RemotionCompositionConfig | undefined>(defaultConfig);

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
    // Быстрый выход: изменились только пропсы виджета, а не сам код
    const compileKey =
      source.type === 'component'
        ? 'component'
        : source.type === 'widget'
          ? `widget:${widgetDefinition?.id ?? ''}:${widgetDefinition?.tsx_code ?? ''}`
          : `code:${source.code}`;

    const isUnchanged =
      source.type === 'component'
        ? lastComponentRef.current === source.component
        : lastCompileKeyRef.current === compileKey;

    if (isUnchanged && lastDefaultConfigRef.current === defaultConfig) return;

    let isCancelled = false;
    const resolveSource = async () => {
      setIsCompiling(true);
      setCompileError(null);
      setRuntimeError(null); // Сбрасываем старые ошибки при новом коде

      try {
        let component: React.ComponentType<Record<string, unknown>>;
        let mergedConfig: RemotionCompositionConfig;

        if (source.type === 'component') {
          component = source.component;
          mergedConfig = {
            ...defaultConfig,
            ...source.config,
          };
        } else if (source.type === 'widget') {
          if (!widgetDefinition) {
            throw new Error(
              `[RemotionPlaybackAdapter] Виджет "${
                typeof source.widget === 'string' ? source.widget : 'unknown'
              }" не найден в реестре.`,
            );
          }

          // Компонент берётся из кэша реестра (0 мс после первого вызова)
          component = await source.registry.compile(widgetDefinition);
          mergedConfig = {
            ...defaultConfig,
            // Разрешение и длительность композиции выводим из ID/тегов виджета
            ...source.registry.getWidgetConfig(widgetDefinition, source.widgetProps ?? {}),
            ...source.config,
          };
        } else {
          // Вызываем компилятор, прокидываем VFS (assets).
          // Ключи с undefined не передаём: exactOptionalPropertyTypes запрещает
          // явный undefined в опциональных полях.
          const compilerOptions: RemotionCompilerOptions = {
            ...(source.assetBaseUrl !== undefined ? { assetBaseUrl: source.assetBaseUrl } : {}),
            ...(source.allowedAssetProtocols !== undefined
              ? { allowedAssetProtocols: source.allowedAssetProtocols }
              : {}),
            ...(source.assetResolver !== undefined ? { assetResolver: source.assetResolver } : {}),
            ...(source.virtualModules !== undefined
              ? { virtualModules: source.virtualModules }
              : {}),
          };
          const compiled = await compiler.compile(
            source.code,
            source.assets || {},
            {},
            compilerOptions,
          );

          component = compiled.Component;
          mergedConfig = {
            ...defaultConfig,
            ...compiled.detectedConfig,
            ...source.config,
          };
        }

        // audioMix может прийти из source.config / defaultConfig, минуя компилятор,
        // поэтому относительные пути разрешаем на финальном конфиге. Операция
        // идемпотентна: уже готовые URL (blob:, https:) остаются как есть.
        const finalConfig: RemotionCompositionConfig = mergedConfig.audioMix
          ? {
              ...mergedConfig,
              audioMix: resolveAudioMixAssets(
                mergedConfig.audioMix,
                createAssetResolver(
                  source.type === 'code' ? source.assets || {} : {},
                  source.type === 'code'
                    ? {
                        ...(source.assetBaseUrl !== undefined
                          ? { assetBaseUrl: source.assetBaseUrl }
                          : {}),
                        ...(source.allowedAssetProtocols !== undefined
                          ? { allowedAssetProtocols: source.allowedAssetProtocols }
                          : {}),
                        ...(source.assetResolver !== undefined
                          ? { assetResolver: source.assetResolver }
                          : {}),
                      }
                    : {},
                ),
              ),
            }
          : mergedConfig;

        if (isCancelled) return;
        setActiveConfig(finalConfig);
        setResolvedComponent(() => component);
        lastCompileKeyRef.current = compileKey;
        lastComponentRef.current = source.type === 'component' ? source.component : null;
        lastDefaultConfigRef.current = defaultConfig;
        onMetadataLoadedRef.current(
          finalConfig.durationInFrames / finalConfig.fps,
          finalConfig.fps,
        );
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
  }, [source, widgetDefinition, compiler, defaultConfig]);

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
          inputProps={playerInputProps}
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
