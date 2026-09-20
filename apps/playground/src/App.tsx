import {
  MuteButton,
  PlayButton,
  PlayerProvider,
  Root,
  TimeDisplay,
  TimeSlider,
  usePlayerContext,
} from '@web-react-player/ui';
import { type ChangeEvent, useEffect, useRef } from 'react';

// Reliable test video stream with CORS enabled
const SAMPLE_VIDEO_SRC = 'https://files.vidstack.io/sprite-fight/720p.mp4';

function VideoMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, send } = usePlayerContext();

  // 1. Play/Pause synchronization (FSM -> Video)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.status === 'playing' && video.paused) {
      video.play().catch((err: unknown) => {
        console.warn('[playground] Play request prevented:', err);
      });
    } else if (state.status === 'paused' && !video.paused) {
      video.pause();
    }
  }, [state.status]);

  // 2. Mute & Volume synchronization (FSM -> Video)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = state.context.muted;
    video.volume = state.context.volume;
  }, [state.context.muted, state.context.volume]);

  // 3. PlaybackRate synchronization (FSM -> Video)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = state.context.playbackRate;
  }, [state.context.playbackRate]);

  // 4. Seek synchronization (FSM -> Video)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - state.context.currentTime) > 0.5) {
      video.currentTime = state.context.currentTime;
    }
  }, [state.context.currentTime]);

  // 5. Media event listeners (Video -> FSM)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    send({ type: 'LOAD', src: SAMPLE_VIDEO_SRC });

    const syncMetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        send({ type: 'METADATA_LOADED', duration: video.duration });
      }
    };

    // Fix race condition: check if metadata was already loaded before useEffect
    if (video.readyState >= 1) {
      syncMetadata();
    }

    const handleTimeUpdate = () => {
      send({ type: 'TIME_UPDATE', currentTime: video.currentTime });
    };

    const handlePlay = () => {
      send({ type: 'PLAY' });
    };

    const handlePause = () => {
      send({ type: 'PAUSE' });
    };

    const handleVolumeChange = () => {
      send({
        type: 'VOLUME_CHANGE',
        volume: video.volume,
        muted: video.muted,
      });
    };

    const handleRateChange = () => {
      send({
        type: 'RATE_CHANGE',
        playbackRate: video.playbackRate,
      });
    };

    const handleWaiting = () => {
      send({ type: 'WAITING' });
    };

    const handleCanPlay = () => {
      send({ type: 'CAN_PLAY' });
      syncMetadata();
    };

    const handleEnded = () => {
      send({ type: 'ENDED' });
    };

    video.addEventListener('loadedmetadata', syncMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', syncMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
    };
  }, [send]);

  return (
    // biome-ignore lint/a11y/useMediaCaption: demo video without captions track
    <video
      ref={videoRef}
      src={SAMPLE_VIDEO_SRC}
      crossOrigin="anonymous"
      playsInline
      preload="auto"
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        backgroundColor: '#000000',
        borderRadius: '8px',
        display: 'block',
      }}
    />
  );
}

// Volume input range control
function VolumeControl() {
  const { state, send } = usePlayerContext();

  const handleVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const volume = Number.parseFloat(e.target.value);
    send({
      type: 'VOLUME_CHANGE',
      volume,
      muted: volume === 0,
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={state.context.muted ? 0 : state.context.volume}
        onChange={handleVolume}
        style={{ width: 80, cursor: 'pointer' }}
        aria-label="Volume"
      />
    </div>
  );
}

// Speed buttons selector
function PlaybackRateControl() {
  const { state, send } = usePlayerContext();
  const rates = [0.5, 1, 1.5, 2];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>Speed:</span>
      {rates.map((rate) => (
        <button
          key={rate}
          type="button"
          onClick={() => send({ type: 'RATE_CHANGE', playbackRate: rate })}
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
            border: '1px solid #d1d5db',
            backgroundColor: state.context.playbackRate === rate ? '#2563eb' : '#ffffff',
            color: state.context.playbackRate === rate ? '#ffffff' : '#374151',
            fontWeight: 600,
          }}
        >
          {rate}x
        </button>
      ))}
    </div>
  );
}

function StateInspector() {
  const { state } = usePlayerContext();

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' }}>
        FSM Inspector
      </h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
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

      <PlayerProvider>
        <Root
          style={{
            backgroundColor: '#ffffff',
            padding: 20,
            borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            border: '1px solid #e5e7eb',
          }}
        >
          <VideoMedia />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TimeSlider
                style={{
                  flex: 1,
                  accentColor: '#2563eb',
                  cursor: 'pointer',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 14,
                  minWidth: 90,
                  justifyContent: 'flex-end',
                }}
              >
                <TimeDisplay type="current" style={{ fontWeight: 600 }} />
                <span style={{ color: '#9ca3af' }}>/</span>
                <TimeDisplay type="duration" style={{ color: '#6b7280' }} />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                <VolumeControl />
              </div>
              <PlaybackRateControl />
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#6b7280' }}>
            Keyboard Shortcuts:{' '}
            <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>Space</kbd>{' '}
            / <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>K</kbd>{' '}
            (play/pause),{' '}
            <kbd style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>M</kbd>{' '}
            (mute).
          </div>

          <StateInspector />
        </Root>
      </PlayerProvider>
    </main>
  );
};
