/**
 * Дискретные статусы жизненного цикла медиаплеера.
 *
 * Переходы между статусами описаны в автомате {@link PlayerMachine}.
 * Каждый статус соответствует определённому набору допустимых событий.
 *
 * @public
 * @example
 * ```ts
 * import { type PlayerStatus, createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.subscribe(({ status }) => {
 *   if (status === 'ended') {
 *     console.log('Воспроизведение завершено');
 *   }
 * });
 * ```
 */
export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

/**
 * Логическая глава на таймлайне медиафайла.
 *
 * Интервал главы полузамкнутый слева и справа: `startTime` включается,
 * `endTime` не включается (`[startTime, endTime)`). Это позволяет соседним
 * главам иметь общую границу без двусмысленности.
 *
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.send({
 *   type: 'LOAD',
 *   src: '/media/interview.mp4',
 *   chapters: [
 *     { title: 'Вступление', startTime: 0, endTime: 30 },
 *     { title: 'Интервью', startTime: 30, endTime: 620 },
 *   ],
 * });
 * ```
 */
export interface Chapter {
  /**
   * Название главы для отображения в UI и тултипах.
   *
   * @example
   * ```ts
   * const chapter: Chapter = { title: 'Вступление', startTime: 0, endTime: 30 };
   * ```
   */
  title: string;
  /**
   * Время начала главы в секундах (включительно).
   *
   * @example
   * ```ts
   * const startTime = 30; // глава начинается на 30-й секунде
   * ```
   */
  startTime: number;
  /**
   * Время окончания главы в секундах (исключительно).
   *
   * @example
   * ```ts
   * const endTime = 620; // глава заканчивается перед 620-й секундой
   * ```
   */
  endTime: number;
}

/**
 * Пословный тайминг для субтитров высокой точности (караоке-эффект).
 *
 * @public
 * @example
 * ```ts
 * const words: WordCue[] = [
 *   { word: 'Привет', start: 0.1, end: 0.45 },
 *   { word: 'мир', start: 0.5, end: 0.8 },
 * ];
 * ```
 */
export interface WordCue {
  /**
   * Текст слова или лексемы.
   *
   * @example
   * ```ts
   * { word: 'Привет', start: 0.1, end: 0.45 }
   * ```
   */
  word: string;
  /**
   * Время начала звучания слова в секундах.
   *
   * @example
   * ```ts
   * { word: 'Привет', start: 0.1, end: 0.45 } // старт в 100 мс
   * ```
   */
  start: number;
  /**
   * Время окончания звучания слова в секундах.
   *
   * @example
   * ```ts
   * { word: 'Привет', start: 0.1, end: 0.45 } // конец в 450 мс
   * ```
   */
  end: number;
}

/**
 * Реплика субтитров.
 *
 * Интервал реплики замкнутый с обеих сторон: `[startTime, endTime]`,
 * поэтому реплики с общей границей не конфликтуют.
 *
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.send({
 *   type: 'LOAD',
 *   src: '/media/lecture.mp4',
 *   captions: [
 *     {
 *       id: 'c1',
 *       startTime: 0,
 *       endTime: 2.5,
 *       text: 'Добро пожаловать на лекцию',
 *       words: [{ word: 'Добро', start: 0, end: 0.4 }],
 *     },
 *   ],
 * });
 * ```
 */
export interface CaptionCue {
  /**
   * Опциональный идентификатор реплики.
   *
   * @example
   * ```ts
   * { id: 'c1', startTime: 0, endTime: 2.5, text: 'Привет' }
   * ```
   */
  id?: string;
  /**
   * Время появления субтитра в секундах.
   *
   * @example
   * ```ts
   * { startTime: 12.5, endTime: 15, text: 'Реплика' }
   * ```
   */
  startTime: number;
  /**
   * Время скрытия субтитра в секундах.
   *
   * @example
   * ```ts
   * { startTime: 12.5, endTime: 15, text: 'Реплика' }
   * ```
   */
  endTime: number;
  /**
   * Текст субтитра.
   *
   * @example
   * ```ts
   * { startTime: 0, endTime: 1, text: 'Субтитр' }
   * ```
   */
  text: string;
  /**
   * Массив пословных таймингов для подсветки активных слов.
   *
   * @example
   * ```ts
   * {
   *   startTime: 0,
   *   endTime: 2,
   *   text: 'Слово за словом',
   *   words: [{ word: 'Слово', start: 0, end: 0.5 }],
   * }
   * ```
   */
  words?: WordCue[];
}

