import { type ComponentProps, useEffect } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface RootProps extends ComponentProps<'div'> {
  keyboardShortcuts?: boolean;
}

export function Root({ ref, children, keyboardShortcuts = true, className, ...props }: RootProps) {
  const { state, send } = usePlayerContext();

  // Global keyboard shortcuts (A11y)
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore key presses inside inputs (e.g., sliders)
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          send({ type: state.status === 'playing' ? 'PAUSE' : 'PLAY' });
          break;
        case 'm':
          event.preventDefault();
          send({
            type: 'VOLUME_CHANGE',
            volume: state.context.volume,
            muted: !state.context.muted,
          });
          break;
      }
    };

    // Safe removal of event listeners (Memory leak prevention)
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardShortcuts, state, send]);

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
