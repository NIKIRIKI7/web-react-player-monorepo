import type { ReactNode } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export type MatchMedia = 'sm' | 'lg';

export interface MatchProps {
  media: MatchMedia;
  children: ReactNode | ((isMatched: boolean) => ReactNode);
}

// Adaptive container: renders its children only when the root container size
// matches the requested breakpoint. Pass a function to conditionally render.
export function Match({ media, children }: MatchProps) {
  const { isSmall } = usePlayerContext();
  const isMatched = media === 'sm' ? isSmall : !isSmall;

  if (typeof children === 'function') {
    return <>{children(isMatched)}</>;
  }
  if (!isMatched) return null;
  return <>{children}</>;
}
