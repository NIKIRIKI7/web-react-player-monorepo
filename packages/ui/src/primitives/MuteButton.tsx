import type { ComponentProps, MouseEvent } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface MuteButtonProps extends ComponentProps<'button'> {}

export function MuteButton({ ref, children, onClick, ...props }: MuteButtonProps) {
  const { state, send } = usePlayerContext();
  const muted = state.context.muted;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Dispatch volume change to FSM
    send({ type: 'VOLUME_CHANGE', volume: state.context.volume, muted: !muted });
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={muted ? 'Unmute' : 'Mute'}
      aria-pressed={muted}
      onClick={handleClick}
      data-player-mute-button=""
      data-muted={muted ? '' : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
