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

  public getSnapshot(): PlayerSnapshot {
    return {
      status: this.status,
      context: { ...this.context },
    };
  }

  public subscribe(listener: PlayerListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  public send(event: PlayerEvent): void {
    // State Transitions
    switch (this.status) {
      case 'idle':
        if (event.type === 'LOAD') {
          this.status = 'loading';
          this.context.src = event.src;
          this.context.error = null;
        }
        break;
      case 'loading':
        if (event.type === 'METADATA_LOADED') {
          this.status = 'ready';
          this.context.duration = event.duration;
        } else if (event.type === 'ERROR') {
          this.status = 'error';
          this.context.error = event.error;
        }
        break;
      case 'ready':
      case 'paused':
      case 'ended':
        if (event.type === 'PLAY') {
          this.status = 'playing';
        }
        break;
      case 'playing':
        if (event.type === 'PAUSE') {
          this.status = 'paused';
        } else if (event.type === 'WAITING') {
          this.status = 'buffering';
        } else if (event.type === 'ENDED') {
          this.status = 'ended';
        }
        break;
      case 'buffering':
        if (event.type === 'CAN_PLAY' || event.type === 'PLAYING') {
          this.status = 'playing';
        } else if (event.type === 'PAUSE') {
          this.status = 'paused';
        }
        break;
    }

    // Global events
    if (event.type === 'TIME_UPDATE') {
      this.context.currentTime = event.currentTime;
      this.context.currentFrame =
        this.context.fps > 0 ? Math.round(event.currentTime * this.context.fps) : 0;
    } else if (event.type === 'SEEK_FRAME') {
      this.context.currentFrame = event.frame;
      this.context.currentTime = this.context.fps > 0 ? event.frame / this.context.fps : 0;
    } else if (event.type === 'VOLUME_CHANGE') {
      this.context.volume = event.volume;
      this.context.muted = event.muted;
    } else if (event.type === 'ERROR') {
      this.status = 'error';
      this.context.error = event.error;
    } else if (event.type === 'RESET') {
      this.status = 'idle';
      this.context = { ...INITIAL_CONTEXT };
    }

    this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export const createPlayerMachine = () => new PlayerMachine();
