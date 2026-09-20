import type {
  CaptionCue,
  Chapter,
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
  bufferedEnd: 0,
  volume: 1,
  muted: false,
  playbackRate: 1,
  fullscreen: false,
  pip: false,
  theater: false,
  chapters: [],
  activeChapter: null,
  captions: [],
  activeCue: null,
  captionsEnabled: true, // Enabled by default
  lastAction: null,
  fps: 30,
  durationInFrames: 0,
  currentFrame: 0,
  error: null,
};

function findActiveChapter(chapters: Chapter[], time: number): Chapter | null {
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    if (time >= chapter.startTime && time < chapter.endTime) {
      return chapter;
    }
  }
  return null;
}

function findActiveCue(cues: CaptionCue[], time: number): CaptionCue | null {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (time >= cue.startTime && time <= cue.endTime) {
      return cue;
    }
  }
  return null;
}

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
          if (event.chapters) {
            nextContext.chapters = event.chapters;
            nextContext.activeChapter = findActiveChapter(event.chapters, nextContext.currentTime);
          }
          if (event.captions) {
            nextContext.captions = event.captions;
            nextContext.activeCue = findActiveCue(event.captions, nextContext.currentTime);
          }
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
      nextContext.activeChapter = findActiveChapter(nextContext.chapters, nextContext.currentTime);
    } else if (event.type === 'TIME_UPDATE') {
      nextContext.currentTime = event.currentTime;
      nextContext.currentFrame = Math.round(event.currentTime * nextContext.fps);
      if (typeof event.bufferedEnd === 'number') {
        nextContext.bufferedEnd = event.bufferedEnd;
      }
      nextContext.activeChapter = findActiveChapter(nextContext.chapters, event.currentTime);
      nextContext.activeCue = nextContext.captionsEnabled
        ? findActiveCue(nextContext.captions, event.currentTime)
        : null;
    } else if (event.type === 'BUFFER_UPDATE') {
      nextContext.bufferedEnd = event.bufferedEnd;
    } else if (event.type === 'VOLUME_CHANGE') {
      nextContext.volume = event.volume;
      nextContext.muted = event.muted;
    } else if (event.type === 'RATE_CHANGE') {
      nextContext.playbackRate = event.playbackRate;
    } else if (event.type === 'FULLSCREEN_CHANGE') {
      nextContext.fullscreen = event.fullscreen;
    } else if (event.type === 'PIP_CHANGE') {
      nextContext.pip = event.pip;
    } else if (event.type === 'THEATER_TOGGLE') {
      nextContext.theater = !nextContext.theater;
    } else if (event.type === 'TOGGLE_CAPTIONS') {
      nextContext.captionsEnabled = !nextContext.captionsEnabled;
      nextContext.activeCue = nextContext.captionsEnabled
        ? findActiveCue(nextContext.captions, nextContext.currentTime)
        : null;
    } else if (event.type === 'SET_CHAPTERS') {
      nextContext.chapters = event.chapters;
      nextContext.activeChapter = findActiveChapter(event.chapters, nextContext.currentTime);
    } else if (event.type === 'SET_CAPTIONS') {
      nextContext.captions = event.captions;
      nextContext.activeCue = nextContext.captionsEnabled
        ? findActiveCue(event.captions, nextContext.currentTime)
        : null;
    } else if (event.type === 'ACTION_TRIGGERED') {
      nextContext.lastAction = event.action;
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
      prevContext.bufferedEnd !== nextContext.bufferedEnd ||
      prevContext.volume !== nextContext.volume ||
      prevContext.muted !== nextContext.muted ||
      prevContext.playbackRate !== nextContext.playbackRate ||
      prevContext.fullscreen !== nextContext.fullscreen ||
      prevContext.pip !== nextContext.pip ||
      prevContext.theater !== nextContext.theater ||
      prevContext.captionsEnabled !== nextContext.captionsEnabled ||
      prevContext.activeChapter !== nextContext.activeChapter ||
      prevContext.activeCue !== nextContext.activeCue ||
      prevContext.lastAction !== nextContext.lastAction ||
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
