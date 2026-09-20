import {
  type ChangeEvent,
  type ComponentProps,
  type CSSProperties,
  useEffect,
  useState,
} from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface TimeSliderProps
  extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'min' | 'max'> {}

export function TimeSlider({ ref, onChange, ...props }: TimeSliderProps) {
  const { state, send } = usePlayerContext();
  const [isDragging, setIsDragging] = useState(false);
  const [localTime, setLocalTime] = useState(0);

  // Sync with global state if we are not manually dragging the slider
  useEffect(() => {
    if (!isDragging) {
      setLocalTime(state.context.currentTime);
    }
  }, [state.context.currentTime, isDragging]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTime = Number.parseFloat(e.target.value);
    setLocalTime(newTime);
    onChange?.(e);
  };

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    send({ type: 'TIME_UPDATE', currentTime: localTime });
  };

  // Calculate fill percentage (for gradient styling in CSS/Tailwind)
  const progressPercent =
    state.context.duration > 0 ? (localTime / state.context.duration) * 100 : 0;

  return (
    <input
      ref={ref}
      type="range"
      min={0}
      max={state.context.duration || 100}
      step="any"
      value={localTime}
      onChange={handleChange}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp} // Protection in case the mouse leaves the window
      aria-label="Seek time"
      aria-valuemin={0}
      aria-valuemax={state.context.duration}
      aria-valuenow={localTime}
      aria-valuetext={`${Math.round(localTime)} seconds`}
      style={
        {
          '--slider-progress': `${progressPercent}%`,
          ...props.style,
        } as CSSProperties
      }
      data-player-time-slider=""
      data-dragging={isDragging ? '' : undefined}
      {...props}
    />
  );
}
