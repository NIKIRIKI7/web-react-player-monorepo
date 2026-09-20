import type {
  CaptionCue,
  Chapter,
  Marker,
  PlayerContext,
  PlayerEvent,
  PlayerListener,
  PlayerMiddleware,
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
  brightness: 1,
  audioGain: 1,
  isLongPressSpeedUp: false,
  documentPip: false,
  markers: [],
  activeMarker: null,
  ambientMode: true,
  smartPauseReason: null,

  // Initial Quality settings
  qualities: [],
  currentQuality: null,
  autoQuality: true,
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

function findActiveMarker(markers: Marker[], time: number): Marker | null {
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    if (time >= marker.startTime && time < marker.endTime) {
      return marker;
    }
  }
  return null;
}

export class PlayerMachine {
  private status: PlayerStatus = 'idle';
  private context: PlayerContext = { ...INITIAL_CONTEXT };
  private listeners = new Set<PlayerListener>();
  private middlewares: PlayerMiddleware[] = [];

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

  // Middleware plugins intercept every event before it reaches the reducer.
  // Calling next(...) forwards it; skipping it swallows the event.
  public use = (middleware: PlayerMiddleware): (() => void) => {
    this.middlewares.push(middleware);
    return () => {
      const index = this.middlewares.lastIndexOf(middleware);
      if (index !== -1) this.middlewares.splice(index, 1);
    };
  };

  public dispatch = (event: PlayerEvent): void => {
    this.send(event);
  };

  public send = (event: PlayerEvent): void => {
    this.runMiddleware(event, 0);
  };

  private runMiddleware = (event: PlayerEvent, index: number): void => {
    if (index < this.middlewares.length) {
      const middleware = this.middlewares[index];
      middleware(event, this.snapshot, (nextEvent) => this.runMiddleware(nextEvent, index + 1));
      return;
    }
    this.processEvent(event);
  };

  private processEvent(event: PlayerEvent): void {
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
          if (event.markers) {
            nextContext.markers = event.markers;
            nextContext.activeMarker = findActiveMarker(event.markers, nextContext.currentTime);
          }
          if (event.qualities) {
            nextContext.qualities = event.qualities;
            nextContext.currentQuality = event.qualities[0] || null;
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
        } else if (event.type === 'SMART_RESUME' && nextContext.smartPauseReason) {
          nextStatus = 'playing';
        }
        break;
      case 'playing':
        if (event.type === 'PAUSE') {
          nextStatus = 'paused';
        } else if (event.type === 'SMART_PAUSE') {
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
      if (event.fps) nextContext.fps = event.fps;
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
      nextContext.activeMarker = findActiveMarker(nextContext.markers, event.currentTime);
    } else if (event.type === 'BUFFER_UPDATE') {
      nextContext.bufferedEnd = event.bufferedEnd;
    } else if (event.type === 'VOLUME_CHANGE') {
      nextContext.volume = event.volume;
      nextContext.muted = event.muted;
      if (event.volume <= 1) nextContext.audioGain = event.volume;
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
    } else if (event.type === 'SET_MARKERS') {
      nextContext.markers = event.markers;
      nextContext.activeMarker = findActiveMarker(event.markers, nextContext.currentTime);
    } else if (event.type === 'SET_QUALITIES') {
      nextContext.qualities = event.qualities;
    } else if (event.type === 'QUALITY_CHANGE') {
      nextContext.currentQuality = event.quality;
      nextContext.autoQuality = event.auto ?? false;
    } else if (event.type === 'DOCUMENT_PIP_CHANGE') {
      nextContext.documentPip = event.documentPip;
    } else if (event.type === 'TOGGLE_AMBIENT') {
      nextContext.ambientMode = !nextContext.ambientMode;
    } else if (event.type === 'HYDRATE_SETTINGS') {
      nextContext.volume = event.volume;
      nextContext.playbackRate = event.playbackRate;
      nextContext.ambientMode = event.ambientMode;
    } else if (event.type === 'PLAY' || event.type === 'SMART_RESUME') {
      nextContext.smartPauseReason = null;
    } else if (event.type === 'SMART_PAUSE') {
      nextContext.smartPauseReason = event.reason;
    } else if (event.type === 'ACTION_TRIGGERED') {
      nextContext.lastAction = event.action;
    } else if (event.type === 'BRIGHTNESS_CHANGE') {
      nextContext.brightness = event.brightness;
    } else if (event.type === 'AUDIO_GAIN_CHANGE') {
      nextContext.audioGain = event.gain;
      nextContext.muted = event.gain === 0;
    } else if (event.type === 'LONG_PRESS_SPEED_CHANGE') {
      nextContext.isLongPressSpeedUp = event.isSpeedUp;
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
      prevContext.brightness !== nextContext.brightness ||
      prevContext.audioGain !== nextContext.audioGain ||
      prevContext.isLongPressSpeedUp !== nextContext.isLongPressSpeedUp ||
      prevContext.error !== nextContext.error ||
      prevContext.documentPip !== nextContext.documentPip ||
      prevContext.markers !== nextContext.markers ||
      prevContext.activeMarker !== nextContext.activeMarker ||
      prevContext.ambientMode !== nextContext.ambientMode ||
      prevContext.smartPauseReason !== nextContext.smartPauseReason ||
      prevContext.qualities !== nextContext.qualities ||
      prevContext.currentQuality !== nextContext.currentQuality ||
      prevContext.autoQuality !== nextContext.autoQuality;

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
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

export const createPlayerMachine = () => new PlayerMachine();
