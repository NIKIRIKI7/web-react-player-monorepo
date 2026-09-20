import { type ComponentProps, type PointerEvent, useRef, useState } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import { formatTime } from '../utils/formatTime';

const MARKER_TRACK_COLORS: Record<string, string> = {
  sponsor: '#ffd400',
  intro: '#3b82f6',
  outro: '#a855f7',
  highlight: '#ef4444',
};

export interface TimeSliderProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  thumbClassName?: string;
  trackClassName?: string;
  progressClassName?: string;
  bufferClassName?: string;
  previewClassName?: string;
}

export function TimeSlider({
  ref,
  className,
  thumbClassName,
  trackClassName,
  progressClassName,
  bufferClassName,
  previewClassName,
  style,
  ...props
}: TimeSliderProps) {
  const { state, actions, setIsScrubbing } = usePlayerContext();
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverX, setHoverX] = useState(0);

  const duration = state.context.duration || 1;
  const playedPercent = Math.min(100, Math.max(0, (state.context.currentTime / duration) * 100));
  const bufferedPercent = Math.min(100, Math.max(0, (state.context.bufferedEnd / duration) * 100));

  const calculateTimeFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pos * duration;
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    const targetTime = calculateTimeFromPointer(e);
    actions.seek(targetTime);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const time = (x / rect.width) * duration;
    setHoverX(x);
    setHoverTime(time);

    if (e.buttons === 1) {
      actions.seek(time);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setIsScrubbing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if capture was already released
    }
  };

  // Find hovering chapter title
  const hoveredChapter = state.context.chapters.find(
    (c) => hoverTime >= c.startTime && hoverTime < c.endTime,
  );

  return (
    <div
      ref={ref}
      className={className}
      data-player-time-slider=""
      style={{ position: 'relative', userSelect: 'none', ...style }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      {...props}
    >
      {/* 1. Track container */}
      <div
        ref={trackRef}
        className={trackClassName}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Background full track */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 9999,
          }}
        />

        {/* 2. Buffered progress bar */}
        <div
          className={bufferClassName}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${bufferedPercent}%`,
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 9999,
            pointerEvents: 'none',
          }}
        />

        {/* 3. Played progress bar */}
        <div
          className={progressClassName}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${playedPercent}%`,
            backgroundColor: '#ff0000',
            borderRadius: 9999,
            pointerEvents: 'none',
          }}
        />

        {/* 4. Interactive marker segments (intro/sponsor/outro) on the track */}
        {state.context.markers.map((marker) => {
          const leftPercent = (marker.startTime / duration) * 100;
          const widthPercent = Math.max(0, ((marker.endTime - marker.startTime) / duration) * 100);
          return (
            <div
              key={`${marker.type}-${marker.startTime}-${marker.endTime}`}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                top: 0,
                bottom: 0,
                backgroundColor: marker.color ?? MARKER_TRACK_COLORS[marker.type] ?? '#9ca3af',
                opacity: 0.85,
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {/* 5. Chapter gaps / markers */}
        {state.context.chapters.length > 1 &&
          state.context.chapters.slice(1).map((chapter) => {
            const leftPercent = (chapter.startTime / duration) * 100;
            return (
              <div
                key={chapter.startTime}
                style={{
                  position: 'absolute',
                  left: `calc(${leftPercent}% - 1px)`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: '#000000',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              />
            );
          })}

        {/* 6. Scrubber thumb */}
        <div
          className={thumbClassName}
          style={{
            position: 'absolute',
            left: `${playedPercent}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      </div>

      {/* 7. Floating Hover Preview Tooltip (Clamped inside player boundaries) */}
      {isHovered && trackRef.current && (
        <div
          className={previewClassName}
          style={{
            position: 'absolute',
            left: `${hoverX}px`,
            bottom: '100%',
            transform: 'translateX(-50%)',
            marginBottom: '10px',
            backgroundColor: 'rgba(15, 15, 15, 0.95)',
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            zIndex: 50,
          }}
        >
          {hoveredChapter && (
            <span style={{ fontWeight: 600, color: '#e5e7eb', marginBottom: 2 }}>
              {hoveredChapter.title}
            </span>
          )}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(hoverTime)}</span>
        </div>
      )}
    </div>
  );
}
