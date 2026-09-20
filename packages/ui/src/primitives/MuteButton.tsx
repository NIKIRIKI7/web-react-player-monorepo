import type { ComponentProps, MouseEvent } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface MuteButtonProps extends ComponentProps<'button'> {}

export function MuteButton({ ref, children, onClick, style, ...props }: MuteButtonProps) {
  const { state, actions } = usePlayerContext();
  const isMuted = state.context.muted;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    actions.toggleMute();
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={isMuted ? 'Unmute' : 'Mute'}
      aria-pressed={isMuted}
      onClick={handleClick}
      data-player-mute-button=""
      data-muted={isMuted ? '' : undefined}
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
        (isMuted ? (
          // YouTube Muted Icon
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        ) : (
          // YouTube Volume High Icon
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        ))}
    </button>
  );
}
