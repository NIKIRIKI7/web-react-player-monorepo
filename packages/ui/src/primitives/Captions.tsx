import type { ComponentProps } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface CaptionsProps extends ComponentProps<'section'> {}

export function Captions({ className, style, ...props }: CaptionsProps) {
  const { state, controlsVisible, isSmall } = usePlayerContext();

  if (!state.context.captionsEnabled || !state.context.activeCue) {
    return null;
  }

  // Calculated to clear the buttons row (~34px) + gap (6px) + time slider (14px) + padding + safe margin
  const bottomOffset = controlsVisible ? (isSmall ? '82px' : '96px') : isSmall ? '14px' : '24px';

  return (
    <section
      className={className}
      data-player-captions=""
      aria-live="off"
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        backgroundColor: 'rgba(8, 8, 8, 0.85)',
        color: '#ffffff',
        padding: isSmall ? '3px 8px' : '5px 12px',
        borderRadius: '3px',
        fontSize: isSmall ? '12px' : '15px',
        lineHeight: 1.3,
        fontWeight: 600,
        textShadow: '0 0 2px #000, 0 0 4px #000',
        maxWidth: isSmall ? '92%' : '85%',
        pointerEvents: 'none',
        zIndex: 5,
        transition: 'bottom 0.2s ease-in-out, font-size 0.15s ease-out, padding 0.15s ease-out',
        ...style,
      }}
      {...props}
    >
      {state.context.activeCue.text}
    </section>
  );
}
