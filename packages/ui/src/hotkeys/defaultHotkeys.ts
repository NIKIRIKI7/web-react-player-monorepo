import type { PlayerCommand } from './types';

/**
 * Стандартная раскладка горячих клавиш плеера (в стиле YouTube).
 *
 * У каждой канонической команды есть список альтернативных аккордов.
 * Диспетчер обращается к этим привязкам только тогда, когда пользователь
 * не переопределил соответствующую клавишу.
 *
 * Пустой массив означает, что команда не имеет клавиши по умолчанию
 * (`play`, `pause`), но остаётся доступной через {@link HotkeysMap}.
 *
 * @public
 * @example
 * ```ts
 * import { DEFAULT_HOTKEYS, executeCanonicalCommand, usePlayerContext } from '@web-react-player/ui';
 *
 * DEFAULT_HOTKEYS.togglePlay; // ['k', 'Space']
 *
 * const context = usePlayerContext();
 * document.addEventListener('keydown', (e) => {
 *   if (DEFAULT_HOTKEYS.togglePlay.includes(e.key)) executeCanonicalCommand('togglePlay', context);
 * });
 * ```
 */
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
