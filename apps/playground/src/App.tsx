import {
  createDefaultRemotionSuite,
  type RemotionCompositionConfig,
  type RemotionSource,
} from '@web-react-player/remotion';
import {
  FullscreenButton,
  MediaProvider,
  PlayButton,
  PlayerProvider,
  Root,
  TimeDisplay,
  TimeSlider,
  VolumeControl,
} from '@web-react-player/ui';
import { useMemo, useState } from 'react';

const SAMPLE_TSX_ANIMATION = `
import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, AbsoluteFill } from 'remotion';
import { Sparkles, Play, Award } from 'lucide-react';

export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const iconRotation = spring({
    frame: frame - 15,
    fps,
    config: { damping: 10 },
  });

  return (
    <AbsoluteFill className="bg-slate-950 flex flex-col items-center justify-center text-white">
      <div 
        className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 shadow-2xl backdrop-blur-xl"
        style={{ transform: \`scale(\${scale})\` }}
      >
        <Sparkles 
          className="text-amber-400 animate-pulse" 
          size={36} 
          style={{ transform: \`rotate(\${iconRotation * 180}deg)\` }} 
        />
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
          Dynamic TSX Remotion Engine
        </span>
        <Award className="text-indigo-400" size={28} />
      </div>
      <p className="mt-4 text-sm text-slate-400 font-mono">
        Rendered 100% Client-Side with Tailwind & Lucide
      </p>
    </AbsoluteFill>
  );
};
`;

const remotionConfig: RemotionCompositionConfig = {
  durationInFrames: 120,
  fps: 30,
  width: 1280,
  height: 720,
};

export const App = () => {
  const [suite] = useState(() => createDefaultRemotionSuite());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const remotionSource = useMemo<Extract<RemotionSource, { type: 'code' }>>(
    () => ({
      type: 'code',
      code: SAMPLE_TSX_ANIMATION,
      config: remotionConfig,
    }),
    [],
  );

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      const { Component } = await suite.compiler.compile(remotionSource.code);
      const result = await suite.exporter.exportMedia(
        Component,
        remotionConfig,
        {},
        {
          format: 'mp4',
          onProgress: ({ progress }) => {
            setExportProgress(Math.round(progress * 100));
          },
        },
      );
      result.download('remotion-animation.mp4');
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Web React Player with Remotion Engine</h2>
      <PlayerProvider>
        <div
          style={{
            aspectRatio: '16 / 9',
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <Root>
            <MediaProvider
              type="remotion"
              remotionSource={remotionSource}
              remotionConfig={remotionConfig}
              pluginManager={suite.pluginManager}
              compiler={suite.compiler}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <TimeSlider />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <PlayButton />
                  <VolumeControl />
                  <TimeDisplay />
                </div>
                <FullscreenButton />
              </div>
            </div>
          </Root>
        </div>
      </PlayerProvider>

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          style={{
            padding: '8px 18px',
            backgroundColor: isExporting ? '#475569' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: isExporting ? 'not-allowed' : 'pointer',
          }}
        >
          {isExporting ? `Exporting MP4 (${exportProgress}%)...` : 'Download Video (MP4)'}
        </button>
      </div>
    </div>
  );
};
