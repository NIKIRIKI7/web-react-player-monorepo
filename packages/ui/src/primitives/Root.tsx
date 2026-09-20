import { type ComponentProps, useEffect, useRef } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface RootProps extends ComponentProps<'div'> {
  keyboardShortcuts?: boolean;
}

export function Root({ ref, children, keyboardShortcuts = true, className, ...props }: RootProps) {
  const { state, send } = usePlayerContext();
  const stateRef = useRef(state);
  stateRef.current = state;

  // Global keyboard shortcuts (A11y)
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) {
        return;
      }

      const currentState = stateRef.current;
      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          send({ type: currentState.status === 'playing' ? 'PAUSE' : 'PLAY' });
          break;
        case 'm':
          event.preventDefault();
          send({
            type: 'VOLUME_CHANGE',
            volume: currentState.context.volume,
            muted: !currentState.context.muted,
          });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardShortcuts, send]);

  return (
    <div
      ref={ref}
      className={className}
      data-player-root=""
      data-status={state.status}
      data-playing={state.status === 'playing' ? '' : undefined}
      data-paused={state.status !== 'playing' ? '' : undefined}
      data-muted={state.context.muted ? '' : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
