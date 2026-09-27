import {
  type CaptionFontFamily,
  type CaptionStylePreferences,
  type CaptionTextShadow,
  DEFAULT_CAPTION_STYLES,
} from './types';

const STORAGE_KEY = 'web-react-player:caption-styles';

const FONT_FAMILY_MAP: Record<CaptionFontFamily, string> = {
  'pro-sans':
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  'mono-sans': '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  'pro-serif': 'Georgia, Cambria, "Times New Roman", Times, serif',
  'mono-serif': '"Courier New", Courier, monospace',
  casual: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive, sans-serif',
  cursive: '"Apple Chancery", "Dancing Script", cursive',
};

const TEXT_SHADOW_MAP: Record<CaptionTextShadow, string> = {
  none: 'none',
  'drop-shadow': '0 0 2px #000, 0 0 4px #000, 0 2px 4px rgba(0,0,0,0.8)',
  raised: '1px 1px 0 #000, 2px 2px 0 #000',
  depressed: '1px 1px 0 #fff, -1px -1px 0 #000',
  outline: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
};

/**
 * Конвертирует HEX-код цвета и коэффициент прозрачности в строку формата `rgba()`.
 *
 * Некорректные символы молча трактуются как нулевые каналы, поэтому функция
 * безопасна для пользовательского ввода из формы настроек.
 *
 * @param hex - Цвет в шестнадцатеричном формате (`#fff` или `#ffffff`).
 * @param alpha - Коэффициент прозрачности от `0` до `1`.
 * @returns Строка CSS формата `rgba(r, g, b, a)`.
 * @public
 * @example
 * ```ts
 * import { hexToRgba } from '@web-react-player/ui';
 *
 * hexToRgba('#ffffff', 0.5); // 'rgba(255, 255, 255, 0.5)'
 * hexToRgba('#000', 1); // 'rgba(0, 0, 0, 1)'
 * ```
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = Number.parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = Number.parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = Number.parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Преобразует параметры оформления субтитров в набор CSS-переменных для корневого узла.
 *
 * Результат применяется к корневому контейнеру плеера, и рендерер
 * `<Captions />` вместе с предпросмотром читают именно эти переменные.
 * Благодаря этому изменение стиля не перестраивает дерево субтитров.
 *
 * Базовый кегль равен 15 px; процент из `fontSize` пересчитывается
 * в абсолютный размер.
 *
 * @param styles - Настройки стилизации субтитров.
 * @returns Объект пар CSS-переменных и их значений.
 * @public
 * @example
 * ```ts
 * import { captionStylesToCssVariables, DEFAULT_CAPTION_STYLES } from '@web-react-player/ui';
 *
 * const vars = captionStylesToCssVariables({ ...DEFAULT_CAPTION_STYLES, fontSize: '150%' });
 * // { '--player-cue-font-size': '23px', '--player-cue-color': '#ffffff', ... }
 * rootElement.style.setProperty('--player-cue-color', vars['--player-cue-color'] ?? '#fff');
 * ```
 */
export function captionStylesToCssVariables(
  styles: CaptionStylePreferences,
): Record<string, string> {
  const sizeMultiplier = Number.parseFloat(styles.fontSize) / 100 || 1;
  const baseFontSizePx = 15;
  const computedSize = `${Math.round(baseFontSizePx * sizeMultiplier)}px`;

  return {
    '--player-cue-font-size': computedSize,
    '--player-cue-color': styles.textColor,
    '--player-cue-bg': hexToRgba(styles.backgroundColor, styles.backgroundOpacity),
    '--player-cue-shadow': TEXT_SHADOW_MAP[styles.textShadow] || 'none',
    '--player-cue-font-family': FONT_FAMILY_MAP[styles.fontFamily] || 'inherit',
  };
}

/**
 * Загружает сохранённые настройки субтитров из `localStorage`.
 *
 * Отсутствующие в хранилище поля заполняются значениями
 * {@link DEFAULT_CAPTION_STYLES}. При недоступном `localStorage`
 * (SSR, приватный режим, переполнение квоты) возвращаются умолчания.
 *
 * @returns Актуальный объект параметров стиля субтитров.
 * @public
 * @example
 * ```ts
 * import { loadCaptionPreferences } from '@web-react-player/ui';
 *
 * const styles = loadCaptionPreferences();
 * console.log(styles.fontFamily);
 * ```
 */
export function loadCaptionPreferences(): CaptionStylePreferences {
  if (typeof window === 'undefined') return DEFAULT_CAPTION_STYLES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CAPTION_STYLES;
    const parsed = JSON.parse(raw) as Partial<CaptionStylePreferences>;
    return { ...DEFAULT_CAPTION_STYLES, ...parsed };
  } catch {
    return DEFAULT_CAPTION_STYLES;
  }
}

/**
 * Сохраняет пользовательские параметры стилизации субтитров в `localStorage`.
 *
 * Ошибки квоты и приватного режима подавляются: сброс сохранения
 * не должен ломать плеер.
 *
 * @param styles - Объект настроек субтитров.
 * @public
 * @example
 * ```ts
 * import { loadCaptionPreferences, saveCaptionPreferences } from '@web-react-player/ui';
 *
 * const next = { ...loadCaptionPreferences(), fontSize: '150%' };
 * saveCaptionPreferences(next);
 * ```
 */
export function saveCaptionPreferences(styles: CaptionStylePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
  } catch {
    // Ignore storage quota errors.
  }
}
