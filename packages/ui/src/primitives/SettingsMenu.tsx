import { type ComponentProps, type CSSProperties, useEffect, useRef, useState } from 'react';
import { usePlayerContext, usePlayerState } from '../context/PlayerContext';

export interface SettingsMenuProps extends ComponentProps<'div'> {
  onOpenSubtitleStyles?: () => void;
}

// Playback-rate presets offered inside the Speed submenu (YouTube-like ladder).
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type SettingsPanel = 'main' | 'quality' | 'speed';

// Unified gear menu that consolidates quality, playback speed, ambient glow,
// document PiP and subtitle styling under one dropdown. Only one menu can be
// open at a time because it participates in the shared `activeMenu` coordinator.
export function SettingsMenu({
  onOpenSubtitleStyles,
  className,
  style,
  ...props
}: SettingsMenuProps) {
  const { actions, activeMenu, setActiveMenu } = usePlayerContext();
  const playbackRate = usePlayerState((s) => s.context.playbackRate);
  const qualities = usePlayerState((s) => s.context.qualities);
  const currentQuality = usePlayerState((s) => s.context.currentQuality);
  const autoQuality = usePlayerState((s) => s.context.autoQuality);
  const ambientMode = usePlayerState((s) => s.context.ambientMode);
  const documentPip = usePlayerState((s) => s.context.documentPip);

  const [panel, setPanel] = useState<SettingsPanel>('main');
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = activeMenu === 'settings';

  // Reset back to the root panel every time the gear menu is re-opened.
  useEffect(() => {
    if (isOpen) setPanel('main');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setActiveMenu]);

  const qualityBadge = autoQuality
    ? currentQuality
      ? `Auto (${currentQuality.height}p)`
      : 'Auto'
    : currentQuality?.label || `${currentQuality?.height}p`;

  return (
    <div
      ref={menuRef}
      className={className}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
      {...props}
    >
      <button
        type="button"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setActiveMenu(isOpen ? null : 'settings')}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '4px 6px',
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '4px',
          flexShrink: 0,
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Settings"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 20px)',
            right: 0,
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '4px',
            minWidth: '220px',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75)',
            zIndex: 80,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {panel === 'main' && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => setPanel('speed')}
                style={rowStyle()}
              >
                <span>Playback speed</span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                  {playbackRate}x <ChevronLeft />
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => setPanel('quality')}
                style={rowStyle()}
              >
                <span>Video quality</span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                  {qualityBadge} <ChevronLeft />
                </span>
              </button>

              {onOpenSubtitleStyles && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenSubtitleStyles();
                    setActiveMenu(null);
                  }}
                  style={rowStyle()}
                >
                  <span>Caption styles</span>
                  <ChevronLeft />
                </button>
              )}

              <Divider />

              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={documentPip}
                onClick={() => actions.toggleDocumentPip()}
                style={rowStyle()}
              >
                <span>Document PiP</span>
                <Toggle checked={documentPip} />
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={ambientMode}
                onClick={() => actions.toggleAmbient()}
                style={rowStyle()}
              >
                <span>Ambient mode</span>
                <Toggle checked={ambientMode} />
              </button>
            </>
          )}

          {panel === 'quality' && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => setPanel('main')}
                style={rowStyle()}
              >
                <ChevronRight />
                <span>Video quality</span>
              </button>

              <Divider />

              <button
                type="button"
                role="menuitemradio"
                aria-checked={autoQuality}
                onClick={() => {
                  actions.setQuality('auto');
                  setPanel('main');
                }}
                style={rowStyle()}
              >
                <span>Auto</span>
                {autoQuality && <CheckIcon />}
              </button>

              {qualities.map((q) => {
                const isSelected = !autoQuality && currentQuality?.id === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => {
                      actions.setQuality(q.id);
                      setPanel('main');
                    }}
                    style={rowStyle()}
                  >
                    <span>{q.label || `${q.height}p`}</span>
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}
            </>
          )}

          {panel === 'speed' && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => setPanel('main')}
                style={rowStyle()}
              >
                <ChevronRight />
                <span>Playback speed</span>
              </button>

              <Divider />

              {SPEED_OPTIONS.map((rate) => {
                const isSelected = playbackRate === rate;
                return (
                  <button
                    key={rate}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => actions.setPlaybackRate(rate)}
                    style={rowStyle(isSelected)}
                  >
                    <span>
                      {rate}x
                      {rate === 1 && (
                        <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>
                          Normal
                        </span>
                      )}
                    </span>
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function rowStyle(selected?: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    backgroundColor: selected ? 'rgba(2, 132, 199, 0.35)' : 'transparent',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: selected ? 700 : 500,
    textAlign: 'left',
    gap: '8px',
    width: '100%',
  };
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: '#1e293b', margin: '2px 4px' }} />;
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 32,
        height: 16,
        borderRadius: 8,
        position: 'relative',
        backgroundColor: checked ? '#22c55e' : '#334155',
        transition: 'background-color 0.15s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#ffffff',
          transition: 'left 0.15s ease',
        }}
      />
    </span>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}
