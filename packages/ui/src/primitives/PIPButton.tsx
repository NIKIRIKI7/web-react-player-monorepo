import type { ComponentProps } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface PIPButtonProps extends ComponentProps<'button'> {}

export function PIPButton({ ref, children, onClick, ...props }: PIPButtonProps) {
  const { state, actions } = usePlayerContext();

  return (
    <button
      ref={ref}
      type="button"
      aria-label={state.context.pip ? 'Exit Picture in Picture' : 'Picture in Picture'}
      aria-pressed={state.context.pip}
      onClick={(e) => {
        actions.togglePIP();
        onClick?.(e);
      }}
      data-player-pip-button=""
      data-pip={state.context.pip ? '' : undefined}
      {...props}
    >
      {children ?? 'PiP'}
    </button>
  );
}
