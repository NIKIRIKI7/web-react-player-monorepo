import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerContext } from '../context/PlayerContext';

/**
 * Свойства отладочного оверлея {@link PlayerDebug}.
 *
 * @public
 * @example
 * ```tsx
 * <PlayerDebug enabled={import.meta.env.DEV} />
 * ```
 */
export interface PlayerDebugProps {
  /**
   * Показывать ли оверлей.
   *
   * Рекомендуется управлять значением через флаг окружения, чтобы панель
   * никогда не попадала в production-сборку.
   *
   * @defaultValue `true`
   * @example
   * ```tsx
   * <PlayerDebug enabled={false} />
   * ```
   */
  enabled?: boolean;
}

const PANEL_STYLE: CSSProperties = {
  position: 'fixed',
  left: 8,
  bottom: 8,
  zIndex: 9999,
  minWidth: 260,
  maxWidth: 380,
  padding: 10,
  borderRadius: 8,
  backgroundColor: 'rgba(15, 23, 42, 0.92)',
  color: '#e5e7eb',
  fontSize: 12,
  lineHeight: 1.5,
  fontFamily: 'monospace',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  whiteSpace: 'pre-wrap',
  pointerEvents: 'none',
};

// Developer overlay with live FSM state. Render it only in development setups —
// pass `enabled` to gate it (e.g. by an env flag) so it never ships to users.
/**
 * Отладочный оверлей с живым состоянием FSM.
 *
 * Рендерится порталом в `document.body` поверх всей страницы и выводит
 * статус, позицию, громкость, скорость, режим фона, причину умной паузы,
 * активный маркер и тип указателя. Компонент ничего не отрисовывает на сервере
 * и при `enabled={false}`, а также прячет вывод при `pointer: coarse`.
 *
 * Рекомендуется использовать только в dev-окружении.
 *
 * @public
 * @example
 * ```tsx
 * import { PlayerDebug, PlayerProvider, Root } from '@web-react-player/ui';
 *
 * export function App() {
 *   return (
 *     <PlayerProvider>
 *       <Root>
 *         <video src="/media/movie.mp4" />
 *       </Root>
 *       <PlayerDebug enabled={import.meta.env.DEV} />
 *     </PlayerProvider>
 *   );
 * }
 * ```
 */
export function PlayerDebug({ enabled = true }: PlayerDebugProps) {
  const { state } = usePlayerContext();
  if (!enabled || typeof window === 'undefined') return null;

  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const { context } = state;

  const report = [
    `status: ${state.status}`,
    `time: ${context.currentTime.toFixed(2)}s / ${context.duration.toFixed(2)}s`,
    `volume: ${(context.volume * 100).toFixed(0)}%  rate: ${context.playbackRate}x`,
    `ambient: ${context.ambientMode ? 'on' : 'off'}  documentPip: ${context.documentPip ? 'on' : 'off'}`,
    `smartPause: ${context.smartPauseReason ?? 'none'}`,
    `activeMarker: ${context.activeMarker?.label ?? context.activeMarker?.type ?? 'none'}`,
    `pointer: ${isCoarse ? 'coarse' : 'fine'}  size: ${context.bufferedEnd > 0 ? 'ready' : 'init'}`,
  ].join('\n');

  return createPortal(<div style={PANEL_STYLE}>{report}</div>, document.body);
}
