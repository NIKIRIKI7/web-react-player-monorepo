import type { PlayerContextValue } from '../context/PlayerContext';

// Canonical commands understood by the Command Dispatcher. Every hotkey binding
// ultimately resolves to one of these (or to a custom macro handler).
export type PlayerCommand =
  | 'togglePlay'
  | 'play'
  | 'pause'
  | 'seekForward5'
  | 'seekBackward5'
  | 'seekForward10'
  | 'seekBackward10'
  | 'volumeUp'
  | 'volumeDown'
  | 'toggleMute'
  | 'toggleFullscreen'
  | 'toggleCaptions'
  | 'toggleTheater'
  | 'speedUp'
  | 'slowDown'
  | 'stepFrameForward'
  | 'stepFrameBackward'
  | 'skipActiveMarker'
  | 'seekTo0'
  | 'seekTo10'
  | 'seekTo20'
  | 'seekTo30'
  | 'seekTo40'
  | 'seekTo50'
  | 'seekTo60'
  | 'seekTo70'
  | 'seekTo80'
  | 'seekTo90';

// Custom macro: receives the full player context and the raw keyboard event.
export type HotkeyHandler = (context: PlayerContextValue, event: KeyboardEvent) => void;

export type HotkeyAction = PlayerCommand | HotkeyHandler;

export interface HotkeyBindingDescriptor {
  keys: string | string[];
  handler: HotkeyAction;
  description?: string;
}

// Declarative overrides map. Shape:
//   { togglePlay: ['Space', 'k'] }          -> rebind canonical command keys
//   { 'Shift+N': (ctx) => {...} }           -> custom macro on a chord
//   { seekForward10: 'l' }                  -> single key for a command
//   { 'x': togglePlay }                      -> key mapped directly to a command
//   { 'y': { keys: 'k', handler: 'toggleMute' } } -> descriptor form
export type HotkeysMap = Record<string, string | string[] | HotkeyAction | HotkeyBindingDescriptor>;
