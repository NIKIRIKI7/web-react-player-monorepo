// cspell:words Customizer
import {
  ActionBezel,
  AmbientBackground,
  type CaptionCue,
  CaptionCustomizer,
  Captions,
  type Chapter,
  DocumentPipPortal,
  FullscreenButton,
  InteractiveMarkers,
  type Marker,
  MediaProvider,
  PIPButton,
  PlayButton,
  PlayerDebug,
  PlayerProvider,
  Root,
  ScreenGestures,
  SettingsMenu,
  TimeDisplay,
  TimeSlider,
  usePlayerContext,
  type VideoQuality,
  VolumeControl,
} from '@web-react-player/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

const SAMPLE_VIDEO_SRC = 'https://files.vidstack.io/sprite-fight/720p.mp4';
const STORAGE_KEY_TIME = 'web-react-player:time';
const STORAGE_KEY_VOLUME = 'web-react-player:volume';
const STORAGE_KEY_RATE = 'web-react-player:rate';

const SAMPLE_QUALITIES: VideoQuality[] = [
  {
    id: '1080p',
    height: 1080,
    label: '1080p HD',
    src: 'https://files.vidstack.io/sprite-fight/1080p.mp4',
  },
  {
    id: '720p',
    height: 720,
    label: '720p',
    src: 'https://files.vidstack.io/sprite-fight/720p.mp4',
  },
  {
    id: '480p',
    height: 480,
    label: '480p',
    src: 'https://files.vidstack.io/sprite-fight/480p.mp4',
  },
  {
    id: '360p',
    height: 360,
    label: '360p',
    src: 'https://files.vidstack.io/sprite-fight/360p.mp4',
  },
];

const SAMPLE_CHAPTERS: Chapter[] = [
  { title: '1. Introduction', startTime: 0, endTime: 120 },
  { title: '2. The Forest Camp', startTime: 120, endTime: 310 },
  { title: '3. Goblin Encounter', startTime: 310, endTime: 510 },
  { title: '4. The Escape & Ending', startTime: 510, endTime: 620 },
];

// Continuous subtitles covering the entire duration
const SAMPLE_CAPTIONS: CaptionCue[] = [
  { startTime: 0, endTime: 6, text: 'Blender Studio presents: Sprite Fight' },
  { startTime: 6, endTime: 15, text: 'The woods are quiet... a little too quiet.' },
  {
    startTime: 15,
    endTime: 28,
    text: 'Ellie: According to my notes, the camp should be just ahead.',
  },
  {
    startTime: 28,
    endTime: 42,
    text: 'Look at those ancient tree trunks. They have strange markings.',
  },
  { startTime: 42, endTime: 58, text: 'Astrid: Are you sure we are not lost again?' },
  {
    startTime: 58,
    endTime: 72,
    text: 'Ellie: Positive! Follow the glowing mushrooms on the ground.',
  },
  { startTime: 72, endTime: 88, text: 'Wait... did you hear that branch cracking behind us?' },
  { startTime: 88, endTime: 104, text: 'Astrid: Probably just a harmless forest squirrel.' },
  { startTime: 104, endTime: 120, text: 'Ellie: That did not sound like a squirrel at all!' },
  { startTime: 120, endTime: 136, text: 'Look up in the branches! The sprites are watching us!' },
  { startTime: 136, endTime: 154, text: 'Astrid: Stay calm and grab the hairspray!' },
  { startTime: 154, endTime: 175, text: 'Ellie: Don’t provoke them, they look hungry!' },
  { startTime: 175, endTime: 210, text: 'The little creatures are gathering in circles...' },
  { startTime: 210, endTime: 250, text: 'Prepare the defenses, this is going to get messy!' },
  { startTime: 250, endTime: 300, text: 'Watch out on the left flank! They have pointy sticks!' },
];