/**
 * Интерактивный отрезок на таймлайне (спонсорская вставка, интро, аутро, хайлайт).
 *
 * Активный маркер определяется как `time >= startTime && time < endTime`.
 *
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.send({
 *   type: 'LOAD',
 *   src: '/media/stream.mp4',
 *   markers: [
 *     { type: 'sponsor', startTime: 15, endTime: 45, label: 'Реклама', color: '#f59e0b' },
 *   ],
 * });
 * ```
 */
export interface Marker {
  /**
   * Тип сегмента.
   *
   * @example
   * ```ts
   * { type: 'sponsor', startTime: 15, endTime: 45 }
   * ```
   */
  type: 'sponsor' | 'intro' | 'outro' | 'highlight';
  /**
   * Время начала сегмента в секундах.
   *
   * @example
   * ```ts
   * { type: 'intro', startTime: 0, endTime: 8 }
   * ```
   */
  startTime: number;
  /**
   * Время окончания сегмента в секундах.
   *
   * @example
   * ```ts
   * { type: 'outro', startTime: 590, endTime: 600 }
   * ```
   */
  endTime: number;
  /**
   * Цвет полосы маркера на таймлайне.
   *
   * @example
   * ```ts
   * { type: 'highlight', startTime: 0, endTime: 10, color: '#22c55e' }
   * ```
   */
  color?: string;
  /**
   * Название сегмента для отображения на кнопке пропуска.
   *
   * @example
   * ```ts
   * { type: 'sponsor', startTime: 15, endTime: 45, label: 'Реклама' }
   * ```
   */
  label?: string;
}

/**
 * Запись о последнем совершённом действии для HUD-индикатора (ActionBezel).
 *
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.send({ type: 'ACTION_TRIGGERED', action: { type: 'seek_forward', value: '+10s', timestamp: Date.now() } });
 * ```
 */
export interface PlayerActionRecord {
  /**
   * Тип действия (например, `'seek_forward'`, `'volume'`, `'speed'`).
   *
   * @example
   * ```ts
   * { type: 'seek_forward', value: '+10s', timestamp: 1712345678901 }
   * ```
   */
  type: string;
  /**
   * Значение параметра действия (например, `'+10s'`, `'150%'`).
   *
   * @example
   * ```ts
   * { type: 'volume', value: 1.5, timestamp: 1712345678901 }
   * ```
   */
  value?: string | number;
  /**
   * Временная метка события в миллисекундах.
   *
   * @example
   * ```ts
   * { type: 'speed', value: '150%', timestamp: Date.now() }
   * ```
   */
  timestamp: number;
}

/**
 * Профиль качества видеопотока.
 *
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.send({
 *   type: 'SET_QUALITIES',
 *   qualities: [
 *     { id: '1080p', height: 1080, width: 1920, bitrate: 5_000_000, label: 'Full HD' },
 *     { id: '720p', height: 720, width: 1280, bitrate: 2_500_000, label: 'HD' },
 *   ],
 * });
 * machine.send({ type: 'QUALITY_CHANGE', quality: { id: '720p', height: 720 }, auto: false });
 * ```
 */
export interface VideoQuality {
  /**
   * Идентификатор профиля (например, `'1080p'`, `'auto'`).
   *
   * @example
   * ```ts
   * { id: '1080p', height: 1080, label: 'Full HD' }
   * ```
   */
  id: string;
  /**
   * Высота кадра в пикселях.
   *
   * @example
   * ```ts
   * { id: '1080p', height: 1080 }
   * ```
   */
  height: number;
  /**
   * Ширина кадра в пикселях.
   *
   * @example
   * ```ts
   * { id: '1080p', height: 1080, width: 1920 }
   * ```
   */
  width?: number;
  /**
   * Битрейт потока в битах в секунду.
   *
   * @example
   * ```ts
   * { id: '1080p', height: 1080, bitrate: 5_000_000 }
   * ```
   */
  bitrate?: number;
  /**
   * Человекочитаемая подпись (например, `'Full HD'`).
   *
   * @example
   * ```ts
   * { id: '1080p', height: 1080, label: 'Full HD' }
   * ```
   */
  label?: string;
  /**
   * URL прямого медиафайла для бесшовного переключения MP4.
   *
   * @example
   * ```ts
   * { id: '720p', height: 720, src: '/media/movie-720.mp4' }
   * ```
   */
  src?: string;
}

