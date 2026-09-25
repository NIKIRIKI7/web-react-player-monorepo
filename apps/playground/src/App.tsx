import {
  createDefaultRemotionSuite,
  type ExportOptions,
  type RemotionCompositionConfig,
  RemotionProvider,
  type RemotionSource,
} from '@web-react-player/remotion';
import {
  type CaptionCue,
  type Chapter,
  DefaultStandardLayout,
  Html5VideoProvider,
  type Marker,
  PlayerProvider,
  Root,
} from '@web-react-player/ui';
import { useMemo, useState } from 'react';

const SAMPLE_TSX_ANIMATION = `
import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, AbsoluteFill, staticFile, Img } from 'remotion';
import { Audio } from '@remotion/media'; // ИМПОРТ ИЗ @remotion/media ДЛЯ ЭКСПОРТА АУДИО
import { Sparkles, Music, HardDriveDownload } from 'lucide-react';

export const config = {
  durationInFrames: 240,
  fps: 30,
  width: 1280,
  height: 720,
};

export const DynamicScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill className="bg-slate-950 flex flex-col items-center justify-center text-white">
      {/*
        ТЕПЕРЬ ИСПОЛЬЗУЕМ <Audio /> ОТ REMOTION.
        Он сам синхронизируется с таймлайном (frame) и оффлайн-экспортом в MP4.
        Ему не нужны crossOrigin, autoPlay или loop — он всё делает под капотом сам.
      */}
      <Audio src={staticFile('bg-music.mp3')} />

      <div 
        className="flex flex-col items-center gap-6 px-10 py-8 rounded-[2rem] bg-indigo-900/20 border border-indigo-500/30 shadow-2xl backdrop-blur-xl"
        style={{ transform: \`scale(\${scale})\` }}
      >
        {/* Используем <Img> из remotion, чтобы избежать Tainted Canvas (CORS) ошибки при экспорте */}
        <Img
          src={staticFile('remotion-logo.png')}
          alt="Logo"
          className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]"
        />

        <div className="flex items-center gap-3">
          <Sparkles className="text-amber-400 animate-pulse" size={32} />
          <span className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
            VFS & Audio Export
          </span>
        </div>

        <div className="flex gap-4 mt-2">
          <span className="px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-sm font-mono flex items-center gap-2 text-indigo-300">
            <Music size={16} /> audio.mp3
          </span>
          <span className="px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-sm font-mono flex items-center gap-2 text-indigo-300">
            <HardDriveDownload size={16} /> Virtual Assets
          </span>
        </div>
      </div>

      <p className="absolute bottom-8 text-sm text-slate-500 font-mono">
        Конфиг и ассеты подхватываются автоматически. Аудио попадёт в MP4!
      </p>
    </AbsoluteFill>
  );
};
`;

const RemotionDemo = () => {
  const [suite] = useState(() => createDefaultRemotionSuite());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportQuality, setExportQuality] = useState<ExportOptions['quality']>('standard');

  const remotionSource = useMemo<Extract<RemotionSource, { type: 'code' }>>(
    () => ({
      type: 'code',
      code: SAMPLE_TSX_ANIMATION,
      assets: {
        // CORS-safe источники: и <Audio />, и <Img /> требуют access-control-allow-origin.
        // SoundHelix и svgrepo.com такие заголовки не отдают — это ломало экспорт.
        'bg-music.mp3':
          'https://cdn.jsdelivr.net/gh/mdn/webaudio-examples@main/audio-basics/outfoxing.mp3',
        'remotion-logo.png':
          'https://res.cloudinary.com/demo/image/upload/c_fill,w_256,h_256/coffee_cup.png',
      },
    }),
    [],
  );

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    try {
      const { Component, detectedConfig } = await suite.compiler.compile(
        remotionSource.code,
        remotionSource.assets,
      );

      const finalConfig: RemotionCompositionConfig = {
        durationInFrames: 150,
        fps: 30,
        width: 1280,
        height: 720,
        ...detectedConfig,
      };

      const result = await suite.exporter.exportMedia(
        Component,
        finalConfig,
        {},
        {
          format: 'mp4',
          quality: exportQuality,
          onProgress: ({ progress }) => {
            setExportProgress(Math.round(progress * 100));
          },
        },
      );

      result.download(`remotion-video-${exportQuality}.mp4`);
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Web React Player + Audio Export</h2>
        <p style={{ margin: 0, color: '#64748b' }}>
          Теперь используется &lt;Audio /&gt; из @remotion/media. При рендере звук корректно попадет
          в MP4!
        </p>
      </div>

      <PlayerProvider>
        <div
          style={{
            aspectRatio: '16 / 9',
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            border: '1px solid #1e293b',
          }}
        >
          <Root>
            <RemotionProvider
              source={remotionSource}
              pluginManager={suite.pluginManager}
              compiler={suite.compiler}
            />
            <DefaultStandardLayout debug={false} />
          </Root>
        </div>
      </PlayerProvider>

      <div
        style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="export-quality"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            Качество рендера
          </label>
          <select
            id="export-quality"
            value={exportQuality}
            onChange={(e) => setExportQuality(e.target.value as ExportOptions['quality'])}
            disabled={isExporting}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="draft">Черновик (Draft) — Малый размер, 1 Mbps</option>
            <option value="standard">Стандарт (Standard) — Для веба</option>
            <option value="high">Высокое (High) — Макс. качество, 15 Mbps</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          style={{
            padding: '10px 24px',
            backgroundColor: isExporting ? '#94a3b8' : '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: isExporting ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            marginLeft: 'auto',
          }}
        >
          {isExporting ? `Экспорт... ${exportProgress}%` : 'Скачать MP4'}
        </button>
      </div>
    </div>
  );
};

