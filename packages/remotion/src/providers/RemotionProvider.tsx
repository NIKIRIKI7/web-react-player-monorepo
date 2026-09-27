import { usePlayerContext } from '@web-react-player/ui';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { RemotionPlaybackAdapter } from '../adapter/RemotionPlaybackAdapter';
import type { RemotionPluginManager } from '../plugins/PluginManager';
import type { ITsxCompiler, RemotionCompositionConfig, RemotionSource } from '../types';

/**
 * Свойства моста между плеером и Remotion {@link RemotionProvider}.
 *
 * @public
 * @example
 * ```tsx
 * <RemotionProvider
 *   source={{ type: 'code', code }}
 *   compiler={suite.compiler}
 *   pluginManager={suite.pluginManager}
 * />
 * ```
 */
export interface RemotionProviderProps {
  /**
   * Описание композиции: компонент, TSX-код или виджет.
   *
   * @example
   * ```tsx
   * source={{ type: 'component', component: Composition }}
   * source={{ type: 'code', code: 'export const C = () => null;' }}
   * source={{ type: 'widget', widget: 'lower-third', registry }}
   * ```
   */
  source: RemotionSource;
  /**
   * Конфигурация композиции.
   *
   * Если не передана, используется конфигурация, распознанная компилятором
   * из исходного кода.
   *
   * @example
   * ```tsx
   * config={{ durationInFrames: 300, fps: 30, width: 1920, height: 1080 }}
   * ```
   */
  config?: RemotionCompositionConfig;
  /**
   * Менеджер плагинов, применяемых к композиции.
   *
   * @example
   * ```tsx
   * pluginManager={suite.pluginManager}
   * ```
   */
  pluginManager: RemotionPluginManager;
  /**
   * Компилятор TSX для сборки композиции.
   *
   * @example
   * ```tsx
   * compiler={suite.compiler}
   * ```
   */
  compiler: ITsxCompiler;
  /**
   * Инлайновые стили контейнера адаптера.
   *
   * @example
   * ```tsx
   * style={{ width: '100%', height: '100%' }}
   * ```
   */
  style?: React.CSSProperties;
  /**
   * CSS-класс контейнера адаптера.
   *
   * @example
   * ```tsx
   * className="remotion-surface"
   * ```
   */
  className?: string;
}

/**
 * Провайдер движка Remotion для плеера.
 *
 * Мост между headless-состоянием из `@web-react-player/ui`, которое ничего не
 * знает о Remotion, и runtime самого Remotion: состояние передаётся вниз, а
 * медиасобытия возвращаются наверх в виде событий FSM.
 *
 * При монтировании отправляется событие `LOAD` с псевдо-источником
 * (`remotion://code`, `remotion://widget` или `remotion://component`).
 * Повторная отправка происходит только при смене самого источника: пропсы
 * виджета меняются на каждом движении слайдера инспектора, и частая отправка
 * сбрасывала бы текущее время и длительность.
 *
 * Само преобразование состояния в сцену и обратную отправку событий
 * выполняет {@link RemotionPlaybackAdapter}.
 *
 * @public
 * @example
 * ```tsx
 * import { createDefaultRemotionSuite, RemotionProvider } from '@web-react-player/remotion';
 * import { PlayerProvider, Root, TimeSlider } from '@web-react-player/ui';
 * import { useMemo } from 'react';
 *
 * export function App() {
 *   const suite = useMemo(() => createDefaultRemotionSuite(), []);
 *   return (
 *     <PlayerProvider>
 *       <Root>
 *         <RemotionProvider
 *           source={{ type: 'code', code: 'export const C = () => <div>Привет</div>;' }}
 *           compiler={suite.compiler}
 *           pluginManager={suite.pluginManager}
 *         />
 *         <TimeSlider />
 *       </Root>
 *     </PlayerProvider>
 *   );
 * }
 * ```
 */
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
