import type { ComponentProps } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface CaptionsProps extends ComponentProps<'section'> {}

export function Captions({ className, style, ...props }: CaptionsProps) {
  const { state, controlsVisible, isSmall } = usePlayerContext();

  if (!state.context.captionsEnabled || !state.context.activeCue) {
    return null;
  }

  // Calculated to clear the buttons row (~34px) + gap (6px) + time slider (14px)
  // + padding + safe margin, and to mirror the Skip-marker pill offset so the
  // two never overlap.
  const bottomOffset = controlsVisible ? (isSmall ? '86px' : '98px') : isSmall ? '18px' : '26px';

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
        // Consume the cascading CSS variables injected by <Root /> — the caption
        // tree itself never re-renders when the user tweaks the styles.
        backgroundColor: 'var(--player-cue-bg, rgba(8, 8, 8, 0.85))',
        color: 'var(--player-cue-color, #ffffff)',
        fontSize: 'var(--player-cue-font-size, 15px)',
        fontFamily: 'var(--player-cue-font-family, inherit)',
        textShadow: 'var(--player-cue-shadow, 0 0 2px #000, 0 0 4px #000)',
        padding: isSmall ? '3px 8px' : '5px 12px',
        borderRadius: '4px',
        lineHeight: 1.3,
        fontWeight: 600,
        maxWidth: isSmall ? '92%' : '85%',
        pointerEvents: 'none',
        zIndex: 15,
        transition: 'bottom 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style,
      }}
      {...props}
    >
      {state.context.activeCue.text}
    </section>
  );
}
