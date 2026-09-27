import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { usePlayerContext, usePlayerState } from '../context/PlayerContext';
import { Slot } from '../utils/Slot';

/**
 * Свойства кнопки воспроизведения.
 *
 * Наследует все нативные атрибуты `<button>`.
 *
 * @public
 * @example
 * ```tsx
 * <PlayButton asChild aria-label="Играть" />
 * ```
 */
export interface PlayButtonProps extends ComponentProps<'button'> {
  /**
   * Рендерить компонент через слот `Slot`, не создавая собственный `<button>`.
   *
   * Позволяет превратить любой дочерний элемент (ссылку, иконку, `div`)
   * в кнопку воспроизведения, сохранив все обработчики и ARIA-атрибуты.
   *
   * @example
   * ```tsx
   * <PlayButton asChild>
   *   <a href="/watch?v=42">
   *     <PlayIcon />
   *   </a>
   * </PlayButton>
   * ```
   */
  asChild?: boolean;
}

/**
 * Кнопка воспроизведения/паузы.
 *
 * Использует гранулярную подписку на статус (`usePlayerState`), поэтому
 * перерисовывается только при смене `status`. Клик вызывает
 * `actions.togglePlay()`, а пользовательский `onClick` выполняется следом.
 *
 * @public
 * @example
 * ```tsx
 * import { PlayButton, PlayerProvider, Root } from '@web-react-player/ui';
 *
 * <PlayerProvider>
 *   <Root>
 *     <video src="/media/movie.mp4" />
 *     <PlayButton />
 *   </Root>
 * </PlayerProvider>
 * ```
 *
 * @example Рендеринг без собственной кнопки
 * ```tsx
 * <PlayButton asChild>
 *   <MyIconButton aria-label="Play" />
 * </PlayButton>
 * ```
 */
export function PlayButton({ asChild, children, onClick, style, ...props }: PlayButtonProps) {
  const { actions } = usePlayerContext();
  // Granular subscription: the button only re-renders when the status changes.
  const isPlaying = usePlayerState((s) => s.status === 'playing');

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    actions.togglePlay();
    onClick?.(e);
  };

  if (asChild) {
    return (
      <Slot
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        aria-pressed={isPlaying}
        onClick={handleClick}
        data-player-play-button=""
        data-playing={isPlaying ? '' : undefined}
        style={style}
        {...props}
      >
        {children as ReactNode}
      </Slot>
    );
  }

  return (
    <button
      type="button"
      aria-label={isPlaying ? 'Pause' : 'Play'}
      aria-pressed={isPlaying}
      onClick={handleClick}
      data-player-play-button=""
      data-playing={isPlaying ? '' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        color: 'inherit',
        cursor: 'pointer',
        padding: '6px',
        ...style,
      }}
      {...props}
    >
      {renderIcon(children, isPlaying)}
    </button>
  );
}

function renderIcon(children: ReactNode, isPlaying: boolean): ReactNode {
  if (children) return children;
  return isPlaying ? (
    // YouTube Pause Icon
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ) : (
    // YouTube Play Icon (Triangle)
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