/**
 * Полный контекст состояния медиаплеера.
 *
 * Контекст хранит все данные плеера, кроме дискретного статуса FSM.
 * Он неизменяем: каждое событие, меняющее данные, создаёт новый объект
 * с частично обновлёнными полями.
 *
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.send({ type: 'LOAD', src: '/media/movie.mp4' });
 *
 * machine.subscribe(({ context }) => {
 *   // context.currentTime растёт во время воспроизведения
 *   progressBar.style.width = `${(context.currentTime / context.duration) * 100}%`;
 * });
 * ```
 */
export interface PlayerContext {
  /**
   * URL источника воспроизведения или `null`.
   *
   * @example
   * ```ts
   * context.src = 'https://example.com/movie.mp4';
   * ```
   */
  src: string | null;
  /**
   * Текущая позиция воспроизведения в секундах.
   *
   * @example
   * ```ts
   * context.currentTime = 42.5;
   * ```
   */
  currentTime: number;
  /**
   * Общая длительность видео в секундах.
   *
   * @example
   * ```ts
   * const total = formatTime(context.duration);
   * ```
   */
  duration: number;
  /**
   * Время окончания непрерывно загруженного буфера в секундах.
   *
   * @example
   * ```ts
   * if (context.bufferedEnd - context.currentTime < 5) preload();
   * ```
   */
  bufferedEnd: number;
  /**
   * Громкость системного элемента от `0.0` до `1.0`.
   *
   * @example
   * ```ts
   * context.volume = 0.8;
   * ```
   */
  volume: number;
  /**
   * Флаг отключения звука.
   *
   * @example
   * ```ts
   * context.muted = true;
   * ```
   */
  muted: boolean;
  /**
   * Скорость воспроизведения (`1.0` = обычная).
   *
   * @example
   * ```ts
   * context.playbackRate = 1.5;
   * ```
   */
  playbackRate: number;
  /**
   * Флаг полноэкранного режима.
   *
   * @example
   * ```ts
   * document.body.classList.toggle('is-fullscreen', context.fullscreen);
   * ```
   */
  fullscreen: boolean;
  /**
   * Флаг нативного режима Picture-in-Picture.
   *
   * @example
   * ```ts
   * if (context.pip) console.log('Видео вынесено в PiP-окно');
   * ```
   */
  pip: boolean;
  /**
   * Флаг режима кинотеатра.
   *
   * @example
   * ```ts
   * context.theater = true;
   * ```
   */
  theater: boolean;
  /**
   * Список зарегистрированных глав.
   *
   * @example
   * ```ts
   * chaptersMenu.items = context.chapters.map((c) => c.title);
   * ```
   */
  chapters: Chapter[];
  /**
   * Активная в данный момент глава или `null`.
   *
   * @example
   * ```ts
   * if (context.activeChapter) console.log(context.activeChapter.title);
   * ```
   */
  activeChapter: Chapter | null;
  /**
   * Список всех реплик субтитров.
   *
   * @example
   * ```ts
   * context.captions = [{ startTime: 0, endTime: 2, text: 'Привет' }];
   * ```
   */
  captions: CaptionCue[];
  /**
   * Активная реплика субтитров или `null`.
   *
   * @example
   * ```ts
   * subtitleEl.textContent = context.activeCue?.text ?? '';
   * ```
   */
  activeCue: CaptionCue | null;
  /**
   * Глобальный переключатель отображения субтитров.
   *
   * @example
   * ```ts
   * context.captionsEnabled = false;
   * ```
   */
  captionsEnabled: boolean;
  /**
   * Последнее зарегистрированное действие для HUD.
   *
   * @example
   * ```ts
   * if (context.lastAction) bezel.show(context.lastAction.value);
   * ```
   */
  lastAction: PlayerActionRecord | null;
  /**
   * Частота кадров (FPS).
   *
   * @example
   * ```ts
   * context.currentFrame = Math.round(context.currentTime * context.fps);
   * ```
   */
  fps: number;
  /**
   * Полная длительность видео в кадрах.
   *
   * @example
   * ```ts
   * const total = context.durationInFrames;
   * ```
   */
  durationInFrames: number;
  /**
   * Текущий кадр воспроизведения.
   *
   * @example
   * ```ts
   * render({ frame: context.currentFrame, fps: context.fps });
   * ```
   */
  currentFrame: number;
  /**
   * Текущая ошибка воспроизведения или `null`.
   *
   * @example
   * ```ts
   * if (context.error) console.error(context.error.message);
   * ```
   */
  error: Error | null;
  /**
   * Программный коэффициент яркости (от `0.1` до `3.0`).
   *
   * @example
   * ```ts
   * video.style.filter = `brightness(${context.brightness})`;
   * ```
   */
  brightness: number;
  /**
   * Усиление громкости AudioBoost (от `0.0` до `3.0` = 300%).
   *
   * @example
   * ```ts
   * gainNode.gain.value = context.audioGain;
   * ```
   */
  audioGain: number;
  /**
   * Флаг временного ускорения 2x по долгому нажатию.
   *
   * @example
   * ```ts
   * if (context.isLongPressSpeedUp) showSpeedBadge();
   * ```
   */
  isLongPressSpeedUp: boolean;
  /**
   * Флаг режима Document Picture-in-Picture.
   *
   * @example
   * ```ts
   * if (context.documentPip) console.log('Плеер в отдельном окне');
   * ```
   */
  documentPip: boolean;
  /**
   * Список интерактивных маркеров.
   *
   * @example
   * ```ts
   * timeline.render(context.markers);
   * ```
   */
  markers: Marker[];
  /**
   * Активный маркер в точке `currentTime` или `null`.
   *
   * @example
   * ```ts
   * if (context.activeMarker) skipButton.hidden = false;
   * ```
   */
  activeMarker: Marker | null;
  /**
   * Флаг режима фонового свечения (Ambilight).
   *
   * @example
   * ```ts
   * ambientCanvas.style.opacity = context.ambientMode ? '1' : '0';
   * ```
   */
  ambientMode: boolean;
  /**
   * Причина умной паузы (`'visibility'`, `'intersection'`) или `null`.
   *
   * @example
   * ```ts
   * if (context.smartPauseReason === 'visibility') banner.show('Пауза из-за скрытой вкладки');
   * ```
   */
  smartPauseReason: 'visibility' | 'intersection' | null;
  /**
   * Доступные профили качества.
   *
   * @example
   * ```ts
   * qualityMenu.items = context.qualities.map((q) => q.label ?? q.id);
   * ```
   */
  qualities: VideoQuality[];
  /**
   * Выбранное качество видео или `null`.
   *
   * @example
   * ```ts
   * video.src = context.currentQuality?.src ?? context.src ?? '';
   * ```
   */
  currentQuality: VideoQuality | null;
  /**
   * Включён ли автоматический выбор качества.
   *
   * @example
   * ```ts
   * context.autoQuality = true;
   * ```
   */
  autoQuality: boolean;
}

