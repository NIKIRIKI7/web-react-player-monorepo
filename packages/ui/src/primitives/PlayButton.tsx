import type { ComponentProps, MouseEvent } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface PlayButtonProps extends ComponentProps<'button'> {}

export function PlayButton({ ref, children, onClick, ...props }: PlayButtonProps) {
  const { state, send } = usePlayerContext();
  const isPlaying = state.status === 'playing';

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Dispatch action to FSM
    send({ type: isPlaying ? 'PAUSE' : 'PLAY' });
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
      {...props}
    >
      {children}
    </button>
  );
}
