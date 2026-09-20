import type { ComponentProps, MouseEvent } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface PlayButtonProps extends ComponentProps<'button'> {}

export function PlayButton({ ref, children, onClick, style, ...props }: PlayButtonProps) {
  const { state, actions } = usePlayerContext();
  const isPlaying = state.status === 'playing';

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    actions.togglePlay();
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={isPlaying ? 'Pause' : 'Play'}
      aria-pressed={isPlaying}
      onClick={handleClick}
      data-player-play-button=""
      data-playing={isPlaying ? '' : undefined}
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
        (isPlaying ? (
          // YouTube Pause Icon
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          // YouTube Play Icon (Triangle)
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        ))}
    </button>
  );
}
