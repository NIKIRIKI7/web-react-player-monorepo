import type { PlayerCommand } from './types';

// YouTube Standard Shortcuts. Every canonical command has a list of alternative
// key chords; the Command Dispatcher falls back to these bindings only when the
// user did not override a given key.
export const DEFAULT_HOTKEYS: Record<PlayerCommand, string[]> = {
  togglePlay: ['k', 'Space'],
  play: [],
  pause: [],
  seekBackward10: ['j'],
  seekForward10: ['l'],
  seekBackward5: ['ArrowLeft'],
  seekForward5: ['ArrowRight'],
  volumeUp: ['ArrowUp'],
  volumeDown: ['ArrowDown'],
  toggleMute: ['m'],
  toggleFullscreen: ['f'],
  toggleCaptions: ['c'],
  toggleTheater: ['t'],
  speedUp: ['>'],
  slowDown: ['<'],
  stepFrameForward: ['.'],
  stepFrameBackward: [','],
  skipActiveMarker: ['Shift+S'],
  seekTo0: ['0'],
  seekTo10: ['1'],
  seekTo20: ['2'],
  seekTo30: ['3'],
  seekTo40: ['4'],
  seekTo50: ['5'],
  seekTo60: ['6'],
  seekTo70: ['7'],
  seekTo80: ['8'],
  seekTo90: ['9'],
};
