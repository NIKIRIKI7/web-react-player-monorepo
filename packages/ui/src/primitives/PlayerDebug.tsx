import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerContext } from '../context/PlayerContext';

export interface PlayerDebugProps {
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
