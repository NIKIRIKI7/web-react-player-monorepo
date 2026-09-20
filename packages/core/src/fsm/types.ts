export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export interface Chapter {
  title: string;
  startTime: number;
  endTime: number;
}

export interface CaptionCue {
  id?: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface PlayerActionRecord {
  type: string;
  value?: string | number;
  timestamp: number;
}

export interface PlayerContext {
  src: string | null;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  fullscreen: boolean;
  pip: boolean;
  theater: boolean;
  chapters: Chapter[];
  activeChapter: Chapter | null;
  captions: CaptionCue[];
  activeCue: CaptionCue | null;
  captionsEnabled: boolean;
  lastAction: PlayerActionRecord | null;
  fps: number;
  durationInFrames: number;
  currentFrame: number;
  error: Error | null;
}

export type PlayerEvent =
  | { type: 'LOAD'; src: string; chapters?: Chapter[]; captions?: CaptionCue[] }
  | { type: 'METADATA_LOADED'; duration: number }
  | { type: 'PLAY' }
  | { type: 'PLAYING' }
  | { type: 'PAUSE' }
  | { type: 'WAITING' }
  | { type: 'CAN_PLAY' }
  | { type: 'TIME_UPDATE'; currentTime: number; bufferedEnd?: number }
  | { type: 'BUFFER_UPDATE'; bufferedEnd: number }
  | { type: 'VOLUME_CHANGE'; volume: number; muted: boolean }
  | { type: 'RATE_CHANGE'; playbackRate: number }
  | { type: 'FULLSCREEN_CHANGE'; fullscreen: boolean }
  | { type: 'PIP_CHANGE'; pip: boolean }
  | { type: 'THEATER_TOGGLE' }
  | { type: 'TOGGLE_CAPTIONS' }
  | { type: 'SET_CHAPTERS'; chapters: Chapter[] }
  | { type: 'SET_CAPTIONS'; captions: CaptionCue[] }
  | { type: 'ACTION_TRIGGERED'; action: PlayerActionRecord }
  | { type: 'ENDED' }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET' };

export interface PlayerSnapshot {
  status: PlayerStatus;
  context: PlayerContext;
}

export type PlayerListener = (snapshot: PlayerSnapshot) => void;
