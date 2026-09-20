import type { PlayerEvent, PlayerSnapshot } from '@web-react-player/core';
import { createContext, use } from 'react';

export interface PlayerContextValue {
  state: PlayerSnapshot;
  send: (event: PlayerEvent) => void;
}

// Context for internal UI package needs
export const PlayerContext = createContext<PlayerContextValue | null>(null);

// Safe hook for use inside player UI components
export function usePlayerContext(): PlayerContextValue {
  const context = use(PlayerContext);

  if (!context) {
    throw new Error('Player UI components must be used within a <PlayerProvider>');
  }

  return context;
}
