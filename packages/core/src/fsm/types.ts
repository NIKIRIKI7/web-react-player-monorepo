export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export interface PlayerContext {
  src: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  fps: number;
  durationInFrames: number;
  currentFrame: number;
  error: Error | null;
}

export type PlayerEvent =
  | { type: 'LOAD'; src: string }
  | { type: 'METADATA_LOADED'; duration: number }
  | { type: 'PLAY' }
  | { type: 'PLAYING' }
  | { type: 'PAUSE' }
  | { type: 'WAITING' }
  | { type: 'CAN_PLAY' }
  | { type: 'TIME_UPDATE'; currentTime: number }
  | { type: 'VOLUME_CHANGE'; volume: number; muted: boolean }
  | { type: 'RATE_CHANGE'; playbackRate: number }
  | { type: 'ENDED' }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET' };

export interface PlayerSnapshot {
  status: PlayerStatus;
  context: PlayerContext;
}

export type PlayerListener = (snapshot: PlayerSnapshot) => void;
