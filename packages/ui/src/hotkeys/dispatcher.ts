import type { PlayerContextValue } from '../context/PlayerContext';
import { DEFAULT_HOTKEYS } from './defaultHotkeys';
import {
  isEditableElement,
  isKeyboardEventMatchingChord,
  type ParsedKeyChord,
  parseKeyChord,
} from './normalizer';
import type { HotkeyAction, HotkeysMap, PlayerCommand } from './types';

/**
 * Скомпилированная привязка клавиатурного аккорда к конкретному действию.
 *
 * Результат работы {@link compileHotkeyBindings}. Используется
 * {@link handleKeyboardShortcut} для сопоставления события с аккордом.
 *
 * @public
 * @example
 * ```ts
 * import { compileHotkeyBindings, handleKeyboardShortcut } from '@web-react-player/ui';
 *
 * const bindings = compileHotkeyBindings({ r: 'seekTo10' });
 * document.addEventListener('keydown', (e) => handleKeyboardShortcut(e, bindings, context));
 * ```
 */
export interface ResolvedBinding {
  /**
   * Распарсенный аккорд с флагами модификаторов.
   *
   * @example
   * ```ts
   * { key: 'k', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false }
   * ```
   */
  chord: ParsedKeyChord;
  /**
   * Выполняемое действие или команда.
   *
   * @example
   * ```ts
   * action: 'togglePlay'
   * ```
   */
  action: HotkeyAction;
}

/**
 * Исполняет каноническую команду плеера через интерфейс `actions` контекста.
 *
 * Команды — единая точка истины для исполнения: и раскладка по умолчанию,
 * и пользовательские перепривязки приводят к одному и тому же коду.
 *
 * @param command - Имя канонической команды.
 * @param context - Контекст плеера.
 * @public
 * @example
 * ```ts
 * import { executeCanonicalCommand, usePlayerContext } from '@web-react-player/ui';
 *
 * const context = usePlayerContext();
 * executeCanonicalCommand('skipActiveMarker', context);
 * ```
 *
 * @example Ручная привязка кнопки к команде
 * ```ts
 * <button type="button" onClick={() => executeCanonicalCommand('seekTo90', context)}>
 *   90%
 * </button>
 * ```
 */
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

/**
 * Компилирует пользовательскую карту клавиш и профиль по умолчанию
 * в плоский массив привязок.
 *
 * Сначала добавляются пользовательские переопределения, затем — раскладка
 * по умолчанию. При совпадении физической клавиши побеждает первая
 * привязка, поэтому пользовательский аккорд перекрывает встроенный.
 *
 * @param userHotkeys - Пользовательская карта горячих клавиш.
 * @returns Список разрешённых привязок {@link ResolvedBinding}.
 * @public
 * @example
 * ```ts
 * import { compileHotkeyBindings } from '@web-react-player/ui';
 *
 * const bindings = compileHotkeyBindings({
 *   'Shift+N': (ctx) => ctx.actions.seek(0),
 *   toggleMute: 'q',
 * });
 * ```
 */
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

/**
 * Обрабатывает событие `keydown`: фильтрует поля ввода, сопоставляет
 * аккорды и запускает действие.
 *
 * Конвейер: фильтр редактируемых элементов → сопоставление аккорда →
 * `preventDefault` (только при совпадении) → выполнение.
 *
 * @param event - Событие клавиатуры.
 * @param bindings - Скомпилированный список привязок.
 * @param context - Контекст плеера.
 * @returns `true`, если комбинация была найдена и обработана.
 * @public
 * @example
 * ```ts
 * import { compileHotkeyBindings, handleKeyboardShortcut, usePlayerContext } from '@web-react-player/ui';
 *
 * function useGlobalHotkeys(): void {
 *   const context = usePlayerContext();
 *   const bindings = useMemo(() => compileHotkeyBindings(), []);
 *
 *   useEffect(() => {
 *     const onKeyDown = (e: KeyboardEvent) => handleKeyboardShortcut(e, bindings, context);
 *     document.addEventListener('keydown', onKeyDown);
 *     return () => document.removeEventListener('keydown', onKeyDown);
 *   }, [bindings, context]);
 * }
 * ```
 */
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
