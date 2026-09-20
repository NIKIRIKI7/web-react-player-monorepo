import type { ComponentProps, MouseEvent } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface MuteButtonProps extends ComponentProps<'button'> {}

export function MuteButton({ ref, children, onClick, ...props }: MuteButtonProps) {
  const { state, send } = usePlayerContext();
  const isMuted = state.context.muted;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    send({
      type: 'VOLUME_CHANGE',
      volume: state.context.volume,
      muted: !isMuted,
    });
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
      {...props}
    >
      {children ?? (isMuted ? 'Unmute' : 'Mute')}
    </button>
  );
}
