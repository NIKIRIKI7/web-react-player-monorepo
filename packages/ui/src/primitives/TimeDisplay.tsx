import type { ComponentProps } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import { formatTime } from '../utils/formatTime';

export interface TimeDisplayProps extends ComponentProps<'div'> {
  type?: 'current' | 'duration' | 'remaining';
}

export function TimeDisplay({ ref, type = 'current', children, ...props }: TimeDisplayProps) {
  const { state } = usePlayerContext();

  let timeToShow = 0;
  if (type === 'current') timeToShow = state.context.currentTime;
  if (type === 'duration') timeToShow = state.context.duration;
  if (type === 'remaining')
    timeToShow = Math.max(0, state.context.duration - state.context.currentTime);

  return (
    <div ref={ref} data-player-time-display="" role="timer" aria-live="off" {...props}>
      {formatTime(timeToShow)}
      {children}
    </div>
  );
}
