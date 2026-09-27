import { type ComponentProps, useCallback, useEffect, useMemo, useRef } from 'react';
import { captionStylesToCssVariables } from '../captions/utils';
import { usePlayerContext } from '../context/PlayerContext';
import { compileHotkeyBindings, handleKeyboardShortcut } from '../hotkeys/dispatcher';
import type { HotkeysMap } from '../hotkeys/types';

/**
 * Свойства корневого контейнера плеера {@link Root}.
 *
 * Наследует все нативные атрибуты `<div>`, включая `ref` и
 * `onPointerMove`/`onPointerLeave`.
 *
 * @public
 * @example
 * ```tsx
 * <Root keyboardShortcuts hotkeys={{ k: 'togglePlay' }} idleTimeout={2000}>
 *   <video src="/media/movie.mp4" />
 * </Root>
 * ```
 */
export interface RootProps extends ComponentProps<'div'> {
  /**
   * Включить глобальные горячие клавиши на уровне `document`.
   *
   * Слушатель игнорирует нажатия в редактируемых полях и на кнопках,
   * чтобы сохранить нативное поведение `Space`/`Enter`.
   *
   * @defaultValue `true`
   * @example
   * ```tsx
   * <Root keyboardShortcuts={false}>...</Root>
   * ```
   */
  keyboardShortcuts?: boolean;
  /**
   * Пользовательские переопределения горячих клавиш.
   *
   * Имеют приоритет над встроенной раскладкой {@link DEFAULT_HOTKEYS}.
   *
   * @example
   * ```tsx
   * <Root hotkeys={{ q: 'toggleMute', r: 'seekTo10' }}>...</Root>
   * ```
   */
  hotkeys?: HotkeysMap;
  /**
   * Задержка в миллисекундах до автоматического скрытия элементов управления.
   *
   * Таймер запускается только во время воспроизведения и при отсутствии
   * перетаскивания таймлайна.
   *
   * @defaultValue `2500`
   * @example
   * ```tsx
   * <Root idleTimeout={4000}>...</Root>
   * ```
   */
  idleTimeout?: number;
  /**
   * Ширина в пикселях, ниже которой включается компактная раскладка.
   *
   * Публикуется в атрибутах `data-sm` и `data-lg` для CSS-стилей.
   *
   * @defaultValue `580`
   * @example
   * ```tsx
   * <Root smallWhenWidth={480}>...</Root>
   * ```
   */
  smallWhenWidth?: number;
}

/**
 * Корневой контейнер плеера.
 *
 * Отвечает за всё, что не относится к содержимому: сборку и обработку
 * горячих клавиш, автоматическое скрытие контролов по простою, адаптивную
 * раскладку через `ResizeObserver`, синхронизацию нативных событий
 * полноэкранного режима с FSM, публикацию метрик плеера в CSS-переменные
 * (`--player-time-progress`, `--player-buffered`, `--player-volume`) и
 * каскад CSS-переменных со стилями субтитров.
 *
 * На корневой элемент выставляются `data-` атрибуты состояния
 * (`data-status`, `data-playing`, `data-paused`, `data-muted`,
 * `data-fullscreen`, `data-theater`, `data-sm`/`data-lg`,
 * `data-controls-visible`/`data-controls-hidden`), что позволяет стилизовать
 * плеер снаружи без React.
 *
 * @public
 * @example
 * ```tsx
 * import { Html5VideoProvider, PlayButton, Root, TimeSlider } from '@web-react-player/ui';
 *
 * export function Player() {
 *   return (
 *     <Root className="my-player" idleTimeout={3000}>
 *       <Html5VideoProvider src="/media/movie.mp4" />
 *       <PlayButton />
 *       <TimeSlider />
 *     </Root>
 *   );
 * }
 * ```
 *
 * @example Пользовательские горячие клавиши
 * ```tsx
 * <Root hotkeys={{ q: 'toggleMute', 'Shift+P': 'togglePlay' }}>...</Root>
 * ```
 */
