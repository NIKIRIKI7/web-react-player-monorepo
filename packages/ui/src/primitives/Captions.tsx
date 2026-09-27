import type { WordCue } from '@web-react-player/core';
import type { ComponentProps, CSSProperties } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface CaptionsProps extends ComponentProps<'section'> {
  activeWordColor?: string;
  passedWordOpacity?: number;
  wordTransition?: string;
}

const DEFAULT_ACTIVE_WORD_COLOR = '#38bdf8';
const DEFAULT_PASSED_WORD_OPACITY = 0.7;
const DEFAULT_WORD_TRANSITION =
  'color 0.1s ease-out, opacity 0.1s ease-out, transform 0.1s ease-out';

function renderWords(
  words: WordCue[],
  register: (index: number, element: HTMLSpanElement | null) => void,
) {
  return words.map((word, index) => (
    <span
      key={`${word.start}-${word.end}-${word.word}`}
      ref={(element) => register(index, element)}
      data-player-caption-word=""
      data-active="false"
      data-passed="false"
      style={{
        display: 'inline-block',
        marginRight: '0.25em',
        whiteSpace: 'pre',
      }}
    >
      {word.word}
    </span>
  ));
}

export function Captions({
  className,
  style,
  activeWordColor = DEFAULT_ACTIVE_WORD_COLOR,
  passedWordOpacity = DEFAULT_PASSED_WORD_OPACITY,
  wordTransition = DEFAULT_WORD_TRANSITION,
  ...props
}: CaptionsProps) {
  const { state, controlsVisible, isSmall } = usePlayerContext();
  const activeCue = state.context.activeCue;
  const currentTime = state.context.currentTime;
  const words = activeCue?.words;
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const wordNodes = useMemo(
    () =>
      renderWords(words ?? [], (index, element) => {
        wordRefs.current[index] = element;
      }),
    [words],
  );

  useEffect(() => {
    const activeWords = words ?? [];
    wordRefs.current.length = activeWords.length;

    activeWords.forEach((word, index) => {
      const element = wordRefs.current[index];
      if (!element) return;

      const isActive = currentTime >= word.start && currentTime < word.end;
      const isPassed = currentTime >= word.end;

      element.dataset.active = isActive ? 'true' : 'false';
      element.dataset.passed = isPassed ? 'true' : 'false';
      element.style.color = isActive ? 'var(--player-cue-active-word-color)' : '';
      element.style.opacity = isPassed ? 'var(--player-cue-passed-word-opacity)' : '';
      element.style.transform = isActive ? 'scale(1.05)' : '';
      element.style.transition = 'var(--player-cue-word-transition)';
    });
  }, [currentTime, words]);

  if (!(state.context.captionsEnabled && activeCue)) {
    return null;
  }

  const bottomOffset = controlsVisible ? (isSmall ? '86px' : '98px') : isSmall ? '18px' : '26px';
  const captionStyle = {
    position: 'absolute',
    bottom: bottomOffset,
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
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
    '--player-cue-active-word-color': activeWordColor,
    '--player-cue-passed-word-opacity': Math.max(0, Math.min(1, passedWordOpacity)),
    '--player-cue-word-transition': wordTransition,
    ...style,
  } as CSSProperties;

  return (
    <section
      className={className}
      data-player-captions=""
      aria-live="off"
      style={captionStyle}
      {...props}
    >
      {words?.length ? wordNodes : activeCue.text}
    </section>
  );
}
