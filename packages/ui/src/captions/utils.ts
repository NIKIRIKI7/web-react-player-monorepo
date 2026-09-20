// cspell:words Segoe Menlo Consolas Neue
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

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = Number.parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = Number.parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = Number.parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Transform caption preferences into a fixed set of root CSS variables. The
// <Captions /> renderer and the Live Preview Box both read these variables, so
// changing the style never re-renders the subtitle tree.
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

export function saveCaptionPreferences(styles: CaptionStylePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
  } catch {
    // Ignore storage quota errors.
  }
}