export function Root({
  ref,
  children,
  keyboardShortcuts = true,
  hotkeys,
  idleTimeout = 2500,
  smallWhenWidth = 580,
  className,
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}: RootProps) {
  const context = usePlayerContext();
  const {
    state,
    send,
    rootRef,
    controlsVisible,
    setControlsVisible,
    isScrubbing,
    isSmall,
    setIsSmall,
    captionStyles,
  } = context;

  const idleTimerRef = useRef<number | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearIdleTimer();

    if (state.status === 'playing' && !isScrubbing) {
      idleTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, idleTimeout);
    }
  }, [clearIdleTimer, idleTimeout, isScrubbing, setControlsVisible, state.status]);

  useEffect(() => {
    if (state.status !== 'playing' || isScrubbing) {
      setControlsVisible(true);
      clearIdleTimer();
    } else {
      showControls();
    }
    return clearIdleTimer;
  }, [clearIdleTimer, isScrubbing, setControlsVisible, showControls, state.status]);

  // Compile the prioritized hotkey pipeline once per config change. Custom
  // user bindings come first, the default YouTube layout acts as fallback.
  const compiledBindings = useMemo(
    () => (keyboardShortcuts ? compileHotkeyBindings(hotkeys) : []),
    [keyboardShortcuts, hotkeys],
  );

  // Keep the freshest context in a ref so the listener never goes stale and is
  // not re-attached on every playback-frame state change.
  const contextRef = useRef(context);
  contextRef.current = context;

  // Declarative global keyboard shortcuts: KeyboardEvent -> context filter ->
  // key normalizer -> collision-aware dispatcher (preventDefault only on match).
  useEffect(() => {
    if (!keyboardShortcuts || compiledBindings.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // The dispatcher already ignores editable fields; buttons keep their
      // native Space/Enter affordance so we drop focus-driven key repeats.
      if (target && target.tagName === 'BUTTON') return;

      showControls();

      const context = contextRef.current;
      if (handleKeyboardShortcut(event, compiledBindings, context)) {
        context.actions.triggerAction('shortcut');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [compiledBindings, keyboardShortcuts, showControls]);

  // Track container width to expose data-sm / data-lg breakpoints
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setIsSmall(entry.contentRect.width < smallWhenWidth);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootRef, setIsSmall, smallWhenWidth]);

  // Synchronize native Fullscreen change with FSM state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement,
      );
      send({ type: 'FULLSCREEN_CHANGE', fullscreen: isFs });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [send]);

  // Publish player metrics as CSS custom properties so external overlays and
  // styles can key off the playhead, buffered range or volume without re-rendering.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const duration = state.context.duration > 0 ? state.context.duration : 1;
    const progress = (state.context.currentTime / duration) * 100;
    const buffered = (state.context.bufferedEnd / duration) * 100;
    const volume = state.context.volume * 100;
    el.style.setProperty('--player-time-progress', `${progress}%`);
    el.style.setProperty('--player-buffered', `${buffered}%`);
    el.style.setProperty('--player-volume', `${volume}%`);
  }, [state, rootRef]);

  // Cascade the caption style preferences as root CSS variables. <Captions />
  // and the Live Preview Box both read them, giving instant style changes
  // without re-rendering the subtitle tree.
  const captionVars = useMemo(() => captionStylesToCssVariables(captionStyles), [captionStyles]);

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      className={className}
      data-player-root=""
      data-status={state.status}
      data-playing={state.status === 'playing' ? '' : undefined}
      data-paused={state.status !== 'playing' ? '' : undefined}
      data-muted={state.context.muted ? '' : undefined}
      data-fullscreen={state.context.fullscreen ? '' : undefined}
      data-theater={state.context.theater ? '' : undefined}
      data-sm={isSmall ? '' : undefined}
      data-lg={!isSmall ? '' : undefined}
      data-size={isSmall ? 'sm' : 'lg'}
      data-controls-visible={controlsVisible ? '' : undefined}
      data-controls-hidden={!controlsVisible ? '' : undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'block',
        overflow: 'hidden',
        backgroundColor: '#000000',
        ...style,
        ...captionVars,
        ...(state.context.brightness !== 1
          ? { filter: `brightness(${state.context.brightness})` }
          : {}),
        ...(state.context.fullscreen
          ? { width: '100vw', height: '100vh', aspectRatio: 'unset', borderRadius: 0 }
          : {}),
      }}
      onPointerMove={(e) => {
        showControls();
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        if (state.status === 'playing' && !isScrubbing) {
          setControlsVisible(false);
        }
        onPointerLeave?.(e);
      }}
      {...props}
    >
      {children}
    </div>
  );
}
