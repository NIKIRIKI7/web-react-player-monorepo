import type { ReactNode } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

/**
 * Имена поддерживаемых брейкпоинтов адаптивной раскладки.
 *
 * - `sm` — компактный контейнер;
 * - `lg` — полноразмерный контейнер.
 *
 * @public
 * @example
 * ```tsx
 * <Match media="sm">Компактный плеер</Match>
 * ```
 */
export type MatchMedia = 'sm' | 'lg';

/**
 * Свойства адаптивного контейнера {@link Match}.
 *
 * @public
 * @example
 * ```tsx
 * <Match media="lg">{(isMatched) => (isMatched ? <FullControls /> : null)}</Match>
 * ```
 */
export interface MatchProps {
  /**
   * Брейкпоинт, при котором должно выполняться условие.
   *
   * @example
   * ```tsx
   * <Match media="sm" />
   * ```
   */
  media: MatchMedia;
  /**
   * Содержимое: React-узел либо функция-рендер, получающая результат проверки.
   *
   * Функциональная форма всегда вызывается и может сама решить, что
   * отрисовывать, поэтому удобна для условной вёрстки.
   *
   * @example
   * ```tsx
   * <Match media="sm">Компактная версия</Match>
   * <Match media="sm">{(isMatched) => (isMatched ? <FullControls /> : null)}</Match>
   * ```
   */
  children: ReactNode | ((isMatched: boolean) => ReactNode);
}

/**
 * Адаптивный контейнер: отрисовывает потомков только тогда, когда размер
 * корневого контейнера совпадает с запрошенным брейкпоинтом.
 *
 * Размер определяется полем `isSmall` из контекста плеера, а не шириной
 * окна, поэтому раскладка корректна и в compact-контейнерах.
 *
 * @public
 * @example
 * ```tsx
 * import { Match, PlayerProvider, Root } from '@web-react-player/ui';
 *
 * <PlayerProvider>
 *   <Root>
 *     <video src="/media/movie.mp4" />
 *     <Match media="sm">
 *       <span>Смотрите в полноэкранном режиме для комфортного просмотра</span>
 *     </Match>
 *   </Root>
 * </PlayerProvider>
 * ```
 */
export function Match({ media, children }: MatchProps) {
  const { isSmall } = usePlayerContext();
  const isMatched = media === 'sm' ? isSmall : !isSmall;

  if (typeof children === 'function') {
    return <>{children(isMatched)}</>;
  }
  if (!isMatched) return null;
  return <>{children}</>;
}
