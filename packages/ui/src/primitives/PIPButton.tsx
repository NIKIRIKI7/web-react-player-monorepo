import type { ComponentProps } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

/**
 * Свойства кнопки Picture-in-Picture.
 *
 * Наследует все нативные атрибуты `<button>`, включая `ref` и `onClick`.
 *
 * @public
 * @example
 * ```tsx
 * <PIPButton className="pip" />
 * ```
 */
export interface PIPButtonProps extends ComponentProps<'button'> {}

/**
 * Кнопка переключения режима «картинка в картинке».
 *
 * Вызывает `actions.togglePIP()` и отражает текущее состояние
 * `context.pip` в `aria-pressed` и атрибуте `data-pip`. Текст по умолчанию —
 * `PiP`, но его можно заменить через `children`.
 *
 * @public
 * @example
 * ```tsx
 * import { PIPButton } from '@web-react-player/ui';
 *
 * <PIPButton>{'Окно'}</PIPButton>
 * ```
 */
export function PIPButton({ ref, children, onClick, ...props }: PIPButtonProps) {
  const { state, actions } = usePlayerContext();

  return (
    <button
      ref={ref}
      type="button"
      aria-label={state.context.pip ? 'Exit Picture in Picture' : 'Picture in Picture'}
      aria-pressed={state.context.pip}
      onClick={(e) => {
        actions.togglePIP();
        onClick?.(e);
      }}
      data-player-pip-button=""
      data-pip={state.context.pip ? '' : undefined}
      {...props}
    >
      {children ?? 'PiP'}
    </button>
  );
}
