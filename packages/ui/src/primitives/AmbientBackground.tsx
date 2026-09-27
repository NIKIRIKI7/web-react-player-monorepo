import { useEffect, useRef } from 'react';
import { usePlayerContext, usePlayerState } from '../context/PlayerContext';

/**
 * Свойства фонового свечения Ambilight.
 *
 * @public
 * @example
 * ```tsx
 * <AmbientBackground blur={80} saturate={2.5} opacity={0.7} fps={12} />
 * ```
 */
export interface AmbientBackgroundProps {
  /**
   * Радиус размытия кадра в пикселях.
   *
   * @example
   * ```tsx
   * <AmbientBackground blur={60} />
   * ```
   */
  blur?: number;
  /**
   * Насыщенность цвета свечения.
   *
   * @example
   * ```tsx
   * <AmbientBackground saturate={2.2} />
   * ```
   */
  saturate?: number;
  /**
   * Непрозрачность подложки свечения.
   *
   * @example
   * ```tsx
   * <AmbientBackground opacity={0.65} />
   * ```
   */
  opacity?: number;
  /**
   * Частота кадров перерисовки Canvas в секунду.
   *
   * @example
   * ```tsx
   * <AmbientBackground fps={10} />
   * ```
   */
  fps?: number;
}

// "Ambilight" glow. Renders a heavily blurred, saturated copy of the current
// video frame BEHIND the player box (as a sibling rendered before <Root>), so
// it never overlaps the video and the glow bleeds onto the page around it.
// The frame is cover-cropped before drawing so letterbox black bars are never
// copied into the canvas.
/**
 * Фоновое свечение (Ambilight) позади видеоплеера на базе Canvas 2D.
 *
 * Компонент отрисовывает сильно размытую насыщенную копию текущего кадра
 * видео и размещается до `<Root>`, поэтому свечение не перекрывает само видео,
 * а «вытекает» на страницу вокруг плеера. Кадр предварительно кадрируется
 * по принципу `object-fit: cover`, так что чёрные полосы letterbox никогда
 * не попадают в Canvas.
 *
 * Отрисовка идёт с ограничением по частоте кадров и максимальному размеру
 * тайла, автоматически прекращается в компактной раскладке (`isSmall`) и при
 * выключенном `context.ambientMode`.
 *
 * @public
 * @example
 * ```tsx
 * import { AmbientBackground, PlayerProvider, Root } from '@web-react-player/ui';
 *
 * export function App() {
 *   return (
 *     <PlayerProvider>
 *       <AmbientBackground blur={70} fps={12} />
 *       <Root>
 *         <video src="/media/movie.mp4" />
 *       </Root>
 *     </PlayerProvider>
 *   );
 * }
 * ```
 */
export function AmbientBackground({
  blur = 60,
  saturate = 2.2,
  opacity = 0.65,
  fps = 10,
}: AmbientBackgroundProps) {
  const { videoRef, isSmall } = usePlayerContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlaying = usePlayerState((s) => s.status === 'playing');
  const ambient = usePlayerState((s) => s.context.ambientMode);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!(canvas && video) || isSmall || !ambient) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    let rafId = 0;
    let lastDraw = 0;
    const interval = 1000 / fps;
    const maxDim = 192;

    const drawFrame = () => {
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      if (!(cssWidth && cssHeight)) return;
      const scale =
        Math.max(cssWidth, cssHeight) > maxDim ? maxDim / Math.max(cssWidth, cssHeight) : 1;
      const cw = Math.max(1, Math.round(cssWidth * scale));
      const ch = Math.max(1, Math.round(cssHeight * scale));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!(vw && vh)) return;

      // "object-fit: cover" source rect: crop the video to the canvas aspect so
      // the browser's letterbox bars stay out of the captured frame.
      const canvasAspect = cw / ch;
      const videoAspect = vw / vh;
      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;
      if (canvasAspect > videoAspect) {
        sw = Math.min(vw, vh * canvasAspect);
        sx = (vw - sw) / 2;
      } else {
        sh = Math.min(vh, vw / canvasAspect);
        sy = (vh - sh) / 2;
      }
      try {
        context.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
      } catch {
        // The <video> may briefly belong to another window (Document PiP active) —
        // a cross-window drawImage can throw, so swallow it and keep the last frame.
      }
    };

    const draw = (time: number) => {
      // Stop scheduling while paused so the last blurred frame stays put.
      if (video.paused || video.ended) return;
      if (time - lastDraw >= interval) {
        lastDraw = time;
        drawFrame();
      }
      rafId = requestAnimationFrame(draw);
    };

    if (isPlaying) rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [fps, isPlaying, isSmall, ambient, videoRef]);

  if (!ambient || isSmall) return null;

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={180}
      style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '120%',
        height: '120%',
        zIndex: 0,
        filter: `blur(${blur}px) saturate(${saturate}) opacity(${opacity})`,
        transform: 'translateZ(0)',
        pointerEvents: 'none',
      }}
    />
  );
}
