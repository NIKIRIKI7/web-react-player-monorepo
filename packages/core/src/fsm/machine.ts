import type {
  CaptionCue,
  Chapter,
  Marker,
  PlayerContext,
  PlayerEvent,
  PlayerListener,
  PlayerMiddleware,
  PlayerSnapshot,
  PlayerStatus,
} from './types';

const INITIAL_CONTEXT: PlayerContext = {
  src: null,
  currentTime: 0,
  duration: 0,
  bufferedEnd: 0,
  volume: 1,
  muted: false,
  playbackRate: 1,
  fullscreen: false,
  pip: false,
  theater: false,
  chapters: [],
  activeChapter: null,
  captions: [],
  activeCue: null,
  captionsEnabled: true, // Enabled by default
  lastAction: null,
  fps: 30,
  durationInFrames: 0,
  currentFrame: 0,
  error: null,
  brightness: 1,
  audioGain: 1,
  isLongPressSpeedUp: false,
  documentPip: false,
  markers: [],
  activeMarker: null,
  ambientMode: true,
  smartPauseReason: null,

  // Initial Quality settings
  qualities: [],
  currentQuality: null,
  autoQuality: true,
};

function findActiveChapter(chapters: Chapter[], time: number): Chapter | null {
  for (const chapter of chapters) {
    if (time >= chapter.startTime && time < chapter.endTime) {
      return chapter;
    }
  }
  return null;
}

function findActiveCue(cues: CaptionCue[], time: number): CaptionCue | null {
  for (const cue of cues) {
    if (time >= cue.startTime && time <= cue.endTime) {
      return cue;
    }
  }
  return null;
}

function findActiveMarker(markers: Marker[], time: number): Marker | null {
  for (const marker of markers) {
    if (time >= marker.startTime && time < marker.endTime) {
      return marker;
    }
  }
  return null;
}

/**
 * Изолированный детерминированный конечный автомат (FSM) плеера.
 *
 * Ядро не зависит от React, DOM и любых внешних библиотек: экземпляр
 * принимает события, применяет их к состоянию и уведомляет подписчиков
 * только при фактическом изменении.
 *
 * Публичные методы объявлены стрелочными свойствами, поэтому их можно
 * безопасно передавать как колбэки без потери контекста `this`.
 *
 * @public
 * @example Базовый цикл воспроизведения
 * ```ts
 * import { PlayerMachine } from '@web-react-player/core';
 *
 * const machine = new PlayerMachine();
 * machine.subscribe(({ status, context }) => {
 *   console.log(status, context.currentTime);
 * });
 *
 * machine.send({ type: 'LOAD', src: '/media/movie.mp4' });
 * machine.send({ type: 'METADATA_LOADED', duration: 120 });
 * machine.send({ type: 'PLAY' });
 * ```
 *
 * @example Блокировка события через middleware
 * ```ts
 * const machine = new PlayerMachine();
 * const remove = machine.use((event, _snapshot, next) => {
 *   if (event.type === 'PLAY' && !isUserInitiated) return; // глотаем событие
 *   next(event);
 * });
 * remove(); // снять middleware
 * ```
 *
 * @example Восстановление сохранённых настроек
 * ```ts
 * const machine = new PlayerMachine();
 * machine.send({ type: 'HYDRATE_SETTINGS', volume: 0.8, playbackRate: 1.5, ambientMode: false });
 * ```
 */
export class PlayerMachine {
  private status: PlayerStatus = 'idle';
  private context: PlayerContext = { ...INITIAL_CONTEXT };
  private listeners = new Set<PlayerListener>();
  private middlewares: PlayerMiddleware[] = [];

  private snapshot: PlayerSnapshot = {
    status: this.status,
    context: { ...this.context },
  };

  /**
   * Возвращает текущий снимок состояния плеера.
   *
   * Снимок иммутабелен и остаётся валидным после дальнейших событий.
   *
   * @returns Актуальный снимок состояния.
   * @public
   * @example
   * ```ts
   * const { status, context } = machine.getSnapshot();
   * console.log(status, context.duration);
   * ```
   */
  public getSnapshot = (): PlayerSnapshot => {
    return this.snapshot;
  };

