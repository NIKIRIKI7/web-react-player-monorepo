export interface ParsedKeyChord {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
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
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox' ||
    target.getAttribute('role') === 'searchbox' ||
    target.getAttribute('role') === 'combobox'
  );
}
