import type { ComponentProps } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface FullscreenButtonProps extends ComponentProps<'button'> {}

export function FullscreenButton({
  ref,
  children,
  onClick,
  style,
  ...props
}: FullscreenButtonProps) {
  const { state, actions } = usePlayerContext();
  const isFullscreen = state.context.fullscreen;

  return (
    <button
      ref={ref}
      type="button"
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      aria-pressed={isFullscreen}
      onClick={(e) => {
        actions.toggleFullscreen();
        onClick?.(e);
      }}
      data-player-fullscreen-button=""
      data-fullscreen={isFullscreen ? '' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        color: 'inherit',
        cursor: 'pointer',
        padding: '6px',
        ...style,
      }}
      {...props}
    >
      {children ??
        (isFullscreen ? (
          // YouTube Exit Fullscreen Icon
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
          </svg>
        ) : (
          // YouTube Enter Fullscreen Icon
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          </svg>
        ))}
    </button>
  );
}
