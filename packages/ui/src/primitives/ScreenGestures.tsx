import { type ComponentProps, type PointerEvent, useRef } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface ScreenGesturesProps extends ComponentProps<'div'> {}

export function ScreenGestures({ className, style, ...props }: ScreenGesturesProps) {
  const { state, actions } = usePlayerContext();
  const stateRef = useRef(state);
  stateRef.current = state; // Fresh state without re-renders

  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const originalSpeed = useRef(1);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    isSwiping.current = false;
    originalSpeed.current = stateRef.current.context.playbackRate;

    // 2x Speed on Long Press (UX)
    longPressTimer.current = window.setTimeout(() => {
      if (!isSwiping.current) {
        actions.setLongPressSpeedUp(true);
        actions.setPlaybackRate(2);
      }
    }, 500);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!isSwiping.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      isSwiping.current = true;
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    }

    if (isSwiping.current) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Swipe: Horizontal Seek
        actions.seekRelative(dx * 0.1);
        startX.current = e.clientX; // reset to avoid flying into infinity
      } else {
        // Swipe: Vertical (Left = Brightness, Right = Volume)
        const rect = e.currentTarget.getBoundingClientRect();
        if (startX.current < rect.left + rect.width / 2) {
          actions.setBrightness(stateRef.current.context.brightness - dy * 0.01);
        } else {
          actions.setAudioGain(stateRef.current.context.audioGain - dy * 0.02);
        }
        startY.current = e.clientY;
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (stateRef.current.context.isLongPressSpeedUp) {
      actions.setLongPressSpeedUp(false);
      actions.setPlaybackRate(originalSpeed.current);
    } else if (!isSwiping.current) {
      // Normal click — pause/play
      actions.togglePlay();
    }
  };

  return (
    <div
      className={className}
      data-player-gestures=""
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        touchAction: 'none',
        ...style,
      }}
      {...props}
    />
  );
}
