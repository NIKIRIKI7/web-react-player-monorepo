import { type ComponentProps, useState } from 'react';
import { usePlayerContext, usePlayerState } from '../context/PlayerContext';
import { MuteButton } from './MuteButton';

/**
 * Свойства панели управления громкостью.
 *
 * Наследует все нативные атрибуты `<fieldset>`.
 *
 * @public
 * @example
 * ```tsx
 * <VolumeControl className="volume" />
 * ```
 */
export interface VolumeControlProps extends ComponentProps<'fieldset'> {}

/**
 * Панель громкости: кнопка mute плюс раскрывающийся при наведении слайдер.
 *
 * Диапазон слайдера расширен до `3` — так доступно усиление звука (AudioBoost)
 * до 300 %. Ползунок показывает `0`, когда включён mute, а его акцентный цвет
 * меняется на оранжевый при усилении выше 100 %. Ширина и прозрачность
 * анимируются при наведении на группу.
 *
 * @public
 * @example
 * ```tsx
 * import { VolumeControl } from '@web-react-player/ui';
 *
 * <VolumeControl aria-label="Громкость" />
 * ```
 */
export function VolumeControl({ className, style, ...props }: VolumeControlProps) {
  const { actions } = usePlayerContext();
  const gain = usePlayerState((s) => s.context.audioGain);
  const muted = usePlayerState((s) => s.context.muted);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <fieldset
      className={className}
      aria-label="Volume Control"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: 'none',
        margin: 0,
        padding: 0,
        minWidth: 0,
        ...style,
      }}
      {...props}
    >
      <MuteButton style={{ flexShrink: 0 }} />
      <div
        style={{
          width: isHovered ? '70px' : '0px',
          opacity: isHovered ? 1 : 0,
          overflow: 'hidden',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          type="range"
          min={0}
          max={3} // Allow AudioBoost up to 300% (UX Feature)
          step={0.05}
          value={muted ? 0 : gain}
          onChange={(e) => actions.setAudioGain(Number.parseFloat(e.target.value))}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: gain > 1 ? '#ff8c00' : '#ffffff',
          }}
          title={gain > 1 ? `Audio Boost: ${Math.round(gain * 100)}%` : 'Volume'}
          aria-label={`Volume ${Math.round((muted ? 0 : gain) * 100)}%`}
        />
      </div>
    </fieldset>
  );
}