/**
 * Все события, принимаемые конечным автоматом.
 *
 * Проигрыватель отправляет события через {@link PlayerMachine.send}.
 * События делятся на две группы: меняющие дискретный статус (переходы FSM)
 * и меняющие только данные контекста.
 *
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.send({ type: 'LOAD', src: '/media/movie.mp4' });
 * machine.send({ type: 'METADATA_LOADED', duration: 120, fps: 30 });
 * machine.send({ type: 'PLAY' });
 * machine.send({ type: 'TIME_UPDATE', currentTime: 12.4, bufferedEnd: 30 });
 * machine.send({ type: 'PAUSE' });
 * ```
 */
export type PlayerEvent =
  | {
      type: 'LOAD';
      src: string;
      chapters?: Chapter[];
      captions?: CaptionCue[];
      markers?: Marker[];
      qualities?: VideoQuality[];
    }
  | { type: 'METADATA_LOADED'; duration: number; fps?: number }
  | { type: 'PLAY' }
  | { type: 'PLAYING' }
  | { type: 'PAUSE' }
  | { type: 'SMART_PAUSE'; reason: 'visibility' | 'intersection' }
  | { type: 'SMART_RESUME' }
  | { type: 'WAITING' }
  | { type: 'CAN_PLAY' }
  | { type: 'TIME_UPDATE'; currentTime: number; bufferedEnd?: number }
  | { type: 'BUFFER_UPDATE'; bufferedEnd: number }
  | { type: 'VOLUME_CHANGE'; volume: number; muted: boolean }
  | { type: 'RATE_CHANGE'; playbackRate: number }
  | { type: 'FULLSCREEN_CHANGE'; fullscreen: boolean }
  | { type: 'PIP_CHANGE'; pip: boolean }
  | { type: 'THEATER_TOGGLE' }
  | { type: 'TOGGLE_CAPTIONS' }
  | { type: 'SET_CHAPTERS'; chapters: Chapter[] }
  | { type: 'SET_CAPTIONS'; captions: CaptionCue[] }
  | { type: 'ACTION_TRIGGERED'; action: PlayerActionRecord }
  | { type: 'BRIGHTNESS_CHANGE'; brightness: number }
  | { type: 'AUDIO_GAIN_CHANGE'; gain: number }
  | { type: 'LONG_PRESS_SPEED_CHANGE'; isSpeedUp: boolean }
  | { type: 'DOCUMENT_PIP_CHANGE'; documentPip: boolean }
  | { type: 'TOGGLE_AMBIENT' }
  | { type: 'SET_MARKERS'; markers: Marker[] }
  | { type: 'SET_QUALITIES'; qualities: VideoQuality[] }
  | { type: 'QUALITY_CHANGE'; quality: VideoQuality | null; auto?: boolean }
  | { type: 'HYDRATE_SETTINGS'; volume: number; playbackRate: number; ambientMode: boolean }
  | { type: 'ENDED' }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET' };