// Sections that can be skipped / annotated on the timeline (markers demo)
const SAMPLE_MARKERS: Marker[] = [
  { type: 'intro', startTime: 0, endTime: 6 },
  { type: 'highlight', startTime: 200, endTime: 240, label: 'The Gathering Circle' },
  { type: 'sponsor', startTime: 370, endTime: 405, label: 'Raid Shadow Legends' },
  { type: 'outro', startTime: 615, endTime: 620 },
];

interface LogEntry {
  id: number;
  time: string;
  source: 'FSM' | 'MEDIA' | 'SHORTCUT' | 'STORAGE' | 'SESSION';
  message: string;
}

function VideoMedia({ onLog }: { onLog: (source: LogEntry['source'], msg: string) => void }) {
  const { state, send, videoRef, actions } = usePlayerContext();
  const isInitialTimeRestored = useRef(false);

  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    onLogRef.current('MEDIA', 'Loading video source...');
    send({
      type: 'LOAD',
      src: SAMPLE_VIDEO_SRC,
      chapters: SAMPLE_CHAPTERS,
      captions: SAMPLE_CAPTIONS,
      markers: SAMPLE_MARKERS,
    });

    const handleLoadedMetadata = () => {
      onLogRef.current('MEDIA', `Metadata loaded: duration = ${video.duration.toFixed(2)}s`);
      send({ type: 'METADATA_LOADED', duration: video.duration });

      if (!isInitialTimeRestored.current) {
        const savedTime = localStorage.getItem(STORAGE_KEY_TIME);
        if (savedTime) {
          const time = Number.parseFloat(savedTime);
          if (time > 0 && time < video.duration - 2) {
            video.currentTime = time;
            send({ type: 'TIME_UPDATE', currentTime: time });
            onLogRef.current('STORAGE', `Resumed playback at ${time.toFixed(1)}s`);
          }
        }
        isInitialTimeRestored.current = true;
      }
    };

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    // Register a native TextTrack so browser PiP window shows synced subtitles too
    if (video.addTextTrack && typeof VTTCue !== 'undefined') {
      try {
        const nativeTrack = video.addTextTrack('subtitles', 'English', 'en');
        nativeTrack.mode = 'hidden';
        for (const cue of SAMPLE_CAPTIONS) {
          nativeTrack.addCue(new VTTCue(cue.startTime, cue.endTime, cue.text));
        }
      } catch {
        // Native cue registration is optional — headless Captions still work
      }
    }

    const handleTimeUpdate = () => {
      let bufferedEnd = 0;
      if (video.buffered.length > 0) {
        bufferedEnd = video.buffered.end(video.buffered.length - 1);
      }
      send({
        type: 'TIME_UPDATE',
        currentTime: video.currentTime,
        bufferedEnd,
      });
    };

    const handlePlay = () => {
      onLogRef.current('MEDIA', 'Event: play');
      send({ type: 'PLAY' });
    };

    const handlePause = () => {
      onLogRef.current('MEDIA', 'Event: pause');
      send({ type: 'PAUSE' });
    };

    const handleWaiting = () => {
      onLogRef.current('MEDIA', 'Event: waiting (buffering)');
      send({ type: 'WAITING' });
    };

    const handleCanPlay = () => {
      onLogRef.current('MEDIA', 'Event: canplay');
      send({ type: 'CAN_PLAY' });
      handleLoadedMetadata();
    };

    const handleEnded = () => {
      onLogRef.current('MEDIA', 'Event: ended');
      send({ type: 'ENDED' });
      localStorage.removeItem(STORAGE_KEY_TIME);
    };

    const handleEnterPiP = () => {
      onLogRef.current('MEDIA', 'Event: enterpictureinpicture');
      send({ type: 'PIP_CHANGE', pip: true });
    };

    const handleLeavePiP = () => {
      onLogRef.current('MEDIA', 'Event: leavepictureinpicture');
      send({ type: 'PIP_CHANGE', pip: false });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [send, videoRef]);

  useEffect(() => {
    const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (savedVol) {
      actions.setVolume(Number.parseFloat(savedVol));
    }
    const savedRate = localStorage.getItem(STORAGE_KEY_RATE);
    if (savedRate) {
      actions.setPlaybackRate(Number.parseFloat(savedRate));
    }
  }, [actions]);

  useEffect(() => {
    if (state.status !== 'playing') return;
    const timer = setInterval(() => {
      localStorage.setItem(STORAGE_KEY_TIME, state.context.currentTime.toString());
    }, 1500);
    return () => clearInterval(timer);
  }, [state.status, state.context.currentTime]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VOLUME, state.context.volume.toString());
  }, [state.context.volume]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RATE, state.context.playbackRate.toString());
  }, [state.context.playbackRate]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Sprite Fight (Open Movie)',
      artist: 'Blender Animation Studio',
      album: 'Web React Player Demo',
      artwork: [
        {
          // Stable frame from the video itself (Mux) instead of Unsplash
          src: 'https://image.mux.com/VZtzUzGRv02OhRnZCxcNg49OilvolTqdnFLEqBsTwaxU/thumbnail.webp?time=268&width=512',
          sizes: '512x512',
          type: 'image/webp',
        },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => actions.play());
    navigator.mediaSession.setActionHandler('pause', () => actions.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => actions.seekRelative(-10));
    navigator.mediaSession.setActionHandler('seekforward', () => actions.seekRelative(10));
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') actions.seek(details.seekTime);
    });

    onLogRef.current('SESSION', 'MediaSession API configured');

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [actions]);

  return (
    <MediaProvider
      src={SAMPLE_VIDEO_SRC}
      playsInline
      preload="auto"
      crossOrigin="anonymous"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        backgroundColor: '#000000',
        display: 'block',
      }}
    />
  );
}

