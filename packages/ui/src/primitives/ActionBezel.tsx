import { type ComponentProps, useEffect, useState } from 'react';
import { usePlayerContext } from '../context/PlayerContext';

export interface ActionBezelProps extends ComponentProps<'div'> {}

export function ActionBezel({ className, style, ...props }: ActionBezelProps) {
  const { state } = usePlayerContext();
  const [currentAction, setCurrentAction] = useState<{ type: string; label?: string } | null>(null);

  useEffect(() => {
    const action = state.context.lastAction;
    if (!action) return;

    let label = action.type.toUpperCase();
    if (action.type === 'seek_forward') label = `+${action.value}s`;
    if (action.type === 'seek_backward') label = `-${action.value}s`;
    if (action.type === 'volume') label = `${action.value}%`;
    if (action.type === 'speed') label = `${action.value}`;
    if (action.type === 'mute') label = 'MUTED';
    if (action.type === 'unmute') label = 'UNMUTED';

    setCurrentAction({ type: action.type, label });

    const timer = setTimeout(() => {
      setCurrentAction(null);
    }, 550);

    return () => clearTimeout(timer);
  }, [state.context.lastAction]);

  if (!currentAction) return null;

  return (
    <div
      className={className}
      data-player-action-bezel=""
      style={{
        position: 'absolute',
        inset: 0,
        margin: 'auto',
        width: 64,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        color: '#ffffff',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 40,
        animation: 'action-bezel-fade 0.55s ease-out forwards',
        ...style,
      }}
      {...props}
    >
      {currentAction.type === 'play' ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : currentAction.type === 'pause' ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <span style={{ fontSize: 13, fontWeight: 700 }}>{currentAction.label}</span>
      )}
    </div>
  );
}
