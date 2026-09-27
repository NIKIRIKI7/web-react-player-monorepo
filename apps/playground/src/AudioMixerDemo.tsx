import {
  createDefaultRemotionSuite,
  type ExportOptions,
  type RemotionCompositionConfig,
  RemotionProvider,
  type RemotionSource,
} from '@web-react-player/remotion';
import { DefaultStandardLayout, PlayerProvider, Root } from '@web-react-player/ui';
import { useMemo, useState } from 'react';

// Сценарий для Remotion с тестом всех фич аудиомикса
const SAMPLE_AUDIO_MIXER_TSX = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Mic, Music, Volume2, Zap } from 'lucide-react';

export const config = {
  durationInFrames: 300, // 10 секунд при 30 fps
  fps: 30,
  width: 1280,
  height: 720,
  audioMix: {
    // 1. Голос диктора:
    // - Относительный путь без staticFile
    // - Вступает на 2-й секунде (60-й кадр)
    // - durationFrames не указан -> играет полностью до конца файла
    // - trimStartFrames: обрезает первые 10 кадров исходника (вдохи/паузу)
    voiceover: {
      src: 'voice.mp3',
      startFrom: 60,
      trimStartFrames: 10,
      volume: 1,
    },

    // 2. Фоновая музыка:
    // - Вступает сразу на 0-м кадре
    // - endAt: жестко обрезается на 9-й секунде (270-й кадр)
    // - trimStartFrames: пропуск первых 30 кадров интро трека
    // - fadeIn: 30 кадров плавного нарастания
    // - fadeOut: 45 кадров плавного затухания перед отсечкой
    // - ducking: true -> громкость автоматически падает во время голоса!
    music: [
      {
        src: 'bg-music.mp3',
        startFrom: 0,
        endAt: 270,
        trimStartFrames: 30,
        fadeInFrames: 30,
        fadeOutFrames: 45,
        ducking: true,
        volume: 0.8,
      },
    ],

    // 3. Звуковые эффекты:
    // - SFX #1: срабатывает на 60-м кадре ровно со стартом диктора
    // - SFX #2: срабатывает на 180-м кадре, с обрезкой длительности (20 кадров)
    sfx: [
      {
        src: 'sfx-pop.mp3',
        startFrom: 60,
        durationFrames: 25,
        volume: 0.9,
      },
      {
        src: 'sfx-pop.mp3',
        startFrom: 180,
        durationFrames: 20,
        trimStartFrames: 15,
        volume: 0.7,
      },
    ],
  },
};

export const AudioMixerScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Визуальные индикаторы текущего состояния
  const isMusicPlaying = frame >= 0 && frame < 270;
  const isVoiceoverActive = frame >= 60 && frame < 200; // примерный интервал голоса
  const isSfx1 = frame >= 60 && frame <= 85;
  const isSfx2 = frame >= 180 && frame <= 200;

  return (
    <AbsoluteFill className="bg-slate-950 flex flex-col items-center justify-center text-white font-sans p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
          Audio Mixer Test Bench
        </h1>
        <p className="text-slate-400 text-sm mt-2 font-mono">
          Текущий кадр: <span className="text-blue-400 font-bold">{frame}</span> / 300 ({(frame / fps).toFixed(2)}s)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
        {/* Карточка Voiceover */}
        <div
          className={\`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-2 \${
            isVoiceoverActive
              ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900/60 border-slate-800'
          }\`}
        >
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Mic size={20} />
            <span>Voiceover</span>
            {isVoiceoverActive && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 animate-pulse">
                ACTIVE
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2 space-y-1">
            <p>startFrom: 60 (2.0s)</p>
            <p>trimStart: 10 кадров</p>
            <p>duration: полное (default)</p>
          </div>
        </div>

        {/* Карточка Music */}
        <div
          className={\`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-2 \${
            isMusicPlaying
              ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-500/20'
              : 'bg-slate-900/60 border-slate-800'
          }\`}
        >
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <Music size={20} />
            <span>Music (Ducking)</span>
            {isMusicPlaying && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                {isVoiceoverActive ? 'DUCKED 15%' : 'NORMAL 80%'}
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2 space-y-1">
            <p>range: 0 - 270 (endAt)</p>
            <p>trimStart: 30 | fade: 30/45</p>
            <p className={isVoiceoverActive ? 'text-amber-300 font-bold' : ''}>
              ducking: active
            </p>
          </div>
        </div>

        {/* Карточка SFX */}
        <div
          className={\`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-2 \${
            isSfx1 || isSfx2
              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/60 border-slate-800'
          }\`}
        >
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Zap size={20} />
            <span>SFX Triggers</span>
            {(isSfx1 || isSfx2) && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                PLAYING
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2 space-y-1">
            <p>SFX #1: кадр 60 (dur: 25)</p>
            <p>SFX #2: кадр 180 (dur: 20)</p>
            <p>trimStart: 15 кадров</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-slate-500 font-mono text-center max-w-lg">
        На 60-м кадре (2-я секунда) диктор и звуковой эффект вступают одновременно, а музыка автоматически приглушается.
      </div>
    </AbsoluteFill>
  );
};
`;

export function AudioMixerDemo() {
  const [suite] = useState(() => createDefaultRemotionSuite());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportQuality, setExportQuality] = useState<ExportOptions['quality']>('standard');

  // Виртуальная файловая система: связываем относительные имена с реальными CORS-доступными URL
  const remotionSource = useMemo<Extract<RemotionSource, { type: 'code' }>>(
    () => ({
      type: 'code',
      code: SAMPLE_AUDIO_MIXER_TSX,
      assets: {
        'voice.mp3': 'https://cdn.jsdelivr.net/gh/mdn/webaudio-examples@main/audio-param/viper.mp3',
        'bg-music.mp3':
          'https://cdn.jsdelivr.net/gh/mdn/webaudio-examples@main/audio-basics/outfoxing.mp3',
        'sfx-pop.mp3':
          'https://cdn.jsdelivr.net/gh/mdn/webaudio-examples@main/audio-param/viper.mp3',
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
        durationInFrames: 300,
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

      result.download(`audio-mixer-test-${exportQuality}.mp4`);
    } catch (err) {
      alert(`Ошибка экспорта: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Audio Mixer Integration Test</h2>
        <p style={{ margin: 0, color: '#64748b' }}>
          Тестирование независимого саунд-дизайна: относительные пути к аудио, ducking музыки во
          время речи, обрезка по таймлайну (endAt / durationFrames) и внутри файлов
          (trimStartFrames).
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
          background: '#0f172a',
          borderRadius: '12px',
          border: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="audio-export-quality"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
            }}
          >
            Качество экспорта
          </label>
          <select
            id="audio-export-quality"
            value={exportQuality}
            onChange={(e) => setExportQuality(e.target.value as ExportOptions['quality'])}
            disabled={isExporting}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#ffffff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="draft">Черновик (Draft) — 1 Mbps</option>
            <option value="standard">Стандарт (Standard) — Web</option>
            <option value="high">Высокое (High) — 15 Mbps</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          style={{
            padding: '10px 24px',
            backgroundColor: isExporting ? '#334155' : '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: isExporting ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            marginLeft: 'auto',
          }}
        >
          {isExporting ? `Экспорт... ${exportProgress}%` : 'Экспорт MP4 со звуком'}
        </button>
      </div>
    </div>
  );
}
