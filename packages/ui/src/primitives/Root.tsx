import { type ComponentProps, useCallback, useEffect, useRef } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface RootProps extends ComponentProps<'div'> {
  keyboardShortcuts?: boolean;
  idleTimeout?: number;
  smallWhenWidth?: number;
}

export function Root({
  ref,
  children,
  keyboardShortcuts = true,
  idleTimeout = 2500,
  smallWhenWidth = 580,
  className,
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}: RootProps) {
  const {
    state,
    send,
    actions,
    rootRef,
    controlsVisible,
    setControlsVisible,
    isScrubbing,
    isSmall,
    setIsSmall,
  } = usePlayerContext();

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

  // Full YouTube Standard Keyboard Shortcuts
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)) {
        return;
      }

      showControls();

      if (event.key >= '0' && event.key <= '9' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        const percent = Number.parseInt(event.key, 10) / 10;
        actions.seek(state.context.duration * percent);
        actions.triggerAction('seek', `${Math.round(percent * 100)}%`);
        return;
      }

      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          event.preventDefault();
          actions.togglePlay();
          break;
        case 'j':
        case 'J':
          event.preventDefault();
          actions.seekRelative(-10);
          break;
        case 'l':
        case 'L':
          event.preventDefault();
          actions.seekRelative(10);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          actions.seekRelative(-5);
          break;
        case 'ArrowRight':
          event.preventDefault();
          actions.seekRelative(5);
          break;
        case 'ArrowUp':
          event.preventDefault();
          actions.setVolume(state.context.volume + 0.05);
          break;
        case 'ArrowDown':
          event.preventDefault();
          actions.setVolume(state.context.volume - 0.05);
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          actions.toggleMute();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          actions.toggleFullscreen();
          break;
        case 'c':
        case 'C':
          event.preventDefault();
          actions.toggleCaptions();
          break;
        case 't':
        case 'T':
          event.preventDefault();
          actions.toggleTheater();
          break;
        case '>':
          event.preventDefault();
          actions.setPlaybackRate(Math.min(2, state.context.playbackRate + 0.25));
          break;
        case '<':
          event.preventDefault();
          actions.setPlaybackRate(Math.max(0.25, state.context.playbackRate - 0.25));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [actions, keyboardShortcuts, showControls, state.context]);

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
        ...style,
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
