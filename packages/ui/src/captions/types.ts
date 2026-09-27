/**
 * Допустимые шрифтовые гарнитуры для отображения субтитров.
 *
 * Значение является ключом внутренней карты гарнитур: реальный CSS
 * `font-family` подставляется утилитой {@link captionStylesToCssVariables}.
 *
 * @public
 * @example
 * ```ts
 * import { type CaptionFontFamily, DEFAULT_CAPTION_STYLES } from '@web-react-player/ui';
 *
 * const family: CaptionFontFamily = 'mono-sans';
 * const styles = { ...DEFAULT_CAPTION_STYLES, fontFamily: family };
 * ```
 */
export type CaptionFontFamily =
  | 'pro-sans'
  | 'mono-sans'
  | 'pro-serif'
  | 'mono-serif'
  | 'casual'
  | 'cursive';

/**
 * Допустимые стили тени и контура текста субтитров.
 *
 * @public
 * @example
 * ```ts
 * import { type CaptionTextShadow, DEFAULT_CAPTION_STYLES } from '@web-react-player/ui';
 *
 * const shadow: CaptionTextShadow = 'outline';
 * const styles = { ...DEFAULT_CAPTION_STYLES, textShadow: shadow };
 * ```
 */
export type CaptionTextShadow = 'none' | 'drop-shadow' | 'raised' | 'depressed' | 'outline';

/**
 * Пользовательские предпочтения оформления субтитров.
 *
 * Объект хранится в `localStorage` и применяется через CSS-переменные,
 * поэтому изменение стилей не вызывает перерисовку дерева субтитров.
 *
 * @public
 * @example
 * ```ts
 * import { type CaptionStylePreferences, DEFAULT_CAPTION_STYLES } from '@web-react-player/ui';
 *
 * const custom: CaptionStylePreferences = {
 *   ...DEFAULT_CAPTION_STYLES,
 *   fontSize: '150%',
 *   backgroundOpacity: 0.5,
 * };
 * ```
 */
export interface CaptionStylePreferences {
  /**
   * Процентный размер шрифта относительно базового (`'75%'`, `'100%'`, `'150%'`, `'200%'`).
   *
   * @example
   * ```ts
   * fontSize: '200%'
   * ```
   */
  fontSize: string;
  /**
   * Цвет текста в формате HEX.
   *
   * @example
   * ```ts
   * textColor: '#ffff00'
   * ```
   */
  textColor: string;
  /**
   * Цвет фона подложки в формате HEX.
   *
   * @example
   * ```ts
   * backgroundColor: '#000000'
   * ```
   */
  backgroundColor: string;
  /**
   * Непрозрачность подложки от `0.0` до `1.0`.
   *
   * @example
   * ```ts
   * backgroundOpacity: 0.85
   * ```
   */
  backgroundOpacity: number;
  /**
   * Вариант тени или контура текста.
   *
   * @example
   * ```ts
   * textShadow: 'drop-shadow'
   * ```
   */
  textShadow: CaptionTextShadow;
  /**
   * Гарнитура шрифта.
   *
   * @example
   * ```ts
   * fontFamily: 'pro-sans'
   * ```
   */
  fontFamily: CaptionFontFamily;
}

/**
 * Стандартные стили субтитров по умолчанию.
 *
 * Используются как база при первом рендере и как fallback при любой ошибке
 * чтения из `localStorage`.
 *
 * @public
 * @example
 * ```ts
 * import { DEFAULT_CAPTION_STYLES } from '@web-react-player/ui';
 *
 * const styles = loadCaptionPreferences(); // поля, отсутствующие в хранилище, берутся отсюда
 * console.log(DEFAULT_CAPTION_STYLES.textShadow); // 'drop-shadow'
 * ```
 */
export const DEFAULT_CAPTION_STYLES: CaptionStylePreferences = {
  fontSize: '100%',
  textColor: '#ffffff',
  backgroundColor: '#080808',
  backgroundOpacity: 0.85,
  textShadow: 'drop-shadow',
  fontFamily: 'pro-sans',
};
