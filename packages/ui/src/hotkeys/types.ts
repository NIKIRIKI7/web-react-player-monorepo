import type { PlayerContextValue } from '../context/PlayerContext';

/**
 * Список канонических команд, распознаваемых диспетчером горячих клавиш.
 *
 * Каждая привязка в итоге сводится к одной из этих команд либо к
 * пользовательскому макросу {@link HotkeyHandler}. Команды — единый источник
 * истины: и раскладка по умолчанию, и пользовательские переопределения
 * выполняются одним и тем же кодом.
 *
 * @public
 * @example
 * ```ts
 * import { executeCanonicalCommand, usePlayerContext } from '@web-react-player/ui';
 *
 * function CustomKey() {
 *   const context = usePlayerContext();
 *   return <button type="button" onClick={() => executeCanonicalCommand('togglePlay', context)}>Play</button>;
 * }
 * ```
 */
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

/**
 * Пользовательский макрос для обработки нажатия клавиши.
 *
 * Получает полный контекст плеера и исходное событие, поэтому может
 * вызывать любые действия и самостоятельно вызывать `preventDefault`.
 *
 * @public
 * @example
 * ```ts
 * import { type HotkeyHandler } from '@web-react-player/ui';
 *
 * const restart: HotkeyHandler = (context, event) => {
 *   event.preventDefault();
 *   context.actions.seek(0);
 *   context.actions.play();
 * };
 * ```
 */
export type HotkeyHandler = (context: PlayerContextValue, event: KeyboardEvent) => void;

/**
 * Действие, привязанное к клавише: каноническая команда или функция-макрос.
 *
 * @public
 * @example
 * ```ts
 * import { type HotkeyAction } from '@web-react-player/ui';
 *
 * const byCommand: HotkeyAction = 'seekForward10';
 * const byMacro: HotkeyAction = (ctx) => ctx.actions.seek(0);
 * ```
 */
export type HotkeyAction = PlayerCommand | HotkeyHandler;

/**
 * Дескриптор привязки горячей клавиши.
 *
 * @public
 * @example
 * ```ts
 * import { type HotkeyBindingDescriptor } from '@web-react-player/ui';
 *
 * const binding: HotkeyBindingDescriptor = {
 *   keys: ['Shift+P', 'p'],
 *   handler: 'togglePlay',
 *   description: 'Воспроизведение / пауза',
 * };
 * ```
 */
export interface HotkeyBindingDescriptor {
  /**
   * Клавиша или массив комбинаций, привязываемых к действию.
   *
   * @example
   * ```ts
   * keys: 'Space'
   * keys: ['j', 'ArrowLeft']
   * ```
   */
  keys: string | string[];
  /**
   * Назначаемое действие или каноническая команда.
   *
   * @example
   * ```ts
   * handler: 'toggleMute'
   * handler: (context) => context.actions.seek(0)
   * ```
   */
  handler: HotkeyAction;
  /**
   * Описание назначения горячей клавиши.
   *
   * @example
   * ```ts
   * description: 'Перемотка на 10 секунд вперёд'
   * ```
   */
  description?: string;
}

/**
 * Декларативная карта переопределения горячих клавиш.
 *
 * Поддерживаются пять форм записи:
 *
 * ```text
 * { togglePlay: ['Space', 'k'] }               -> перепривязка клавиш команды
 * { 'Shift+N': (ctx) => {...} }                -> макрос на аккорде
 * { seekForward10: 'l' }                        -> одна клавиша для команды
 * { 'x': togglePlay }                           -> клавиша напрямую на команду
 * { 'y': { keys: 'k', handler: 'toggleMute' } } -> дескриптор
 * ```
 *
 * @public
 * @example
 * ```ts
 * import { PlayerProvider, Root, type HotkeysMap } from '@web-react-player/ui';
 *
 * const hotkeys: HotkeysMap = {
 *   'Shift+P': { handler: 'togglePlay', description: 'Пауза' },
 *   r: ['seekTo10', 'seekTo20'],
 *   togglePlay: 'Space',
 *   toggleMute: (ctx) => ctx.actions.setAudioGain(0),
 * };
 * ```
 */
export type HotkeysMap = Record<string, string | string[] | HotkeyAction | HotkeyBindingDescriptor>;
