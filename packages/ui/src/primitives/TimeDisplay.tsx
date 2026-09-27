import type { ComponentProps } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import { formatTime } from '../utils/formatTime';

/**
 * Свойства индикатора времени.
 *
 * Наследует все нативные атрибуты `<div>`, включая `ref`.
 *
 * @public
 * @example
 * ```tsx
 * <TimeDisplay type="remaining" />
 * ```
 */
export interface TimeDisplayProps extends ComponentProps<'div'> {
  /**
   * Какое значение времени показывать.
   *
   * - `current` — текущая позиция воспроизведения;
   * - `duration` — полная длительность;
   * - `remaining` — оставшееся время (не меньше нуля).
   *
   * @defaultValue `'current'`
   * @example
   * ```tsx
   * <TimeDisplay type="current" />
   * <TimeDisplay type="duration" />
   * <TimeDisplay type="remaining" />
   * ```
   */
  type?: 'current' | 'duration' | 'remaining';
}

/**
 * Индикатор времени, отформатированный через {@link formatTime}.
 *
 * Значение берётся из контекста плеера в зависимости от свойства `type`.
 * Разметка доступна программным каналам: `role="timer"` и
 * `aria-live="off"`, чтобы не озвучивать каждое обновление.
 *
 * @public
 * @example
 * ```tsx
 * import { TimeDisplay } from '@web-react-player/ui';
 *
 * <div>
 *   <TimeDisplay type="current" />
 *   {' / '}
 *   <TimeDisplay type="duration" />
 * </div>
 * ```
 */
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