// Smart Autopause: pauses when the tab is hidden or the player scrolls out of
// view, resumes automatically when it comes back (SMART_PAUSE/SMART_RESUME).
function SmartAutopauseController() {
  const { actions, rootRef, state } = usePlayerContext();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (state.status === 'playing') actions.pause('visibility');
      } else if (state.status === 'paused' && state.context.smartPauseReason === 'visibility') {
        void actions.play(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [actions, state.status, state.context.smartPauseReason]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (!entry.isIntersecting) {
          if (state.status === 'playing') actions.pause('intersection');
        } else if (state.status === 'paused' && state.context.smartPauseReason === 'intersection') {
          void actions.play(true);
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [actions, rootRef, state.status, state.context.smartPauseReason]);

  return null;
}

export const App = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'ALL' | LogEntry['source']>('ALL');
  const [subtitleSettingsOpen, setSubtitleSettingsOpen] = useState(false);

  const addLog = useCallback((source: LogEntry['source'], message: string) => {
    setLogs((prev) => [
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        source,
        message,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const filteredLogs = filter === 'ALL' ? logs : logs.filter((l) => l.source === filter);

  return (
    <main
      style={{ padding: '32px 24px', fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}
    >
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Web React Player</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0' }}>
          YouTube-style headless architecture with Chapters, Preview, Gestures & MediaSession
        </p>
      </header>

      <PlayerProvider
        initialChapters={SAMPLE_CHAPTERS}
        initialCaptions={SAMPLE_CAPTIONS}
        initialMarkers={SAMPLE_MARKERS}
        initialQualities={SAMPLE_QUALITIES}
      >
        {/* Outer relative wrapper; the Ambient glow sits BEHIND the player box */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
          {/* Blurred frame painted behind the player, bleeding around its edges */}
          <AmbientBackground />

          {/* Document PiP moves the WHOLE player (video + overlays) to a pop-out window */}
          <DocumentPipPortal>
            <Root
              hotkeys={{
                // Built-in canonical commands can be rebound or given alternatives
                togglePlay: ['Space', 'k'],
                seekForward10: ['l', 'ArrowRight'],
                seekBackward10: ['j', 'ArrowLeft'],
                seekForward5: [],
                // Custom macro with direct context access: Shift+N = "next lesson"
                'Shift+N': (ctx) => {
                  ctx.actions.triggerAction('next_lesson', 'Navigating...');
                  addLog('SHORTCUT', 'Macro [Shift+N] executed: next lesson');
                },
              }}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                backgroundColor: '#000000',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                zIndex: 1,
              }}
            >
              <VideoMedia onLog={addLog} />
              {/* Screen gestures overlay handles single click play/pause and double-click seek */}
              <ScreenGestures />
              <Captions />
              <ActionBezel />
              <InteractiveMarkers />
              <CenterBigPlayButton />
              <SmartAutopauseController />
              <PlayerOverlayControls
                onLog={addLog}
                subtitleSettingsOpen={subtitleSettingsOpen}
                onToggleSubtitleSettings={() => setSubtitleSettingsOpen((open) => !open)}
              />
              {/* Subtitle styling menu: local CSS-var cascade + Live Preview Box */}
              <CaptionCustomizer
                isOpen={subtitleSettingsOpen}
                onClose={() => setSubtitleSettingsOpen(false)}
              />
              <PlayerDebug />
            </Root>
          </DocumentPipPortal>
        </div>

        <Dashboard
          logs={filteredLogs}
          totalCount={logs.length}
          filter={filter}
          onSetFilter={setFilter}
          onClear={() => setLogs([])}
        />
      </PlayerProvider>
    </main>
  );
};

// YouTube-like Big Center Play Button — only on initial screen or after the video ends
function CenterBigPlayButton() {
  const { state, actions } = usePlayerContext();

  const isInitialScreen = state.status === 'ready' && state.context.currentTime === 0;
  const isEndedScreen = state.status === 'ended';

  if (!isInitialScreen && !isEndedScreen) return null;

  const isReplay = isEndedScreen;

  return (
    <button
      type="button"
      onClick={() => actions.play()}
      aria-label={isReplay ? 'Replay video' : 'Play video'}
      style={{
        position: 'absolute',
        inset: 0,
        margin: 'auto',
        width: 68,
        height: 68,
        borderRadius: '50%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        border: 'none',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 15,
        transition: 'transform 0.15s ease, background-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.backgroundColor = '#ff0000';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      }}
    >
      {isReplay ? (
        // YouTube Replay Icon
        <svg aria-hidden="true" viewBox="0 0 24 24" width="34" height="34" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        </svg>
      ) : (
        // YouTube Play Icon (Triangle)
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="34"
          height="34"
          fill="currentColor"
          style={{ marginLeft: 3 }}
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}

function PlayerOverlayControls({
  onLog,
  subtitleSettingsOpen,
  onToggleSubtitleSettings,
}: {
  onLog: (source: LogEntry['source'], msg: string) => void;
  subtitleSettingsOpen: boolean;
  onToggleSubtitleSettings: () => void;
}) {
  const { state, actions, controlsVisible, isSmall, tier } = usePlayerContext();

  // Compact players (narrow containers) collapse the full top bar and the
  // per-rate speed pills into a single cycling button to stop the bar from
  // overflowing. Wide players (xl/lg) render the complete control set.
  const isCompact = isSmall || tier === 'sm' || tier === 'xs';
  const isWide = tier === 'xl' || tier === 'lg';

  const speedRates = [0.5, 1, 1.25, 1.5, 2];

  const handleCycleSpeed = () => {
    const current = state.context.playbackRate;
    const nextRate = speedRates.find((rate) => rate > current + 0.0001) ?? speedRates[0];
    actions.setPlaybackRate(nextRate);
    onLog('FSM', `Playback rate set to ${nextRate}x`);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: controlsVisible
          ? 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.3) 30%, transparent 60%, rgba(0, 0, 0, 0.5) 100%)'
          : 'transparent',
        opacity: controlsVisible ? 1 : 0,
        // Crucial: 'none' ensures clicks in the middle pass through to ScreenGestures!
        pointerEvents: 'none',
        transition: 'opacity 0.25s ease-in-out',
        zIndex: 10,
      }}
    >
      {/* Top Bar: Interactive — full toolbar only on extra-wide players */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          pointerEvents: controlsVisible ? 'auto' : 'none',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            flex: '1 1 auto',
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Sprite Fight
          </span>
          {state.context.activeChapter && (
            <>
              <span style={{ color: '#9ca3af', flexShrink: 0 }}>•</span>
              <span
                style={{
                  color: '#e5e7eb',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {state.context.activeChapter.title}
              </span>
            </>
          )}
        </div>
        {tier === 'xl' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onToggleSubtitleSettings}
              aria-pressed={subtitleSettingsOpen}
              style={{
                background: subtitleSettingsOpen ? '#2563eb' : 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                padding: '4px 8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Style CC
            </button>
            <button
              type="button"
              onClick={() => {
                actions.toggleAmbient();
                onLog('FSM', `Ambient mode toggled: ${!state.context.ambientMode}`);
              }}
              aria-pressed={state.context.ambientMode}
              style={{
                background: state.context.ambientMode ? '#ff0000' : 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                padding: '4px 8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ambient
            </button>
            <button
              type="button"
              onClick={() => {
                actions.toggleDocumentPip();
                onLog('FSM', `Document PiP toggled: ${!state.context.documentPip}`);
              }}
              aria-pressed={state.context.documentPip}
              style={{
                background: state.context.documentPip ? '#ff0000' : 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                padding: '4px 8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Doc PiP
            </button>
          </div>
        )}
      </div>

      {/* Bottom Bar: Interactive */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}
      >
        <TimeSlider style={{ height: '14px' }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <PlayButton style={{ flexShrink: 0 }} />

            {/* Expandable Volume from YouTube + AudioBoost up to 300% */}
            <VolumeControl />

            <div
              style={{ display: 'flex', gap: 4, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}
            >
              <TimeDisplay type="current" style={{ fontWeight: 600 }} />
              {!isCompact && (
                <>
                  <span style={{ color: '#9ca3af' }}>/</span>
                  <TimeDisplay type="duration" style={{ color: '#9ca3af' }} />
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isWide ? (
              [0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    actions.setPlaybackRate(rate);
                    onLog('FSM', `Playback rate set to ${rate}x`);
                  }}
                  style={{
                    background:
                      state.context.playbackRate === rate ? '#ff0000' : 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 11,
                    padding: '4px 7px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {rate}x
                </button>
              ))
            ) : isCompact ? (
              // Single cycling speed button on narrow players
              <button
                type="button"
                onClick={handleCycleSpeed}
                style={{
                  background:
                    state.context.playbackRate === 1
                      ? 'rgba(255, 255, 255, 0.15)'
                      : state.context.playbackRate >= 2
                        ? '#ff0000'
                        : '#ff8c00',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 11,
                  padding: '4px 7px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {state.context.playbackRate}x
              </button>
            ) : null}

            {/* YouTube CC Button with red active indicator */}
            <button
              type="button"
              onClick={() => {
                actions.toggleCaptions();
                onLog('FSM', `Captions toggled: ${!state.context.captionsEnabled}`);
              }}
              style={{
                background: 'none',
                color: '#ffffff',
                border: 'none',
                borderBottom: state.context.captionsEnabled
                  ? '2px solid #ff0000'
                  : '2px solid transparent',
                fontSize: 12,
                padding: '4px 6px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              CC
            </button>

            {/* Unified gear menu (quality, speed, ambient, doc PiP, captions) */}
            <SettingsMenu
              onOpenSubtitleStyles={onToggleSubtitleSettings}
              style={{ flexShrink: 0 }}
            />

            {!isCompact && <PIPButton style={{ flexShrink: 0 }} />}
            <FullscreenButton style={{ flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({
  logs,
  totalCount,
  filter,
  onSetFilter,
  onClear,
}: {
  logs: LogEntry[];
  totalCount: number;
  filter: 'ALL' | LogEntry['source'];
  onSetFilter: (f: 'ALL' | LogEntry['source']) => void;
  onClear: () => void;
}) {
  const { state } = usePlayerContext();
  const [tab, setTab] = useState<'INSPECTOR' | 'LOGS' | 'CHAPTERS'>('LOGS');

  return (
    <div
      style={{
        marginTop: 24,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
      >
        <button
          type="button"
          onClick={() => setTab('LOGS')}
          style={{
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: 13,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: tab === 'LOGS' ? '2px solid #2563eb' : 'none',
            color: tab === 'LOGS' ? '#2563eb' : '#6b7280',
          }}
        >
          Event Logs ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('INSPECTOR')}
          style={{
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: 13,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: tab === 'INSPECTOR' ? '2px solid #2563eb' : 'none',
            color: tab === 'INSPECTOR' ? '#2563eb' : '#6b7280',
          }}
        >
          FSM Context Inspector
        </button>
        <button
          type="button"
          onClick={() => setTab('CHAPTERS')}
          style={{
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: 13,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: tab === 'CHAPTERS' ? '2px solid #2563eb' : 'none',
            color: tab === 'CHAPTERS' ? '#2563eb' : '#6b7280',
          }}
        >
          Chapters & Captions
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'LOGS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['ALL', 'FSM', 'MEDIA', 'SHORTCUT', 'STORAGE', 'SESSION'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSetFilter(cat)}
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                      background: filter === cat ? '#2563eb' : '#ffffff',
                      color: filter === cat ? '#ffffff' : '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onClear}
                style={{
                  fontSize: 11,
                  color: '#dc2626',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Clear logs
              </button>
            </div>
            <div
              style={{
                height: 200,
                overflowY: 'auto',
                backgroundColor: '#111827',
                color: '#38bdf8',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            >
              {logs.length === 0 ? (
                <div style={{ color: '#6b7280' }}>Waiting for player events...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} style={{ marginBottom: 4, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#9ca3af' }}>[{log.time}]</span>
                    <span
                      style={{
                        color:
                          log.source === 'FSM'
                            ? '#34d399'
                            : log.source === 'MEDIA'
                              ? '#60a5fa'
                              : log.source === 'SESSION'
                                ? '#f472b6'
                                : '#fbbf24',
                        fontWeight: 600,
                      }}
                    >
                      {log.source}:
                    </span>
                    <span style={{ color: '#f3f4f6' }}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'INSPECTOR' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#4b5563' }}>Status:</span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: state.status === 'playing' ? '#dcfce7' : '#f3f4f6',
                  color: state.status === 'playing' ? '#166534' : '#1f2937',
                }}
              >
                {state.status}
              </span>
            </div>
            <pre
              style={{
                backgroundColor: '#111827',
                color: '#a7f3d0',
                padding: 14,
                borderRadius: 6,
                fontSize: 12,
                maxHeight: 220,
                overflowY: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(state.context, null, 2)}
            </pre>
          </div>
        )}

        {tab === 'CHAPTERS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div>
              <strong>Configured Chapters:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {SAMPLE_CHAPTERS.map((c) => (
                  <li key={c.startTime}>
                    {c.title} ({c.startTime}s - {c.endTime}s)
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Configured Subtitles (WebVTT cues):</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {SAMPLE_CAPTIONS.map((cue) => (
                  <li key={cue.startTime}>
                    {cue.startTime}s - {cue.endTime}s: "{cue.text}"
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