const HTML5_VIDEO_SRC =
  'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4';

const CHAPTERS: Chapter[] = [
  { title: 'Intro', startTime: 0, endTime: 33 },
  { title: 'Bunny Wakes Up', startTime: 33, endTime: 156 },
  { title: 'The Butterfly', startTime: 156, endTime: 200 },
  { title: 'Evil Squirrels', startTime: 200, endTime: 330 },
  { title: 'Revenge', startTime: 330, endTime: 596 },
];

const MARKERS: Marker[] = [
  { type: 'intro', startTime: 0, endTime: 33, label: 'Intro' },
  { type: 'highlight', startTime: 156, endTime: 170, label: 'Butterfly' },
];

const CAPTIONS: CaptionCue[] = [
  { startTime: 2, endTime: 6, text: 'The Blender Foundation presents...' },
  { startTime: 7, endTime: 11, text: 'Big Buck Bunny' },
  { startTime: 156, endTime: 160, text: '(Happy nature sounds)' },
  { startTime: 200, endTime: 205, text: '(Ominous music plays)' },
];

const Html5Demo = () => {
  return (
    <div style={{ maxWidth: 840, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>HTML5 Native Video</h2>
        <p style={{ margin: 0, color: '#64748b' }}>
          Стандартное воспроизведение MP4 (10 минут, мультфильм Big Buck Bunny) с помощью{' '}
          <code>&lt;Html5VideoProvider /&gt;</code>. Наши UI-компоненты (таймлайн, жесты, маркеры,
          субтитры) идеально работают поверх нативного видео без изменений кода интерфейса!
        </p>
      </div>
      <PlayerProvider
        initialChapters={CHAPTERS}
        initialMarkers={MARKERS}
        initialCaptions={CAPTIONS}
      >
        <div
          style={{
            aspectRatio: '16 / 9',
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            border: '1px solid #1e293b',
            backgroundColor: '#000',
          }}
        >
          <Root>
            <Html5VideoProvider src={HTML5_VIDEO_SRC} />
            <DefaultStandardLayout debug={false} />
          </Root>
        </div>
      </PlayerProvider>
    </div>
  );
};

export const App = () => {
  const [activeTab, setActiveTab] = useState<'html5' | 'remotion'>('html5');

  return (
    <div style={{ paddingBottom: '60px' }}>
      <nav
        style={{
          display: 'flex',
          gap: 16,
          padding: '16px 24px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '18px', marginRight: '24px', color: '#f8fafc' }}>
          Playground
        </span>
        <button
          type="button"
          aria-pressed={activeTab === 'html5'}
          onClick={() => setActiveTab('html5')}
          style={{
            background: activeTab === 'html5' ? '#4f46e5' : 'transparent',
            color: activeTab === 'html5' ? '#fff' : '#94a3b8',
            border: activeTab === 'html5' ? '1px solid #4f46e5' : '1px solid #334155',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          HTML5 Native
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'remotion'}
          onClick={() => setActiveTab('remotion')}
          style={{
            background: activeTab === 'remotion' ? '#4f46e5' : 'transparent',
            color: activeTab === 'remotion' ? '#fff' : '#94a3b8',
            border: activeTab === 'remotion' ? '1px solid #4f46e5' : '1px solid #334155',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          Remotion Engine
        </button>
      </nav>

      <main style={{ padding: '0 24px' }}>
        {activeTab === 'html5' && <Html5Demo />}
        {activeTab === 'remotion' && <RemotionDemo />}
      </main>
    </div>
  );
};
