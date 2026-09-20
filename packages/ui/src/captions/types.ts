export type CaptionFontFamily =
  | 'pro-sans'
  | 'mono-sans'
  | 'pro-serif'
  | 'mono-serif'
  | 'casual'
  | 'cursive';

export type CaptionTextShadow = 'none' | 'drop-shadow' | 'raised' | 'depressed' | 'outline';

export interface CaptionStylePreferences {
  fontSize: string; // '75%', '100%', '150%', '200%'
  textColor: string; // '#ffffff', '#ffff00', etc.
  backgroundColor: string; // '#000000', etc.
  backgroundOpacity: number; // 0 to 1
  textShadow: CaptionTextShadow;
  fontFamily: CaptionFontFamily;
}

export const DEFAULT_CAPTION_STYLES: CaptionStylePreferences = {
  fontSize: '100%',
  textColor: '#ffffff',
  backgroundColor: '#080808',
  backgroundOpacity: 0.85,
  textShadow: 'drop-shadow',
  fontFamily: 'pro-sans',
};
