import {
  type CaptionCue,
  type Chapter,
  createPlayerMachine,
  type Marker,
  type PlayerEvent,
  type PlayerListener,
  type PlayerSnapshot,
} from '@web-react-player/core';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { type CaptionStylePreferences, DEFAULT_CAPTION_STYLES } from '../captions/types';
import { loadCaptionPreferences, saveCaptionPreferences } from '../captions/utils';

export interface PlayerContextValue {
  state: PlayerSnapshot;
  subscribe: (listener: PlayerListener) => () => void;
  send: (event: PlayerEvent) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  controlsVisible: boolean;
  setControlsVisible: (visible: boolean) => void;
  isScrubbing: boolean;
  setIsScrubbing: (scrubbing: boolean) => void;
  isSmall: boolean;
  setIsSmall: (isSmall: boolean) => void;
  captionStyles: CaptionStylePreferences;
  setCaptionStyles: (styles: CaptionStylePreferences) => void;
  actions: {
    play: (smartResume?: boolean) => Promise<void>;
    pause: (reason?: 'visibility' | 'intersection') => void;
    togglePlay: () => Promise<void>;
    seek: (time: number) => void;
    seekRelative: (seconds: number) => void;
    setVolume: (volume: number) => void;
    setAudioGain: (gain: number) => void;
    toggleMute: () => void;
    setPlaybackRate: (rate: number) => void;
    setBrightness: (level: number) => void;
    setLongPressSpeedUp: (active: boolean) => void;
    toggleFullscreen: () => Promise<void>;
    togglePIP: () => Promise<void>;
    toggleTheater: () => void;
    toggleCaptions: () => void;
    toggleAmbient: () => void;
    toggleDocumentPip: () => void;
    triggerAction: (type: string, value?: string | number) => void;
  };
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// Duration (in seconds) of the smart-pause audio fade in/out.
const FADE_DURATION = 0.3;

export function usePlayerContext(): PlayerContextValue {
  const context = use(PlayerContext);
  if (!context) {
    throw new Error('Player UI components must be used within a <PlayerProvider>');
  }
  return context;
}

// DX Improvement: granular state selectors protect components from re-renders
// on every currentTime frame. The hook only subscribes to fields returned by the selector.
export function usePlayerState<T>(selector: (state: PlayerSnapshot) => T): T {
  const ctx = usePlayerContext();
  const [val, setVal] = useState<T>(() => selector(ctx.state));

  useEffect(() => {
    return ctx.subscribe((snapshot) => {
      const newVal = selector(snapshot);
      setVal((prev) => (prev !== newVal ? newVal : prev));
    });
  }, [ctx, selector]);

  return val;
}

export interface PlayerProviderProps {
  children: ReactNode;
  initialChapters?: Chapter[];
  initialCaptions?: CaptionCue[];
  initialMarkers?: Marker[];
}

export function PlayerProvider({
  children,
  initialChapters,
  initialCaptions,
  initialMarkers,
}: PlayerProviderProps) {
  const machine = useMemo(() => {
    const inst = createPlayerMachine();
    if (initialChapters) inst.send({ type: 'SET_CHAPTERS', chapters: initialChapters });
    if (initialCaptions) inst.send({ type: 'SET_CAPTIONS', captions: initialCaptions });
    if (initialMarkers) inst.send({ type: 'SET_MARKERS', markers: initialMarkers });
    // Middleware plugin example: surface engine-level errors in the console.
    inst.use((event, snapshot, next) => {
      if (event.type === 'ERROR') {
        console.error('[web-react-player] media error:', snapshot.context.error);
      }
      next(event);
    });
    return inst;
  }, [initialChapters, initialCaptions, initialMarkers]);

  const state = useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);

