import type { CSSProperties } from 'react';
import { usePlayerContext, usePlayerState } from '../context/PlayerContext';

export interface InteractiveMarkersProps {
  className?: string;
  style?: CSSProperties;
}

// Renders a floating "Skip" pill while the playhead is inside a marker segment
// (intro/sponsor/outro). The pill rides above the timeline when the controls are
// visible and slides down to the corner when they fade out, so it never overlaps
// the TimeSlider. The segment bands themselves are drawn by TimeSlider directly
// on the timeline track.
export function InteractiveMarkers({ className, style }: InteractiveMarkersProps) {
  const { actions, controlsVisible, isSmall } = usePlayerContext();
  const activeMarker = usePlayerState((s) => s.context.activeMarker);

  if (!activeMarker) return null;

  // Dynamic offset: above the timeline (~76–82px tall bar) when controls are
  // visible, tucked into the bottom corner when they are hidden.
  const bottomOffset = controlsVisible ? (isSmall ? '86px' : '98px') : isSmall ? '18px' : '26px';

  const label = activeMarker.label ?? activeMarker.type;
  const accent = activeMarker.color ?? '#3b82f6';

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        right: isSmall ? '12px' : '20px',
        zIndex: 40,
        pointerEvents: 'auto',
        transition: 'bottom 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => {
          actions.seek(activeMarker.endTime);
          actions.triggerAction('skip_marker', label);
        }}
        aria-label={`Skip ${label}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: isSmall ? '6px 12px' : '8px 16px',
          backgroundColor: 'rgba(15, 15, 15, 0.88)',
          color: '#ffffff',
          border: `1.5px solid ${accent}`,
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: isSmall ? '12px' : '13px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          userSelect: 'none',
          transition: 'transform 0.15s ease, background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.04)';
          e.currentTarget.style.backgroundColor = 'rgba(30, 30, 30, 0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = 'rgba(15, 15, 15, 0.88)';
        }}
      >
        {/* Skip-forward indicator icon */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
          style={{ flexShrink: 0 }}
        >
          <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
        </svg>
        <span>Skip {label}</span>
      </button>
    </div>
  );
}