/**
 * Неизменяемый снимок состояния плеера.
 *
 * Снимок — это пара «дискретный статус + контекст». Автомат отдаёт
 * подписчикам новый объект только при фактическом изменении состояния.
 *
 * @public
 * @example
 * ```ts
 * import { type PlayerSnapshot, createPlayerMachine } from '@web-react-player/core';
 *
 * function render(snapshot: PlayerSnapshot): void {
 *   playButton.hidden = snapshot.status !== 'ready';
 * }
 *
 * const machine = createPlayerMachine();
 * machine.subscribe(render);
 * ```
 */
export interface PlayerSnapshot {
  /**
   * Текущий дискретный статус FSM.
   *
   * @example
   * ```ts
   * if (snapshot.status === 'buffering') spinner.show();
   * ```
   */
  status: PlayerStatus;
  /**
   * Контекст данных плеера.
   *
   * @example
   * ```ts
   * timeline.value = snapshot.context.currentTime;
   * ```
   */
  context: PlayerContext;
}

/**
 * Функция обратного вызова для подписчиков на изменение снимка.
 *
 * @public
 * @example
 * ```ts
 * import { type PlayerListener, createPlayerMachine } from '@web-react-player/core';
 *
 * const listener: PlayerListener = (snapshot) => console.log(snapshot.status);
 * const machine = createPlayerMachine();
 * const unsubscribe = machine.subscribe(listener);
 * unsubscribe();
 * ```
 */
export type PlayerListener = (snapshot: PlayerSnapshot) => void;

/**
 * Функция промежуточного слоя (middleware) для перехвата событий FSM.
 *
 * Middleware вызывается до применения события к состоянию. Если `next`
 * не вызвана, событие отбрасывается и состояние не меняется.
 *
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * const remove = machine.use((event, snapshot, next) => {
 *   if (event.type === 'PLAY' && snapshot.context.currentTime >= 60) return; // блокировка
 *   next(event);
 * });
 * remove();
 * ```
 */
export type PlayerMiddleware = (
  event: PlayerEvent,
  snapshot: PlayerSnapshot,
  next: (event: PlayerEvent) => void,
) => void;