  // Keep ref to avoid recreating actions on state updates
  const stateRef = useRef(state);
  stateRef.current = state;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // AudioContext refs for AudioBoost (gain >100% via Web Audio API)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  // A MediaElementAudioSourceNode can only be attached to an element once;
  // remember which element the graph was built for so it is rebuilt on swap.
  const mediaElementRef = useRef<HTMLVideoElement | null>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Autonomous caption style preference (persisted separately from volume so it
  // survives across sessions and videos).
  const [captionStyles, setLocalCaptionStyles] =
    useState<CaptionStylePreferences>(DEFAULT_CAPTION_STYLES);

  useEffect(() => {
    setLocalCaptionStyles(loadCaptionPreferences());
  }, []);

  const setCaptionStyles = useCallback((newStyles: CaptionStylePreferences) => {
    setLocalCaptionStyles(newStyles);
    saveCaptionPreferences(newStyles);
  }, []);

  // Pending smart-pause fade timeout (fade out the gain before calling pause).
  const fadeTimeoutRef = useRef<number | null>(null);

  const send = useMemo(() => machine.send, [machine]);

  // Load previously persisted settings (volume, playback rate, ambient mode)
  // from localStorage to prevent hydration mismatches and restore user prefs.
  useEffect(() => {
    let volume: number | undefined;
    let playbackRate: number | undefined;
    let ambientMode: boolean | undefined;
    try {
      const storedVolume = window.localStorage.getItem('web-react-player:volume');
      const storedRate = window.localStorage.getItem('web-react-player:rate');
      const storedAmbient = window.localStorage.getItem('web-react-player:ambient');
      if (storedVolume !== null) {
        const parsed = Number.parseFloat(storedVolume);
        if (Number.isFinite(parsed)) volume = Math.max(0, Math.min(1, parsed));
      }
      if (storedRate !== null) {
        const parsed = Number.parseFloat(storedRate);
        if (Number.isFinite(parsed)) playbackRate = parsed;
      }
      if (storedAmbient !== null) {
        ambientMode = storedAmbient !== 'false';
      }
    } catch {
      // Storage unavailable (SSR / private mode) — fall back to defaults.
    }
    if (volume !== undefined || playbackRate !== undefined || ambientMode !== undefined) {
      const video = videoRef.current;
      if (video) {
        if (volume !== undefined) video.volume = volume;
        if (playbackRate !== undefined) video.playbackRate = playbackRate;
      }
      send({
        type: 'HYDRATE_SETTINGS',
        volume: volume ?? 1,
        playbackRate: playbackRate ?? 1,
        ambientMode: ambientMode ?? true,
      });
    }
    setHydrated(true);
  }, [send]);

  // Haptic Feedback on chapter change (UX)
  useEffect(() => {
    // Vibrate ONLY when the video is playing or the user is scrubbing.
    // This prevents the browser [Intervention] warning on initial metadata load.
    const isInteracting = stateRef.current.status === 'playing' || isScrubbing;

    if (
      isInteracting &&
      state.context.activeChapter &&
      typeof navigator !== 'undefined' &&
      navigator.vibrate
    ) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore possible API errors
      }
    }
  }, [state.context.activeChapter, isScrubbing]);

  const triggerAction = useCallback(
    (type: string, value?: string | number) => {
      send({
        type: 'ACTION_TRIGGERED',
        action: { type, value, timestamp: Date.now() },
      });
    },
    [send],
  );

  const play = useCallback(
    async (smartResume = false) => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      const video = videoRef.current;
      if (video) {
        try {
          if (audioCtxRef.current?.state === 'suspended') {
            await audioCtxRef.current.resume();
          }
          if (gainNodeRef.current && audioCtxRef.current) {
            const context = audioCtxRef.current;
            const gain = gainNodeRef.current.gain;
            gain.cancelScheduledValues(context.currentTime);
            gain.setValueAtTime(gain.value, context.currentTime);
            gain.linearRampToValueAtTime(
              stateRef.current.context.audioGain,
              context.currentTime + FADE_DURATION,
            );
          }
          await video.play();
          send(smartResume ? { type: 'SMART_RESUME' } : { type: 'PLAY' });
          triggerAction(smartResume ? 'smart_resume' : 'play');
        } catch (err: unknown) {
          console.warn('[web-react-player] play failed:', err);
        }
      } else {
        send(smartResume ? { type: 'SMART_RESUME' } : { type: 'PLAY' });
        triggerAction(smartResume ? 'smart_resume' : 'play');
      }
    },
    [send, triggerAction],
  );

  const pause = useCallback(
    (reason?: 'visibility' | 'intersection') => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      const video = videoRef.current;
      if (!video) {
        send(reason ? { type: 'SMART_PAUSE', reason } : { type: 'PAUSE' });
        triggerAction('pause');
        return;
      }
      // Smart pause fades the audio out before pausing the media element.
      if (reason && gainNodeRef.current && audioCtxRef.current) {
        const context = audioCtxRef.current;
        const gain = gainNodeRef.current.gain;
        gain.cancelScheduledValues(context.currentTime);
        gain.setValueAtTime(gain.value, context.currentTime);
        gain.linearRampToValueAtTime(0.0001, context.currentTime + FADE_DURATION);
        fadeTimeoutRef.current = window.setTimeout(() => {
          fadeTimeoutRef.current = null;
          videoRef.current?.pause();
        }, FADE_DURATION * 1000);
      } else {
        video.pause();
      }
      send(reason ? { type: 'SMART_PAUSE', reason } : { type: 'PAUSE' });
      triggerAction('pause');
    },
    [send, triggerAction],
  );

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

  // AudioBoost: gain up to 300% via AudioContext + GainNode (lazy initialization).
  // The graph is built at most once per <video> element and rebuilt only if the
  // element changes. If Web Audio is unavailable or cross-origin media refuses
  // it, we silently fall back to the native volume (capped at 100%).
  const initAudioGraph = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (audioCtxRef.current && gainNodeRef.current && mediaElementRef.current === video) {
      return;
    }
    try {
      if (audioCtxRef.current && mediaElementRef.current !== video) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
        gainNodeRef.current = null;
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API not available');
      const context = new AudioCtx();
      const source = context.createMediaElementSource(video);
      const gainNode = context.createGain();
      source.connect(gainNode);
      gainNode.connect(context.destination);
      audioCtxRef.current = context;
      gainNodeRef.current = gainNode;
      mediaElementRef.current = video;
      // Keep the native element at 100% so the GainNode owns the whole 0–300%
      // scale; otherwise the element volume would clamp the boosted signal.
      video.volume = 1;
    } catch (err: unknown) {
      console.warn('[web-react-player] Web Audio API initialization skipped:', err);
    }
  }, []);

  const setAudioGain = useCallback(
    (gain: number) => {
      const clamped = Math.max(0, Math.min(3, gain));
      const video = videoRef.current;
      if (video) {
        initAudioGraph();
        const context = audioCtxRef.current;
        const gainNode = gainNodeRef.current;
        if (context && gainNode) {
          if (context.state === 'suspended') {
            void context.resume();
          }
          gainNode.gain.setValueAtTime(clamped, context.currentTime);
          video.muted = clamped === 0;
        } else {
          // Fallback when Web Audio is unavailable (native volume caps at 100%).
          video.volume = clamped;
          video.muted = clamped === 0;
        }
      }
      send({ type: 'AUDIO_GAIN_CHANGE', gain: clamped });
      triggerAction('audio_gain', `${Math.round(clamped * 100)}%`);
    },
    [initAudioGraph, send, triggerAction],
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

  const setBrightness = useCallback(
    (level: number) => {
      const clamped = Math.max(0.1, Math.min(3, level));
      send({ type: 'BRIGHTNESS_CHANGE', brightness: clamped });
      triggerAction('brightness', `${Math.round(clamped * 100)}%`);
    },
    [send, triggerAction],
  );

  const setLongPressSpeedUp = useCallback(
    (active: boolean) => {
      send({ type: 'LONG_PRESS_SPEED_CHANGE', isSpeedUp: active });
      if (active) triggerAction('long_press_speed', '>> 2x');
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

  const toggleAmbient = useCallback(() => {
    const nextAmbient = !stateRef.current.context.ambientMode;
    send({ type: 'TOGGLE_AMBIENT' });
    triggerAction('ambient_mode', nextAmbient ? 'on' : 'off');
    try {
      window.localStorage.setItem('web-react-player:ambient', String(nextAmbient));
    } catch {
      // Storage unavailable — ignore persistence errors.
    }
  }, [send, triggerAction]);

  const toggleDocumentPip = useCallback(() => {
    const next = !stateRef.current.context.documentPip;
    send({ type: 'DOCUMENT_PIP_CHANGE', documentPip: next });
    triggerAction('document_pip', next ? 'on' : 'off');
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
      setAudioGain,
      toggleMute,
      setPlaybackRate,
      setBrightness,
      setLongPressSpeedUp,
      toggleFullscreen,
      togglePIP,
      toggleTheater,
      toggleCaptions,
      toggleAmbient,
      toggleDocumentPip,
      triggerAction,
    }),
    [
      play,
      pause,
      togglePlay,
      seek,
      seekRelative,
      setVolume,
      setAudioGain,
      toggleMute,
      setPlaybackRate,
      setBrightness,
      setLongPressSpeedUp,
      toggleFullscreen,
      togglePIP,
      toggleTheater,
      toggleCaptions,
      toggleAmbient,
      toggleDocumentPip,
      triggerAction,
    ],
  );

  const contextValue = useMemo<PlayerContextValue>(
    () => ({
      state,
      subscribe: machine.subscribe,
      send,
      rootRef,
      videoRef,
      controlsVisible,
      setControlsVisible,
      isScrubbing,
      setIsScrubbing,
      isSmall,
      setIsSmall,
      captionStyles,
      setCaptionStyles,
      actions,
    }),
    [
      state,
      machine.subscribe,
      send,
      controlsVisible,
      isScrubbing,
      isSmall,
      captionStyles,
      setCaptionStyles,
      actions,
    ],
  );

  // Wait until persisted settings are restored before rendering children.
  // This prevents hydration mismatches (values from the server vs. localStorage).
  if (!hydrated) return null;

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
}
