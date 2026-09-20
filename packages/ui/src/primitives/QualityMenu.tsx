import { type ComponentProps, useEffect, useRef } from 'react';
import { usePlayerContext, usePlayerState } from '../context/PlayerContext';

export interface QualityMenuProps extends ComponentProps<'div'> {}

export function QualityMenu({ className, style, ...props }: QualityMenuProps) {
  const { actions, activeMenu, setActiveMenu } = usePlayerContext();
  const qualities = usePlayerState((s) => s.context.qualities);
  const currentQuality = usePlayerState((s) => s.context.currentQuality);
  const autoQuality = usePlayerState((s) => s.context.autoQuality);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = activeMenu === 'quality';

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

  if (!qualities || qualities.length === 0) return null;

  const currentBadge = autoQuality
    ? currentQuality
      ? `Auto (${currentQuality.height}p)`
      : 'Auto'
    : currentQuality?.label || `${currentQuality?.height}p`;

  return (
    <div
      ref={menuRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
      className={className}
      {...props}
    >
      <button
        type="button"
        aria-label={`Video Quality: ${currentBadge}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setActiveMenu(isOpen ? null : 'quality')}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '4px 6px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '4px',
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
        <span style={{ fontSize: '11px' }}>
          {autoQuality ? 'Auto' : `${currentQuality?.height}p`}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Quality options"
          style={{
            position: 'absolute',
            // Clears the TimeSlider completely (14px slider + 8px margin)
            bottom: 'calc(100% + 22px)',
            right: 0,
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '4px',
            minWidth: '130px',
            maxHeight: '220px',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75)',
            zIndex: 70,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={autoQuality}
            onClick={() => {
              actions.setQuality('auto');
              setActiveMenu(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              backgroundColor: autoQuality ? '#0284c7' : 'transparent',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: autoQuality ? 700 : 500,
              textAlign: 'left',
            }}
          >
            <span>Auto</span>
            {autoQuality && <span aria-hidden="true">✓</span>}
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
                  setActiveMenu(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  backgroundColor: isSelected ? '#0284c7' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  textAlign: 'left',
                }}
              >
                <span>{q.label || `${q.height}p`}</span>
                {isSelected && <span aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
