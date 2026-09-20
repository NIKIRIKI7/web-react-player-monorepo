import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { usePlayerContext, usePlayerState } from '../context/PlayerContext';
import { Slot } from '../utils/Slot';

export interface PlayButtonProps extends ComponentProps<'button'> {
  asChild?: boolean;
}

export function PlayButton({ asChild, children, onClick, style, ...props }: PlayButtonProps) {
  const { actions } = usePlayerContext();
  // Granular subscription: the button only re-renders when the status changes.
  const isPlaying = usePlayerState((s) => s.status === 'playing');

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    actions.togglePlay();
    onClick?.(e);
  };

  if (asChild) {
    return (
      <Slot
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        aria-pressed={isPlaying}
        onClick={handleClick}
        data-player-play-button=""
        data-playing={isPlaying ? '' : undefined}
        style={style}
        {...props}
      >
        {children as ReactNode}
      </Slot>
    );
  }

  return (
    <button
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
      {renderIcon(children, isPlaying)}
    </button>
  );
}

function renderIcon(children: ReactNode, isPlaying: boolean): ReactNode {
  if (children) return children;
  return isPlaying ? (
    // YouTube Pause Icon
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ) : (
    // YouTube Play Icon (Triangle)
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
