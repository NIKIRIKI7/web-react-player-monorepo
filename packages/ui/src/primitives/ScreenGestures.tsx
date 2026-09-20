import { type ComponentProps, type PointerEvent, useRef } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface ScreenGesturesProps extends ComponentProps<'div'> {}

export function ScreenGestures({ className, style, ...props }: ScreenGesturesProps) {
  const { actions } = usePlayerContext();
  const clickTimerRef = useRef<number | null>(null);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Only primary mouse button or touch
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;

    if (clickTimerRef.current !== null) {
      // Double click detected!
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;

      if (xRatio < 0.35) {
        actions.seekRelative(-10);
      } else if (xRatio > 0.65) {
        actions.seekRelative(10);
      } else {
        actions.toggleFullscreen();
      }
    } else {
      // Single click detected, schedule action
      clickTimerRef.current = window.setTimeout(() => {
        actions.togglePlay();
        clickTimerRef.current = null;
      }, 260);
    }
  };

  return (
    <div
      className={className}
      data-player-gestures=""
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        cursor: 'pointer',
        ...style,
      }}
      {...props}
    />
  );
}