  /**
   * Подписывает функцию обратного вызова на изменение снимка.
   *
   * Подписчик вызывается только когда статус или контекст действительно
   * изменились, поэтому лишних ререндеров не возникает.
   *
   * @param listener - Функция-подписчик.
   * @returns Функция отписки.
   * @public
   * @example
   * ```ts
   * const unsubscribe = machine.subscribe((snapshot) => {
   *   progress.style.width = `${(snapshot.context.currentTime / snapshot.context.duration) * 100}%`;
   * });
   * unsubscribe(); // отписаться
   * ```
   */
  public subscribe = (listener: PlayerListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Регистрирует middleware для перехвата событий до их применения к состоянию.
   *
   * Middleware вызываются в порядке регистрации. Если middleware не вызывает
   * `next`, событие поглощается и состояние не меняется.
   *
   * @param middleware - Функция промежуточного слоя.
   * @returns Функция удаления middleware (удаляет последнюю регистрацию).
   * @public
   * @example
   * ```ts
   * const remove = machine.use((event, snapshot, next) => {
   *   if (event.type === 'PLAY' && !snapshot.context.src) return; // не запускать без источника
   *   next(event);
   * });
   * remove();
   * ```
   */
  public use = (middleware: PlayerMiddleware): (() => void) => {
    this.middlewares.push(middleware);
    return () => {
      const index = this.middlewares.lastIndexOf(middleware);
      if (index !== -1) this.middlewares.splice(index, 1);
    };
  };

  /**
   * Синоним метода {@link PlayerMachine.send}.
   *
   * Совпадает с сигнатурой Redux-подобного `dispatch`, чтобы автомат
   * можно было подключить к существующим обвязкам без адаптеров.
   *
   * @param event - Событие плеера.
   * @public
   * @example
   * ```ts
   * machine.dispatch({ type: 'PLAY' });
   * ```
   */
  public dispatch = (event: PlayerEvent): void => {
    this.send(event);
  };

  /**
   * Отправляет событие в автомат с предварительным прогоном через конвейер middleware.
   *
   * @param event - Событие плеера.
   * @public
   * @example
   * ```ts
   * machine.send({ type: 'TIME_UPDATE', currentTime: 12.4, bufferedEnd: 40 });
   * machine.send({ type: 'VOLUME_CHANGE', volume: 0.8, muted: false });
   * machine.send({ type: 'RESET' });
   * ```
   */
  public send = (event: PlayerEvent): void => {
    this.runMiddleware(event, 0);
  };

  private runMiddleware = (event: PlayerEvent, index: number): void => {
    if (index < this.middlewares.length) {
      const middleware = this.middlewares[index];
      if (middleware) {
        middleware(event, this.snapshot, (nextEvent) => this.runMiddleware(nextEvent, index + 1));
      }
      return;
    }
    this.processEvent(event);
  };

  private processEvent(event: PlayerEvent): void {
    const prevStatus = this.status;
    const prevContext = this.context;
    let nextStatus = this.status;
    const nextContext = { ...this.context };

    switch (this.status) {
      case 'idle':
        if (event.type === 'LOAD') {
          nextStatus = 'loading';
          nextContext.src = event.src;
          nextContext.error = null;
          if (event.chapters) {
            nextContext.chapters = event.chapters;
            nextContext.activeChapter = findActiveChapter(event.chapters, nextContext.currentTime);
          }
          if (event.captions) {
            nextContext.captions = event.captions;
            nextContext.activeCue = findActiveCue(event.captions, nextContext.currentTime);
          }
          if (event.markers) {
            nextContext.markers = event.markers;
            nextContext.activeMarker = findActiveMarker(event.markers, nextContext.currentTime);
          }
          if (event.qualities) {
            nextContext.qualities = event.qualities;
            nextContext.currentQuality = event.qualities[0] || null;
          }
        } else if (event.type === 'METADATA_LOADED' || event.type === 'CAN_PLAY') {
          nextStatus = 'ready';
          if ('duration' in event && event.duration > 0) {
            nextContext.duration = event.duration;
            nextContext.durationInFrames = Math.round(event.duration * nextContext.fps);
          }
        } else if (event.type === 'PLAY' || event.type === 'PLAYING') {
          nextStatus = 'playing';
        }
        break;
      case 'loading':
        if (event.type === 'METADATA_LOADED' || event.type === 'CAN_PLAY') {
          nextStatus = 'ready';
          if ('duration' in event && event.duration > 0) {
            nextContext.duration = event.duration;
            nextContext.durationInFrames = Math.round(event.duration * nextContext.fps);
          }
        } else if (event.type === 'PLAY' || event.type === 'PLAYING') {
          nextStatus = 'playing';
        } else if (event.type === 'ERROR') {
          nextStatus = 'error';
          nextContext.error = event.error;
        }
        break;
      case 'ready':
      case 'paused':
      case 'ended':
        if (event.type === 'PLAY') {
          nextStatus = 'playing';
        } else if (event.type === 'SMART_RESUME' && nextContext.smartPauseReason) {
          nextStatus = 'playing';
        }
        break;
      case 'playing':
        if (event.type === 'PAUSE') {
          nextStatus = 'paused';
        } else if (event.type === 'SMART_PAUSE') {
          nextStatus = 'paused';
        } else if (event.type === 'WAITING') {
          nextStatus = 'buffering';
        } else if (event.type === 'ENDED') {
          nextStatus = 'ended';
        }
        break;
      case 'buffering':
        if (event.type === 'CAN_PLAY' || event.type === 'PLAYING') {
          nextStatus = 'playing';
        } else if (event.type === 'PAUSE') {
          nextStatus = 'paused';
        }
        break;
    }

    if (event.type === 'METADATA_LOADED') {
      nextContext.duration = event.duration;
      if (event.fps) nextContext.fps = event.fps;
      nextContext.durationInFrames = Math.round(event.duration * nextContext.fps);
      nextContext.activeChapter = findActiveChapter(nextContext.chapters, nextContext.currentTime);
    } else if (event.type === 'TIME_UPDATE') {
      nextContext.currentTime = event.currentTime;
      nextContext.currentFrame = Math.round(event.currentTime * nextContext.fps);
      if (typeof event.bufferedEnd === 'number') {
        nextContext.bufferedEnd = event.bufferedEnd;
      }
      nextContext.activeChapter = findActiveChapter(nextContext.chapters, event.currentTime);
      nextContext.activeCue = nextContext.captionsEnabled
        ? findActiveCue(nextContext.captions, event.currentTime)
        : null;
      nextContext.activeMarker = findActiveMarker(nextContext.markers, event.currentTime);
    } else if (event.type === 'BUFFER_UPDATE') {
      nextContext.bufferedEnd = event.bufferedEnd;
    } else if (event.type === 'VOLUME_CHANGE') {
      nextContext.volume = event.volume;
      nextContext.muted = event.muted;
      if (event.volume <= 1) nextContext.audioGain = event.volume;
    } else if (event.type === 'RATE_CHANGE') {
      nextContext.playbackRate = event.playbackRate;
    } else if (event.type === 'FULLSCREEN_CHANGE') {
      nextContext.fullscreen = event.fullscreen;
    } else if (event.type === 'PIP_CHANGE') {
      nextContext.pip = event.pip;
    } else if (event.type === 'THEATER_TOGGLE') {
      nextContext.theater = !nextContext.theater;
    } else if (event.type === 'TOGGLE_CAPTIONS') {
      nextContext.captionsEnabled = !nextContext.captionsEnabled;
      nextContext.activeCue = nextContext.captionsEnabled
        ? findActiveCue(nextContext.captions, nextContext.currentTime)
        : null;
    } else if (event.type === 'SET_CHAPTERS') {
      nextContext.chapters = event.chapters;
      nextContext.activeChapter = findActiveChapter(event.chapters, nextContext.currentTime);
    } else if (event.type === 'SET_CAPTIONS') {
      nextContext.captions = event.captions;
      nextContext.activeCue = nextContext.captionsEnabled
        ? findActiveCue(event.captions, nextContext.currentTime)
        : null;
    } else if (event.type === 'SET_MARKERS') {
      nextContext.markers = event.markers;
      nextContext.activeMarker = findActiveMarker(event.markers, nextContext.currentTime);
    } else if (event.type === 'SET_QUALITIES') {
      nextContext.qualities = event.qualities;
    } else if (event.type === 'QUALITY_CHANGE') {
      nextContext.currentQuality = event.quality;
      nextContext.autoQuality = event.auto ?? false;
    } else if (event.type === 'DOCUMENT_PIP_CHANGE') {
      nextContext.documentPip = event.documentPip;
    } else if (event.type === 'TOGGLE_AMBIENT') {
      nextContext.ambientMode = !nextContext.ambientMode;
    } else if (event.type === 'HYDRATE_SETTINGS') {
      nextContext.volume = event.volume;
      nextContext.playbackRate = event.playbackRate;
      nextContext.ambientMode = event.ambientMode;
    } else if (event.type === 'PLAY' || event.type === 'SMART_RESUME') {
      nextContext.smartPauseReason = null;
    } else if (event.type === 'SMART_PAUSE') {
      nextContext.smartPauseReason = event.reason;
    } else if (event.type === 'ACTION_TRIGGERED') {
      nextContext.lastAction = event.action;
    } else if (event.type === 'BRIGHTNESS_CHANGE') {
      nextContext.brightness = event.brightness;
    } else if (event.type === 'AUDIO_GAIN_CHANGE') {
      nextContext.audioGain = event.gain;
      nextContext.muted = event.gain === 0;
    } else if (event.type === 'LONG_PRESS_SPEED_CHANGE') {
      nextContext.isLongPressSpeedUp = event.isSpeedUp;
    } else if (event.type === 'ERROR') {
      nextStatus = 'error';
      nextContext.error = event.error;
    } else if (event.type === 'RESET') {
      nextStatus = 'idle';
      Object.assign(nextContext, INITIAL_CONTEXT);
    }

    const hasStatusChanged = prevStatus !== nextStatus;
    const hasContextChanged =
      prevContext.src !== nextContext.src ||
      prevContext.currentTime !== nextContext.currentTime ||
      prevContext.duration !== nextContext.duration ||
      prevContext.bufferedEnd !== nextContext.bufferedEnd ||
      prevContext.volume !== nextContext.volume ||
      prevContext.muted !== nextContext.muted ||
      prevContext.playbackRate !== nextContext.playbackRate ||
      prevContext.fullscreen !== nextContext.fullscreen ||
      prevContext.pip !== nextContext.pip ||
      prevContext.theater !== nextContext.theater ||
      prevContext.captionsEnabled !== nextContext.captionsEnabled ||
      prevContext.activeChapter !== nextContext.activeChapter ||
      prevContext.activeCue !== nextContext.activeCue ||
      prevContext.lastAction !== nextContext.lastAction ||
      prevContext.brightness !== nextContext.brightness ||
      prevContext.audioGain !== nextContext.audioGain ||
      prevContext.isLongPressSpeedUp !== nextContext.isLongPressSpeedUp ||
      prevContext.error !== nextContext.error ||
      prevContext.documentPip !== nextContext.documentPip ||
      prevContext.markers !== nextContext.markers ||
      prevContext.activeMarker !== nextContext.activeMarker ||
      prevContext.ambientMode !== nextContext.ambientMode ||
      prevContext.smartPauseReason !== nextContext.smartPauseReason ||
      prevContext.qualities !== nextContext.qualities ||
      prevContext.currentQuality !== nextContext.currentQuality ||
      prevContext.autoQuality !== nextContext.autoQuality;

    if (!(hasStatusChanged || hasContextChanged)) {
      return;
    }

    this.status = nextStatus;
    this.context = nextContext;
    this.snapshot = {
      status: this.status,
      context: { ...this.context },
    };

    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

/**
 * Создаёт новый экземпляр конечного автомата медиаплеера.
 *
 * Функциональная запись эквивалентна `new PlayerMachine()` и удобна
 * для модульного тестирования и передачи автомата как значения.
 *
 * @returns Инициализированный экземпляр {@link PlayerMachine} в статусе `idle`.
 * @public
 * @example
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * expect(machine.getSnapshot().status).toBe('idle');
 * ```
 *
 * @example Кастомный начальный набор глав
 * ```ts
 * const machine = createPlayerMachine();
 * machine.send({
 *   type: 'LOAD',
 *   src: '/media/film.mkv',
 *   chapters: [{ title: 'Пролог', startTime: 0, endTime: 120 }],
 * });
 * ```
 */
export const createPlayerMachine = (): PlayerMachine => new PlayerMachine();
