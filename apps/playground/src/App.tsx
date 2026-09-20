import {
  MuteButton,
  PlayButton,
  PlayerProvider,
  Root,
  TimeDisplay,
  TimeSlider,
  usePlayerContext,
} from '@web-react-player/ui';
import { useEffect, useRef } from 'react';

// Sample open-source video for testing
const SAMPLE_VIDEO_SRC =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

// Component that connects HTML5 Video events with the core FSM
function VideoMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, send } = usePlayerContext();

  // 1. Synchronize playback status (FSM -> Video DOM element)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.status === 'playing' && video.paused) {
      video.play().catch((err: unknown) => {
        console.warn('[playground] Play request failed or was interrupted:', err);
      });
    } else if (state.status === 'paused' && !video.paused) {
      video.pause();
    }
  }, [state.status]);

  // 2. Synchronize mute & volume (FSM -> Video DOM element)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = state.context.muted;
  }, [state.context.muted]);

  // 3. Synchronize seek position when changed externally
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - state.context.currentTime) > 0.5) {
      video.currentTime = state.context.currentTime;
    }
  }, [state.context.currentTime]);

  // 4. Listen to HTML5 Media Events (Video DOM element -> FSM)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    send({ type: 'LOAD', src: SAMPLE_VIDEO_SRC });

    const handleLoadedMetadata = () => {
      send({ type: 'METADATA_LOADED', duration: video.duration });
    };

    const handleTimeUpdate = () => {
      send({ type: 'TIME_UPDATE', currentTime: video.currentTime });
    };

    const handlePlay = () => {
      send({ type: 'PLAY' });
    };

    const handlePause = () => {
      send({ type: 'PAUSE' });
    };

    const handleWaiting = () => {
      send({ type: 'WAITING' });
    };

    const handleCanPlay = () => {
      send({ type: 'CAN_PLAY' });
    };

    const handleEnded = () => {
      send({ type: 'ENDED' });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
    };
  }, [send]);

  return (
    <video
      ref={videoRef}
      src={SAMPLE_VIDEO_SRC}
      playsInline
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        backgroundColor: '#000000',
        borderRadius: '8px',
        display: 'block',
      }}
    >
      <track kind="captions" />
    </video>
  );
}

// Live state inspector for debugging the FSM
function StateInspector() {
  const { state } = usePlayerContext();

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' }}>
        FSM Inspector
      </h3>
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 14, color: '#374151' }}>Current Status:</span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 13,
            backgroundColor: state.status === 'playing' ? '#dcfce7' : '#f3f4f6',
            color: state.status === 'playing' ? '#15803d' : '#374151',
          }}
        >
          {state.status}
        </span>
      </div>
      <pre
        style={{
          backgroundColor: '#111827',
          color: '#38bdf8',
          padding: 16,
          borderRadius: 8,
          fontSize: 13,
          overflowX: 'auto',
        }}
      >
        {JSON.stringify(state.context, null, 2)}
      </pre>
    </div>
  );
}

export const App = () => {
  return (
    <main style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 840, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Web React Player</h1>
        <p style={{ color: '#6b7280', margin: '6px 0 0' }}>
          Headless architecture demonstration with FSM state management
        </p>
      </header>

      {/* 1. Context Provider with our FSM instance */}
      <PlayerProvider>
        {/* 2. Headless Root container exposing data-attributes and keyboard shortcuts */}
        <Root
          style={{
            backgroundColor: '#ffffff',
            padding: 20,
            borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Video surface */}
          <VideoMedia />

          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 14,
            }}
          >
            {/* Play/Pause Button */}
            <PlayButton
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Play / Pause
            </PlayButton>

            {/* Mute/Unmute Button */}
            <MuteButton
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Mute
            </MuteButton>

            {/* Timeline Slider (Scrubber) */}
            <TimeSlider
              style={{
                flex: 1,
                accentColor: '#2563eb',
                cursor: 'pointer',
              }}
            />

            {/* Time Displays */}
            <div
              style={{ display: 'flex', gap: 4, fontVariantNumeric: 'tabular-nums', fontSize: 14 }}
            >
              <TimeDisplay type="current" style={{ fontWeight: 600 }} />
              <span style={{ color: '#9ca3af' }}>/</span>
              <TimeDisplay type="duration" style={{ color: '#6b7280' }} />
            </div>
          </div>

          {/* Keyboard instructions */}
          <div style={{ marginTop: 16, fontSize: 12, color: '#6b7280' }}>
            Keyboard Shortcuts:{' '}
            <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>Space</kbd>{' '}
            or <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>K</kbd>{' '}
            to toggle playback,{' '}
            <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>M</kbd> to
            mute.
          </div>

          {/* Debugging FSM */}
          <StateInspector />
        </Root>
      </PlayerProvider>
    </main>
  );
};
