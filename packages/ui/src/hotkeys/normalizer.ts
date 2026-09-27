/**
 * Структурированное представление сочетания клавиш.
 *
 * Результат разбора пользовательской строки вида `Shift+ArrowLeft`, `Ctrl+K`
 * или `space`. Используется для сопоставления с флагами сырого
 * `KeyboardEvent`.
 *
 * @public
 * @example
 * ```ts
 * const chord: ParsedKeyChord = { ctrl: false, alt: false, shift: true, meta: false, key: 'ArrowLeft' };
 * ```
 */
export interface ParsedKeyChord {
  /**
   * Нажат ли `Ctrl`.
   *
   * @example
   * ```ts
   * chord.ctrl; // false
   * ```
   */
  ctrl: boolean;
  /**
   * Нажат ли `Alt`.
   *
   * @example
   * ```ts
   * chord.alt; // false
   * ```
   */
  alt: boolean;
  /**
   * Нажат ли `Shift`.
   *
   * @example
   * ```ts
   * chord.shift; // true
   * ```
   */
  shift: boolean;
  /**
   * Нажата ли клавиша `Meta`.
   *
   * @example
   * ```ts
   * chord.meta; // false
   * ```
   */
  meta: boolean;
  /**
   * Основная клавиша в нижнем регистре.
   *
   * @example
   * ```ts
   * chord.key; // 'arrowleft'
   * ```
   */
  key: string;
}

// Parse a user-readable chord like "Shift+ArrowLeft", "Ctrl+K", "space" into a
// structured form so it can be matched against raw KeyboardEvent flags.
export function parseKeyChord(chord: string): ParsedKeyChord {
  const parts = chord.split('+').map((part) => part.trim());
  let ctrl = false;
  let alt = false;
  let shift = false;
  let meta = false;
  let key = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control') ctrl = true;
    else if (lower === 'alt' || lower === 'option') alt = true;
    else if (lower === 'shift') shift = true;
    else if (lower === 'meta' || lower === 'cmd' || lower === 'command') meta = true;
    else key = part;
  }

  return { ctrl, alt, shift, meta, key };
}

// Characters that on a US keyboard layout are typed with Shift held down
// (e.g. ">" is Shift+"."). For those we skip the shift match check so both the
// literal event.key and the Shift modifier resolve to the same binding.
const NATURALLY_SHIFTED = ['>', '<', '?', ':', '"', '{', '}', '|', '+', '_', '~'];

export function isKeyboardEventMatchingChord(event: KeyboardEvent, chord: ParsedKeyChord): boolean {
  if (chord.ctrl !== event.ctrlKey) return false;
  if (chord.alt !== event.altKey) return false;
  if (chord.meta !== event.metaKey) return false;

  const eventKey = event.key;
  const chordKey = chord.key;

  if (!NATURALLY_SHIFTED.includes(chordKey)) {
    if (chord.shift !== event.shiftKey) return false;
  }

  // Space handling ("Space" chord vs. event.key " ")
  if (chordKey.toLowerCase() === 'space' && eventKey === ' ') return true;

  return eventKey.toLowerCase() === chordKey.toLowerCase();
}

// Context filter: hotkeys are suppressed while the focus is inside input-like
// controls so the user can type without the player hijacking every keystroke.
export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target && target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox' ||
    target.getAttribute('role') === 'searchbox' ||
    target.getAttribute('role') === 'combobox'
  );
}
