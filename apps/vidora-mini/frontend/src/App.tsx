import {
  DefaultStandardLayout,
  Html5VideoProvider,
  PlayerProvider,
  Root,
  usePlayerContext,
} from '@web-react-player/ui';
import { useEffect, useState } from 'react';
import { KaraokeCaptions } from './KaraokeCaptions';
import { MOCK_WHISPERX, SAMPLE_MARKDOWN, ScenarioAdapter } from './ScenarioUtils';
import { type FFmpegConfig, VidoraFFmpegService } from './VidoraFFmpegService';

const SOURCE_VIDEO = 'http://localhost:8355/media/input_sample.mp4';

const DEFAULT_CONFIG: FFmpegConfig = {
  lufsNormalizer: true,
  reverb: false,
  grayscale: false,
  blur: false,
};

const FILTER_OPTIONS: readonly { key: keyof FFmpegConfig; label: string }[] = [
  { key: 'lufsNormalizer', label: 'LUFS -14 (нормализация)' },
  { key: 'reverb', label: 'Reverb (эхо-эффект)' },
  { key: 'grayscale', label: 'Grayscale (чёрно-белое)' },
  { key: 'blur', label: 'BoxBlur (размытие)' },
];

function MarkdownSync({ markdown }: { markdown: string }) {
  const { send } = usePlayerContext();

  useEffect(() => {
    send({ type: 'SET_CHAPTERS', chapters: ScenarioAdapter.parseChapters(markdown) });
  }, [markdown, send]);

  return null;
}

export const App = () => {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [config, setConfig] = useState<FFmpegConfig>(DEFAULT_CONFIG);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleToggle = (key: keyof FFmpegConfig) => {
    setConfig((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const startRender = async () => {
    setIsRendering(true);
    setProgress(0);
    setResult('');
    setError('');

    try {
      const url = await VidoraFFmpegService.startPipeline('project_1', config, setProgress);
      setResult(url);
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : 'Render failed');
    } finally {
      setIsRendering(false);
    }
  };

  const resultFileName = result.split('/').pop() || 'rendered-video.mp4';

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-8">
      <header className="mb-8 text-center">
        <h1 className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-3xl font-black text-transparent">
          Vidora FFmpeg Mastering
        </h1>
        <p className="mt-2 text-slate-400">
          Выберите эффекты и сравните оригинал с реальным результатом обработки.
        </p>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="h-3 w-3 rounded-full bg-slate-500" />
            Оригинал
          </h2>

          <div className="vidora-player relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-slate-700">
            <PlayerProvider initialCaptions={MOCK_WHISPERX}>
              <Root>
                <MarkdownSync markdown={markdown} />
                <Html5VideoProvider src={SOURCE_VIDEO} crossOrigin="anonymous" />
                <DefaultStandardLayout />
                <KaraokeCaptions />
              </Root>
            </PlayerProvider>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
            <label
              className="mb-2 block text-sm font-bold text-blue-400"
              htmlFor="scenario-markdown"
            >
              SCENARIO.md
            </label>
            <textarea
              id="scenario-markdown"
              aria-label="Markdown scenario"
              className="min-h-32 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm leading-relaxed text-slate-300 outline-none focus:border-blue-500"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h3 className="mb-4 border-b border-slate-800 pb-2 font-bold text-slate-300">
              Audio &amp; Video Filters (FFmpeg)
            </h3>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FILTER_OPTIONS.map((option) => (
                <label className="flex cursor-pointer items-center gap-3" key={option.key}>
                  <input
                    type="checkbox"
                    checked={config[option.key]}
                    onChange={() => handleToggle(option.key)}
                    className="h-5 w-5 accent-blue-500"
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>

            {isRendering && (
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-950 ring-1 ring-slate-700">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={startRender}
                disabled={isRendering}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
              >
                {isRendering ? `Рендер... ${progress}%` : 'Запустить FFmpeg'}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/50 bg-red-900/40 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
            Готовый результат
          </h2>

          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-slate-700">
            {result ? (
              <PlayerProvider>
                <Root>
                  <Html5VideoProvider src={result} crossOrigin="anonymous" />
                  <DefaultStandardLayout />
                </Root>
              </PlayerProvider>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <svg
                  className="h-12 w-12 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Ожидание видео</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span>Ожидание рендера...</span>
              </div>
            )}
          </div>

          {result && (
            <div className="rounded-xl border border-green-500/30 bg-green-900/20 p-4">
              <h4 className="mb-1 font-bold text-green-400">Успех!</h4>
              <p className="mb-2 text-sm text-slate-300">
                Файл обработан настоящим FFmpeg. Запустите плеер выше, чтобы увидеть результат.
              </p>
              <a
                href={result}
                download={resultFileName}
                className="font-mono text-sm text-blue-400 underline hover:text-blue-300"
              >
                Скачать файл ({resultFileName})
              </a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
