import { createPlayerMachine } from '@web-react-player/core';
import { type ReactNode, useMemo, useSyncExternalStore } from 'react';
import { PlayerContext } from './PlayerContext';

export interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  // Initialize FSM only once during the provider's lifetime
  const machine = useMemo(() => createPlayerMachine(), []);

  const state = useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);

  // Send must be stable and never recreate on state changes
  const send = useMemo(() => machine.send, [machine]);

  const contextValue = useMemo(
    () => ({
      state,
      send,
    }),
    [state, send],
  );

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
}
