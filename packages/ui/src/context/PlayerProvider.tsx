import { createPlayerMachine } from '@web-react-player/core';
import { type ReactNode, useMemo, useSyncExternalStore } from 'react';
import { PlayerContext } from './PlayerContext';

export interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  // Initialize FSM only once during the provider's lifetime
  const machine = useMemo(() => createPlayerMachine(), []);

  // useSyncExternalStore is perfectly suited for subscribing to external state managers (our FSM).
  // This prevents unnecessary re-renders and issues with concurrent rendering in React 19.
  const state = useSyncExternalStore(
    machine.subscribe.bind(machine),
    machine.getSnapshot.bind(machine),
    machine.getSnapshot.bind(machine),
  );

  const contextValue = useMemo(
    () => ({
      state,
      send: machine.send.bind(machine),
    }),
    [state, machine],
  );

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
}
