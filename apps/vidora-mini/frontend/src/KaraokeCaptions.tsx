import type { WordCue } from '@web-react-player/core';
import { usePlayerContext } from '@web-react-player/ui';
import type { CSSProperties } from 'react';

export function KaraokeCaptions() {
  const { state, controlsVisible, isSmall } = usePlayerContext();
  const cue = state.context.activeCue;

  if (!(state.context.captionsEnabled && cue)) return null;

  const time = state.context.currentTime;
  const bottomOffset = controlsVisible ? (isSmall ? '86px' : '98px') : isSmall ? '18px' : '30px';
  const words: WordCue[] = cue.words ?? [];

  return (
    <div
      data-vidora-captions=""
      aria-live="off"
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        padding: isSmall ? '6px 10px' : '8px 16px',
        borderRadius: '12px',
        fontSize: isSmall ? 18 : 26,
        fontWeight: 900,
        zIndex: 20,
        transition: 'bottom 0.3s ease',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px',
        pointerEvents: 'none',
        width: 'max-content',
        maxWidth: '90%',
      }}
    >
      {words.length > 0 ? (
        words.map((word) => {
          const isActive = time >= word.start && time < word.end;
          const isPassed = time >= word.end;
          const style: CSSProperties = {
            color: isActive ? '#38bdf8' : '#ffffff',
            opacity: isPassed ? 0.5 : 1,
            transform: isActive ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
            transition: 'all 0.1s ease',
            textShadow: isActive ? '0 0 12px rgba(56,189,248,0.7)' : 'none',
          };

          return (
            <span key={`${word.start}-${word.end}-${word.word}`} style={style}>
              {word.word}
            </span>
          );
        })
      ) : (
        <span>{cue.text}</span>
      )}
    </div>
  );
}
