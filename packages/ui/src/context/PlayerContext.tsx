import {
  type CaptionCue,
  type Chapter,
  createPlayerMachine,
  type PlayerEvent,
  type PlayerSnapshot,
} from '@web-react-player/core';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

export interface PlayerContextValue {
  state: PlayerSnapshot;
  send: (event: PlayerEvent) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  controlsVisible: boolean;
  setControlsVisible: (visible: boolean) => void;
  isScrubbing: boolean;
  setIsScrubbing: (scrubbing: boolean) => void;
  isSmall: boolean;
  setIsSmall: (isSmall: boolean) => void;
  actions: {
    play: () => Promise<void>;
    pause: () => void;
    togglePlay: () => Promise<void>;
    seek: (time: number) => void;
    seekRelative: (seconds: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    setPlaybackRate: (rate: number) => void;
    toggleFullscreen: () => Promise<void>;
    togglePIP: () => Promise<void>;
    toggleTheater: () => void;
    toggleCaptions: () => void;
    triggerAction: (type: string, value?: string | number) => void;
  };
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayerContext(): PlayerContextValue {
  const context = use(PlayerContext);
  if (!context) {
    throw new Error('Player UI components must be used within a <PlayerProvider>');
  }
  return context;
}

export interface PlayerProviderProps {
  children: ReactNode;
  initialChapters?: Chapter[];
  initialCaptions?: CaptionCue[];
}

export function PlayerProvider({
  children,
  initialChapters,
  initialCaptions,
}: PlayerProviderProps) {
  const machine = useMemo(() => {
    const inst = createPlayerMachine();
    if (initialChapters) inst.send({ type: 'SET_CHAPTERS', chapters: initialChapters });
    if (initialCaptions) inst.send({ type: 'SET_CAPTIONS', captions: initialCaptions });
    return inst;
  }, [initialChapters, initialCaptions]);

  const state = useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);

  // Keep ref to avoid recreating actions on state updates
  const stateRef = useRef(state);
  stateRef.current = state;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isSmall, setIsSmall] = useState(false);

  const send = useMemo(() => machine.send, [machine]);

  const triggerAction = useCallback(
    (type: string, value?: string | number) => {
      send({
        type: 'ACTION_TRIGGERED',
        action: { type, value, timestamp: Date.now() },
      });
    },
    [send],
  );

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (video) {
      try {
        await video.play();
        send({ type: 'PLAY' });
        triggerAction('play');
      } catch (err: unknown) {
        console.warn('[web-react-player] play failed:', err);
      }
    } else {
      send({ type: 'PLAY' });
      triggerAction('play');
    }
  }, [send, triggerAction]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    send({ type: 'PAUSE' });
    triggerAction('pause');
  }, [send, triggerAction]);

  const togglePlay = useCallback(async () => {
    if (stateRef.current.status === 'playing') {
      pause();
    } else {
      await play();
    }
  }, [play, pause]);

  const seek = useCallback(
    (time: number) => {
      const maxDuration = stateRef.current.context.duration || time;
      const clamped = Math.max(0, Math.min(time, maxDuration));
      const video = videoRef.current;
      if (video) {
        video.currentTime = clamped;
      }
      send({ type: 'TIME_UPDATE', currentTime: clamped });
    },
    [send],
  );

  const seekRelative = useCallback(
    (seconds: number) => {
      const targetTime = stateRef.current.context.currentTime + seconds;
      seek(targetTime);
      triggerAction(seconds > 0 ? 'seek_forward' : 'seek_backward', Math.abs(seconds));
    },
    [seek, triggerAction],
  );

  const setVolume = useCallback(
    (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume));
      const video = videoRef.current;
      if (video) {
        video.volume = clamped;
        video.muted = clamped === 0;
      }
      send({ type: 'VOLUME_CHANGE', volume: clamped, muted: clamped === 0 });
      triggerAction('volume', Math.round(clamped * 100));
    },
    [send, triggerAction],
  );

  const toggleMute = useCallback(() => {
    const nextMuted = !stateRef.current.context.muted;
    const video = videoRef.current;
    if (video) {
      video.muted = nextMuted;
    }
    send({
      type: 'VOLUME_CHANGE',
      volume: stateRef.current.context.volume,
      muted: nextMuted,
    });
    triggerAction(nextMuted ? 'mute' : 'unmute');
  }, [send, triggerAction]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = rate;
      }
      send({ type: 'RATE_CHANGE', playbackRate: rate });
      triggerAction('speed', `${rate}x`);
    },
    [send, triggerAction],
  );

  const toggleFullscreen = useCallback(async () => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      send({ type: 'FULLSCREEN_CHANGE', fullscreen: false });
    } else {
      if (root.requestFullscreen) {
        await root.requestFullscreen().catch(() => {});
        send({ type: 'FULLSCREEN_CHANGE', fullscreen: true });
        triggerAction('fullscreen');
      } else if (video && 'webkitEnterFullscreen' in video) {
        (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    }
  }, [send, triggerAction]);

  const togglePIP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      send({ type: 'PIP_CHANGE', pip: false });
    } else {
      await video.requestPictureInPicture().catch(() => {});
      send({ type: 'PIP_CHANGE', pip: true });
      triggerAction('pip');
    }
  }, [send, triggerAction]);

  const toggleTheater = useCallback(() => {
    send({ type: 'THEATER_TOGGLE' });
    triggerAction('theater');
  }, [send, triggerAction]);

  const toggleCaptions = useCallback(() => {
    send({ type: 'TOGGLE_CAPTIONS' });
    triggerAction('captions');
  }, [send, triggerAction]);

  // Actions are completely stable and never recreate
  const actions = useMemo(
    () => ({
      play,
      pause,
      togglePlay,
      seek,
      seekRelative,
      setVolume,
      toggleMute,
      setPlaybackRate,
      toggleFullscreen,
      togglePIP,
      toggleTheater,
      toggleCaptions,
      triggerAction,
    }),
    [
      play,
      pause,
      togglePlay,
      seek,
      seekRelative,
      setVolume,
      toggleMute,
      setPlaybackRate,
      toggleFullscreen,
      togglePIP,
      toggleTheater,
      toggleCaptions,
      triggerAction,
    ],
  );

  const contextValue = useMemo<PlayerContextValue>(
    () => ({
      state,
      send,
      rootRef,
      videoRef,
      controlsVisible,
      setControlsVisible,
      isScrubbing,
      setIsScrubbing,
      isSmall,
      setIsSmall,
      actions,
    }),
    [state, send, controlsVisible, isScrubbing, isSmall, actions],
  );

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
}
