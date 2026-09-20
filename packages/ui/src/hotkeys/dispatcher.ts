import type { PlayerContextValue } from '../context/PlayerContext';
import { DEFAULT_HOTKEYS } from './defaultHotkeys';
import {
  isEditableElement,
  isKeyboardEventMatchingChord,
  type ParsedKeyChord,
  parseKeyChord,
} from './normalizer';
import type { HotkeyAction, HotkeysMap, PlayerCommand } from './types';

interface ResolvedBinding {
  chord: ParsedKeyChord;
  action: HotkeyAction;
}

// Map a canonical command to the concrete player actions. Commands are the
// single source of truth so custom key maps and the default layout share the
// exact same execution path.
export function executeCanonicalCommand(command: PlayerCommand, context: PlayerContextValue): void {
  const { state, actions } = context;

  switch (command) {
    case 'togglePlay':
      actions.togglePlay();
      break;
    case 'play':
      actions.play();
      break;
    case 'pause':
      actions.pause();
      break;
    case 'seekForward5':
      actions.seekRelative(5);
      break;
    case 'seekBackward5':
      actions.seekRelative(-5);
      break;
    case 'seekForward10':
      actions.seekRelative(10);
      break;
    case 'seekBackward10':
      actions.seekRelative(-10);
      break;
    case 'volumeUp':
      actions.setAudioGain(state.context.audioGain + 0.05);
      break;
    case 'volumeDown':
      actions.setAudioGain(state.context.audioGain - 0.05);
      break;
    case 'toggleMute':
      actions.toggleMute();
      break;
    case 'toggleFullscreen':
      actions.toggleFullscreen();
      break;
    case 'toggleCaptions':
      actions.toggleCaptions();
      break;
    case 'toggleTheater':
      actions.toggleTheater();
      break;
    case 'speedUp':
      actions.setPlaybackRate(Math.min(3, state.context.playbackRate + 0.25));
      break;
    case 'slowDown':
      actions.setPlaybackRate(Math.max(0.25, state.context.playbackRate - 0.25));
      break;
    case 'stepFrameForward':
      actions.seekRelative(1 / Math.max(1, state.context.fps));
      break;
    case 'stepFrameBackward':
      actions.seekRelative(-1 / Math.max(1, state.context.fps));
      break;
    case 'skipActiveMarker':
      if (state.context.activeMarker) {
        actions.seek(state.context.activeMarker.endTime);
      }
      break;
    case 'seekTo0':
    case 'seekTo10':
    case 'seekTo20':
    case 'seekTo30':
    case 'seekTo40':
    case 'seekTo50':
    case 'seekTo60':
    case 'seekTo70':
    case 'seekTo80':
    case 'seekTo90': {
      const digit = Number.parseInt(command.replace('seekTo', ''), 10) / 100;
      actions.seek(state.context.duration * digit);
      break;
    }
  }
}

// Compile custom overrides (highest priority, first) followed by the default
// YouTube layout. The first resolved binding for a matched key wins, so a user
// chord shadows the built-in one for the same physical key.
export function compileHotkeyBindings(userHotkeys?: HotkeysMap): ResolvedBinding[] {
  const bindings: ResolvedBinding[] = [];

  if (userHotkeys) {
    for (const [keyOrCommand, definition] of Object.entries(userHotkeys)) {
      if (typeof definition === 'object' && !Array.isArray(definition) && 'handler' in definition) {
        const keys = Array.isArray(definition.keys) ? definition.keys : [definition.keys];
        for (const key of keys) {
          bindings.push({ chord: parseKeyChord(key), action: definition.handler });
        }
      } else if (Array.isArray(definition)) {
        for (const key of definition) {
          bindings.push({ chord: parseKeyChord(key), action: keyOrCommand as HotkeyAction });
        }
      } else if (typeof definition === 'function') {
        bindings.push({ chord: parseKeyChord(keyOrCommand), action: definition });
      } else if (typeof definition === 'string') {
        bindings.push({
          chord: parseKeyChord(keyOrCommand),
          action: definition as PlayerCommand,
        });
      }
    }
  }

  for (const [command, chords] of Object.entries(DEFAULT_HOTKEYS)) {
    for (const chord of chords) {
      bindings.push({ chord: parseKeyChord(chord), action: command as PlayerCommand });
    }
  }

  return bindings;
}

// Route a keydown event through the pipeline:
//   editable-focus filter -> chord matching -> preventDefault (only on match) -> execute.
// Returns true when a binding claimed the key so the caller can decide on
// further propagation.
export function handleKeyboardShortcut(
  event: KeyboardEvent,
  bindings: ResolvedBinding[],
  context: PlayerContextValue,
): boolean {
  if (isEditableElement(event.target)) {
    return false;
  }

  for (const binding of bindings) {
    if (!isKeyboardEventMatchingChord(event, binding.chord)) continue;

    // Suppress the browser default (e.g. Space/arrow scrolling) only when the
    // key was actually recognized and handled by the player.
    event.preventDefault();

    if (typeof binding.action === 'function') {
      binding.action(context, event);
    } else {
      executeCanonicalCommand(binding.action, context);
    }
    return true;
  }

  return false;
}
