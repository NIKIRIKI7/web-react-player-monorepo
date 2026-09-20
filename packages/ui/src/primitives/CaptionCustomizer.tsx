// cspell:words Customizer
import { useState } from 'react';
import {
  type CaptionFontFamily,
  type CaptionStylePreferences,
  type CaptionTextShadow,
  DEFAULT_CAPTION_STYLES,
} from '../captions/types';
import { captionStylesToCssVariables } from '../captions/utils';
import { usePlayerContext } from '../context/PlayerContext';

export interface CaptionCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FONT_SIZES = ['75%', '100%', '125%', '150%', '200%'];
const COLOR_PRESETS = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff8080'];
const BG_COLOR_PRESETS = ['#080808', '#202020', '#ffffff', '#000080'];
const OPACITIES = [0, 0.25, 0.5, 0.75, 1];
const SHADOW_OPTIONS: CaptionTextShadow[] = [
  'none',
  'drop-shadow',
  'outline',
  'raised',
  'depressed',
];
const FONT_FAMILIES: CaptionFontFamily[] = [
  'pro-sans',
  'mono-sans',
  'pro-serif',
  'mono-serif',
  'casual',
  'cursive',
];

export function CaptionPreviewBox({ styles }: { styles: CaptionStylePreferences }) {
  const cssVars = captionStylesToCssVariables(styles);

  return (
    <div
      style={{
        position: 'relative',
        height: '52px', // Compact height to save vertical space
        width: '100%',
        borderRadius: '6px',
        background: 'radial-gradient(ellipse at center, #1e293b 0%, #090d16 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '1px solid #334155',
        marginBottom: '10px',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: cssVars['--player-cue-font-size'],
          color: cssVars['--player-cue-color'],
          backgroundColor: cssVars['--player-cue-bg'],
          textShadow: cssVars['--player-cue-shadow'],
          fontFamily: cssVars['--player-cue-font-family'],
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 600,
          textAlign: 'center',
          transition: 'all 0.15s ease-out',
          maxWidth: '90%',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
        }}
      >
        Captions look like this
      </div>
    </div>
  );
}

export function CaptionCustomizer({ isOpen, onClose }: CaptionCustomizerProps) {
  const { captionStyles, setCaptionStyles, isSmall } = usePlayerContext();
  const [localStyles, setLocalStyles] = useState<CaptionStylePreferences>(captionStyles);

  if (!isOpen) return null;

  const updatePreference = <K extends keyof CaptionStylePreferences>(
    key: K,
    value: CaptionStylePreferences[K],
  ) => {
    const next = { ...localStyles, [key]: value };
    setLocalStyles(next);
    setCaptionStyles(next);
  };

  const handleReset = () => {
    setLocalStyles(DEFAULT_CAPTION_STYLES);
    setCaptionStyles(DEFAULT_CAPTION_STYLES);
  };

  return (
    <>
      {/* Backdrop overlay: click outside to close */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close Subtitle Styles"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 80,
          border: 'none',
          padding: 0,
          display: 'block',
          cursor: 'default',
        }}
      />

      {/* Adaptive Modal Window */}
      <div
        role="dialog"
        aria-label="Caption Style Settings"
        aria-modal="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isSmall ? '94%' : '88%',
          maxWidth: '380px',
          maxHeight: 'calc(100% - 20px)',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '10px',
          color: '#f8fafc',
          boxShadow: '0 20px 30px rgba(0, 0, 0, 0.8)',
          zIndex: 90,
          fontFamily: 'sans-serif',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header - now a plain block, not sticky */}
        <div
          style={{
            backgroundColor: '#0f172a',
            padding: '12px 16px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b',
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
            Subtitle Styles
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Subtitle Styles"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '2px 6px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content - only this block scrolls */}
        <div
          style={{
            padding: '12px 16px',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            flex: 1,
          }}
        >
          {/* Live Preview */}
          <CaptionPreviewBox styles={localStyles} />

          {/* Font Size */}
          <div style={{ marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Font Size
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updatePreference('fontSize', size)}
                  style={{
                    flex: 1,
                    padding: '4px 2px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: localStyles.fontSize === size ? '#38bdf8' : '#334155',
                    backgroundColor: localStyles.fontSize === size ? '#0369a1' : '#1e293b',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Text Color */}
          <div style={{ marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Text Color
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updatePreference('textColor', color)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border:
                      localStyles.textColor === color
                        ? '2.5px solid #38bdf8'
                        : '1.5px solid #334155',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Background Color & Opacity */}
          <div style={{ marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Background & Opacity
            </span>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              {BG_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updatePreference('backgroundColor', color)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '4px',
                    backgroundColor: color,
                    border:
                      localStyles.backgroundColor === color
                        ? '2.5px solid #38bdf8'
                        : '1.5px solid #334155',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {OPACITIES.map((opacity) => (
                <button
                  key={opacity}
                  type="button"
                  onClick={() => updatePreference('backgroundOpacity', opacity)}
                  style={{
                    flex: 1,
                    padding: '3px 1px',
                    borderRadius: '3px',
                    border: '1px solid',
                    borderColor: localStyles.backgroundOpacity === opacity ? '#38bdf8' : '#334155',
                    backgroundColor:
                      localStyles.backgroundOpacity === opacity ? '#0369a1' : '#1e293b',
                    color: '#fff',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  {Math.round(opacity * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Text Shadow Options */}
          <div style={{ marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Edge Style
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {SHADOW_OPTIONS.map((shadow) => (
                <button
                  key={shadow}
                  type="button"
                  onClick={() => updatePreference('textShadow', shadow)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: localStyles.textShadow === shadow ? '#38bdf8' : '#334155',
                    backgroundColor: localStyles.textShadow === shadow ? '#0369a1' : '#1e293b',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {shadow.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family Selection */}
          <div style={{ marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Font Family
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {FONT_FAMILIES.map((family) => (
                <button
                  key={family}
                  type="button"
                  onClick={() => updatePreference('fontFamily', family)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: localStyles.fontFamily === family ? '#38bdf8' : '#334155',
                    backgroundColor: localStyles.fontFamily === family ? '#0369a1' : '#1e293b',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {family.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - now a plain block, not sticky */}
        <div
          style={{
            backgroundColor: '#0f172a',
            padding: '10px 16px 12px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '6px 10px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#334155',
              color: '#f8fafc',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
