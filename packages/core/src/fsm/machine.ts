import type {
  PlayerContext,
  PlayerEvent,
  PlayerListener,
  PlayerSnapshot,
  PlayerStatus,
} from './types';

const INITIAL_CONTEXT: PlayerContext = {
  src: null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  playbackRate: 1,
  fps: 30,
  durationInFrames: 0,
  currentFrame: 0,
  error: null,
};

export class PlayerMachine {
  private status: PlayerStatus = 'idle';
  private context: PlayerContext = { ...INITIAL_CONTEXT };
  private listeners = new Set<PlayerListener>();

  private snapshot: PlayerSnapshot = {
    status: this.status,
    context: { ...this.context },
  };

  public getSnapshot = (): PlayerSnapshot => {
    return this.snapshot;
  };

  public subscribe = (listener: PlayerListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public send = (event: PlayerEvent): void => {
    const prevStatus = this.status;
    const prevContext = this.context;
    let nextStatus = this.status;
    const nextContext = { ...this.context };

    switch (this.status) {
      case 'idle':
        if (event.type === 'LOAD') {
          nextStatus = 'loading';
          nextContext.src = event.src;
          nextContext.error = null;
        }
        break;
      case 'loading':
        if (event.type === 'METADATA_LOADED' || event.type === 'CAN_PLAY') {
          nextStatus = 'ready';
          if ('duration' in event && event.duration > 0) {
            nextContext.duration = event.duration;
            nextContext.durationInFrames = Math.round(event.duration * nextContext.fps);
          }
        } else if (event.type === 'PLAY' || event.type === 'PLAYING') {
          nextStatus = 'playing';
        } else if (event.type === 'ERROR') {
          nextStatus = 'error';
          nextContext.error = event.error;
        }
        break;
      case 'ready':
      case 'paused':
      case 'ended':
        if (event.type === 'PLAY') {
          nextStatus = 'playing';
        }
        break;
      case 'playing':
        if (event.type === 'PAUSE') {
          nextStatus = 'paused';
        } else if (event.type === 'WAITING') {
          nextStatus = 'buffering';
        } else if (event.type === 'ENDED') {
          nextStatus = 'ended';
        }
        break;
      case 'buffering':
        if (event.type === 'CAN_PLAY' || event.type === 'PLAYING') {
          nextStatus = 'playing';
        } else if (event.type === 'PAUSE') {
          nextStatus = 'paused';
        }
        break;
    }

    if (event.type === 'METADATA_LOADED') {
      nextContext.duration = event.duration;
      nextContext.durationInFrames = Math.round(event.duration * nextContext.fps);
    } else if (event.type === 'TIME_UPDATE') {
      nextContext.currentTime = event.currentTime;
      nextContext.currentFrame = Math.round(event.currentTime * nextContext.fps);
    } else if (event.type === 'VOLUME_CHANGE') {
      nextContext.volume = event.volume;
      nextContext.muted = event.muted;
    } else if (event.type === 'RATE_CHANGE') {
      nextContext.playbackRate = event.playbackRate;
    } else if (event.type === 'ERROR') {
      nextStatus = 'error';
      nextContext.error = event.error;
    } else if (event.type === 'RESET') {
      nextStatus = 'idle';
      Object.assign(nextContext, INITIAL_CONTEXT);
    }

    const hasStatusChanged = prevStatus !== nextStatus;
    const hasContextChanged =
      prevContext.src !== nextContext.src ||
      prevContext.currentTime !== nextContext.currentTime ||
      prevContext.duration !== nextContext.duration ||
      prevContext.volume !== nextContext.volume ||
      prevContext.muted !== nextContext.muted ||
      prevContext.playbackRate !== nextContext.playbackRate ||
      prevContext.fps !== nextContext.fps ||
      prevContext.durationInFrames !== nextContext.durationInFrames ||
      prevContext.currentFrame !== nextContext.currentFrame ||
      prevContext.error !== nextContext.error;

    if (!hasStatusChanged && !hasContextChanged) {
      return;
    }

    this.status = nextStatus;
    this.context = nextContext;
    this.snapshot = {
      status: this.status,
      context: { ...this.context },
    };

    this.notify();
  };

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

export const createPlayerMachine = () => new PlayerMachine();
