import {
  type CaptionCue,
  type Chapter,
  createPlayerMachine,
  type Marker,
  type PlayerEvent,
  type PlayerListener,
  type PlayerSnapshot,
  type VideoQuality,
} from '@web-react-player/core';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { type CaptionStylePreferences, DEFAULT_CAPTION_STYLES } from '../captions/types';
import { loadCaptionPreferences, saveCaptionPreferences } from '../captions/utils';

/**
 * Значение React-контекста плеера: снимок состояния FSM, ссылки на DOM,
 * адаптивные флаги раскладки и стабильный набор действий.
 *
 * Доступно через {@link usePlayerContext}. Все поля `actions` создаются один
 * раз и никогда не пересоздаются, поэтому их можно свободно указывать в
 * зависимостях `useEffect`/`useMemo`.
 *
 * @public
 * @example
 * ```tsx
 * import { usePlayerContext, usePlayerState } from '@web-react-player/ui';
 *
 * function Status() {
 *   const { actions, isSmall } = usePlayerContext();
 *   const status = usePlayerState((s) => s.status);
 *   return <button onClick={() => void actions.togglePlay()}>Статус: {status}</button>;
 * }
 * ```
 */
export interface PlayerContextValue {
  /**
   * Текущий снимок состояния конечного автомата.
   *
   * Объект меняет ссылку при каждом переходе, поэтому для точечных
   * подписок используйте {@link usePlayerState} с селектором.
   *
   * @example
   * ```tsx
   * const { state } = usePlayerContext();
   * console.log(state.status, state.context.currentTime);
   * ```
   */
  state: PlayerSnapshot;
  /**
   * Подписка на изменения снимка состояния.
   *
   * Возвращает функцию отписки, которую нужно вызвать в `useEffect`.
   *
   * @example
   * ```tsx
   * useEffect(() => context.subscribe((s) => console.log(s.status)), [context]);
   * ```
   */
  subscribe: (listener: PlayerListener) => () => void;
  /**
   * Отправить событие в конечный автомат.
   *
   * Прямой доступ к FSM для редких случаев; обычным компонентам следует
   * использовать `actions`.
   *
   * @example
   * ```tsx
   * send({ type: 'PAUSE' });
   * ```
   */
  send: (event: PlayerEvent) => void;
  /**
   * Ссылка на корневой контейнер `<Root>`.
   *
   * Используется для полноэкранного режима и наблюдения за размером.
   *
   * @example
   * ```tsx
   * rootRef.current?.requestFullscreen();
   * ```
   */
  rootRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Ссылка на элемент `<video>`, к которому подключён плеер.
   *
   * @example
   * ```tsx
   * videoRef.current?.requestPictureInPicture();
   * ```
   */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /**
   * Видимы ли элементы управления в данный момент.
   *
   * Управляется логикой простоя: скрывается после `idleTimeout` без ввода.
   *
   * @example
   * ```tsx
   * <div style={{ opacity: controlsVisible ? 1 : 0 }}>...</div>
   * ```
   */
  controlsVisible: boolean;
  /**
   * Принудительно задать видимость элементов управления.
   *
   * @example
   * ```tsx
   * setControlsVisible(true);
   * ```
   */
  setControlsVisible: (visible: boolean) => void;
  /**
   * Идёт ли сейчас перетаскивание ползунка времени пользователем.
   *
   * Пока значение `true`, автоматическое скрытие контролов подавляется.
   *
   * @example
   * ```tsx
   * if (isScrubbing) return; // не скрывать панель
   * ```
   */
  isScrubbing: boolean;
  /**
   * Задать признак перетаскивания таймлайна.
   *
   * @example
   * ```tsx
   * onPointerDown={() => setIsScrubbing(true)}
   * ```
   */
  setIsScrubbing: (scrubbing: boolean) => void;
  /**
   * Находится ли плеер в компактной раскладке.
   *
   * `true`, если ширина контейнера меньше порога `smallWhenWidth`
   * (по умолчанию 580 px).
   *
   * @example
   * ```tsx
   * isSmall ? <IconButton /> : <TextButton />
   * ```
   */
  isSmall: boolean;
  /**
   * Принудительно задать компактную раскладку.
   *
   * Обычно не вызывается вручную: значение вычисляется через `ResizeObserver`.
   *
   * @example
   * ```tsx
   * setIsSmall(true);
   * ```
   */
  setIsSmall: (isSmall: boolean) => void;
  /**
   * Текущая плотность раскладки по ширине контейнера.
   *
   * @example
   * ```tsx
   * const dense = tier === 'sm' || tier === 'xs';
   * ```
   */
  tier: ContainerTier;
  /**
   * Актуальные стили субтитров, включая сохранённые пользователем.
   *
   * @example
   * ```tsx
   * <div style={captionStylesToCssVariables(captionStyles)}>...</div>
   * ```
   */
  captionStyles: CaptionStylePreferences;
  /**
   * Изменить стили субтитров и сохранить их в `localStorage`.
   *
   * @example
   * ```tsx
   * setCaptionStyles({ ...captionStyles, fontSize: 32 });
   * ```
   */
  setCaptionStyles: (styles: CaptionStylePreferences) => void;
  /**
   * Идентификатор открытого выпадающего меню или `null`, если все закрыты.
   *
   * Координатор не позволяет плавающим элементам управления (например,
   * кнопке «Пропустить») перекрывать открытое меню.
   *
   * @example
   * ```tsx
   * if (activeMenu === null) actions.toggleCaptions();
   * ```
   */
  activeMenu: string | null;
  /**
   * Открыть или закрыть выпадающее меню.
   *
   * @example
   * ```tsx
   * setActiveMenu('quality'); // открыть
   * setActiveMenu(null);      // закрыть
   * ```
   */
  setActiveMenu: (menu: string | null) => void;
  /**
   * Набор императивных действий над плеером.
   *
   * Объект стабилен между рендерами, поэтому безопасен для передачи
   * в обработчики и зависимостей мемоизации.
   *
   * @example
   * ```tsx
   * const { actions } = usePlayerContext();
   * actions.seek(30);
   * actions.seekRelative(-5);
   * actions.setAudioGain(1.5);
   * actions.setQuality('auto');
   * ```
   */
  actions: {
    /**
     * Запустить воспроизведение с плавным нарастанием громкости.
     *
     * @param smartResume - Использовать умное возобновление, если текущая
     * позиция попадает в один из маркеров.
     * @example
     * ```tsx
     * await actions.play();
     * await actions.play(true);
     * ```
     */
    play: (smartResume?: boolean) => Promise<void>;
    /**
     * Поставить на паузу, при необходимости плавно погасив звук.
     *
     * @param reason - Причина умной паузы: `visibility` (вкладка скрыта) или
     * `intersection` (контейнер вне экрана).
     * @example
     * ```tsx
     * actions.pause();
     * actions.pause('visibility');
     * ```
     */
    pause: (reason?: 'visibility' | 'intersection') => void;
    /**
     * Переключить состояние воспроизведения.
     *
     * @example
     * ```tsx
     * await actions.togglePlay();
     * ```
     */
    togglePlay: () => Promise<void>;
    /**
     * Перейти к абсолютному времени в секундах.
     *
     * Значение зажимается в диапазон `[0, duration]`.
     *
     * @example
     * ```tsx
     * actions.seek(42);
     * ```
     */
    seek: (time: number) => void;
    /**
     * Сместить позицию воспроизведения относительно текущей.
     *
     * @param seconds - Смещение в секундах; отрицательное значение отматывает.
     * @example
     * ```tsx
     * actions.seekRelative(10);
     * actions.seekRelative(-5);
     * ```
     */
    seekRelative: (seconds: number) => void;
    /**
     * Установить базовую громкость в диапазоне `[0, 1]`.
     *
     * @example
     * ```tsx
     * actions.setVolume(0.6);
     * ```
     */
    setVolume: (volume: number) => void;
    /**
     * Установить усиление звука (AudioBoost) в диапазоне `[0, 3]`.
     *
     * Значения выше `1` работают через Web Audio API; при его недоступности
     * происходит откат к нативной громкости.
     *
     * @example
     * ```tsx
     * actions.setAudioGain(0.5);
     * actions.setAudioGain(2.5); // 250 %
     * ```
     */
    setAudioGain: (gain: number) => void;
    /**
     * Переключить отключение звука.
     *
     * @example
     * ```tsx
     * actions.toggleMute();
     * ```
     */
    toggleMute: () => void;
    /**
     * Установить скорость воспроизведения.
     *
     * @example
     * ```tsx
     * actions.setPlaybackRate(1.5);
     * ```
     */
    setPlaybackRate: (rate: number) => void;
    /**
     * Установить яркость видео в диапазоне `[0.1, 3]`.
     *
     * @example
     * ```tsx
     * actions.setBrightness(1.2);
     * ```
     */
    setBrightness: (level: number) => void;
    /**
     * Включить или выключить ускорение долгого нажатия.
     *
     * @example
     * ```tsx
     * actions.setLongPressSpeedUp(true);
     * ```
     */
    setLongPressSpeedUp: (active: boolean) => void;
    /**
     * Войти в полноэкранный режим или выйти из него.
     *
     * На iOS используется нативный полноэкранный режим видеоэлемента.
     *
     * @example
     * ```tsx
     * await actions.toggleFullscreen();
     * ```
     */
    toggleFullscreen: () => Promise<void>;
    /**
     * Включить или выключить режим «картинка в картинке».
     *
     * @example
     * ```tsx
     * await actions.togglePIP();
     * ```
     */
    togglePIP: () => Promise<void>;
    /**
     * Переключить театральный режим.
     *
     * @example
     * ```tsx
     * actions.toggleTheater();
     * ```
     */
    toggleTheater: () => void;
    /**
     * Включить или выключить субтитры.
     *
     * @example
     * ```tsx
     * actions.toggleCaptions();
     * ```
     */
    toggleCaptions: () => void;
    /**
     * Включить или выключить фоновое свечение Ambilight.
     *
     * Предпочтение сохраняется в `localStorage`.
     *
     * @example
     * ```tsx
     * actions.toggleAmbient();
     * ```
     */
    toggleAmbient: () => void;
    /**
     * Включить или выключить «документный» PiP (перенос плеера в портал страницы).
     *
     * @example
     * ```tsx
     * actions.toggleDocumentPip();
     * ```
     */
    toggleDocumentPip: () => void;
    /**
     * Зарегистрировать пользовательское действие для `ActionBezel`.
     *
     * @param type - Тип действия, например `seek_forward` или `volume`.
     * @param value - Значение, выводимое в бейдже.
     * @example
     * ```tsx
     * actions.triggerAction('seek_forward', 10);
     * actions.triggerAction('mute');
     * ```
     */
    triggerAction: (type: string, value?: string | number) => void;
    /**
     * Переключить качество видео.
     *
     * При смене источника сохраняются позиция и состояние воспроизведения.
     *
     * @param qualityId - Идентификатор качества либо строка `auto`.
     * @example
     * ```tsx
     * actions.setQuality('auto');
     * actions.setQuality('1080p');
     * ```
     */
    setQuality: (qualityId: string | 'auto') => void;
  };
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// Duration (in seconds) of the smart-pause audio fade in/out.
const FADE_DURATION = 0.3;

// Responsive container tiers let the player UI adapt its density to the
// available width: the full control set only fits wide players, while narrow
// ones collapse it step by step to avoid overflowing the bottom bar.
/**
 * Плотность адаптивной раскладки, вычисляемая по ширине контейнера.
 *
 * Полный набор контролов помещается только в широких плеерах, поэтому узкие
 * контейнеры сворачивают панель управления шаг за шагом, чтобы она не
 * переполнялась.
 *
 * - `xl` — от 800 px;
 * - `lg` — от 660 px;
 * - `md` — от 520 px;
 * - `sm` — от 360 px;
 * - `xs` — уже 360 px.
 *
 * @public
 * @example
 * ```ts
 * import { getContainerTier } from '@web-react-player/ui';
 *
 * getContainerTier(1024); // 'xl'
 * getContainerTier(700);  // 'lg'
 * getContainerTier(320);  // 'xs'
 * ```
 */
export type ContainerTier = 'xl' | 'lg' | 'md' | 'sm' | 'xs';

/**
 * Вычисляет плотность раскладки по ширине контейнера в пикселях.
 *
 * Границы брейкпоинтов повторяют ладдер плотности в духе YouTube.
 *
 * @param width - Ширина контейнера в пикселях.
 * @returns Идентификатор плотности {@link ContainerTier}.
 * @public
 * @example
 * ```tsx
 * import { getContainerTier, usePlayerContext } from '@web-react-player/ui';
 *
 * const { tier } = usePlayerContext();
 * const showChapters = getContainerTier(900) === 'xl' && tier === 'xl';
 * ```
 */
export function getContainerTier(width: number): ContainerTier {
  if (width >= 800) return 'xl';
  if (width >= 660) return 'lg';
  if (width >= 520) return 'md';
  if (width >= 360) return 'sm';
  return 'xs';
}

// Width (px) below which the player switches to the compact ("small") layout.
const SMALL_WHEN_WIDTH = 580;

/**
 * Возвращает значение контекста плеера.
 *
 * Бросает ошибку, если компонент отрисован вне {@link PlayerProvider}, чтобы
 * проблема обнаруживалась сразу, а не через `undefined`-деструктуризацию.
 *
 * @throws Если вызывается вне `PlayerProvider`.
 * @public
 * @example
 * ```tsx
 * import { usePlayerContext } from '@web-react-player/ui';
 *
 * function SkipButton() {
 *   const { actions } = usePlayerContext();
 *   return <button onClick={() => actions.seek(0)}>К началу</button>;
 * }
 * ```
 */
export function usePlayerContext(): PlayerContextValue {
  const context = use(PlayerContext);
  if (!context) {
    throw new Error('Player UI components must be used within a <PlayerProvider>');
  }
  return context;
}

// DX Improvement: granular state selectors protect components from re-renders
// on every currentTime frame. The hook only subscribes to fields returned by the selector.
/**
 * Подписка на отдельное поле состояния конечного автомата.
 *
 * Гранулярные селекторы защищают компоненты от перерисовки на каждом кадре
 * обновления `currentTime`: перерендер происходит только тогда, когда значение,
 * возвращённое селектором, реально изменилось.
 *
 * @param selector - Функция, извлекающая нужное значение из снимка состояния.
 * @returns Текущее значение селектора.
 * @public
 * @example
 * ```tsx
 * import { usePlayerState } from '@web-react-player/ui';
 *
 * const isPlaying = usePlayerState((s) => s.status === 'playing');
 * const volume = usePlayerState((s) => s.context.audioGain);
 * ```
 *
 * @example С компонентом
 * ```tsx
 * function Muted() {
 *   const muted = usePlayerState((s) => s.context.muted);
 *   return muted ? <MuteIcon /> : <VolumeIcon />;
 * }
 * ```
 */
export function usePlayerState<T>(selector: (state: PlayerSnapshot) => T): T {
  const ctx = usePlayerContext();
  const [val, setVal] = useState<T>(() => selector(ctx.state));

  useEffect(() => {
    return ctx.subscribe((snapshot) => {
      const newVal = selector(snapshot);
      setVal((prev) => (prev !== newVal ? newVal : prev));
    });
  }, [ctx, selector]);

  return val;
}

/**
 * Свойства корневого провайдера плеера {@link PlayerProvider}.
 *
 * @public
 * @example
 * ```tsx
 * <PlayerProvider initialChapters={chapters} initialMarkers={markers}>
 *   <Root />
 * </PlayerProvider>
 * ```
 */
export interface PlayerProviderProps {
  /**
   * Поддерево плеера, обычно `Root` и компоненты управления.
   *
   * @example
   * ```tsx
   * <PlayerProvider>
   *   <Root>
   *     <video src="/media/movie.mp4" />
   *   </Root>
   * </PlayerProvider>
   * ```
   */
  children: ReactNode;
  /**
   * Главы, известные заранее; отправляются в автомат событием `SET_CHAPTERS`.
   *
   * @example
   * ```tsx
   * <PlayerProvider initialChapters={[{ id: 'intro', title: 'Интро', startTime: 0 }]} />
   * ```
   */
  initialChapters?: Chapter[];
  /**
   * Дорожки субтитров; отправляются в автомат событием `SET_CAPTIONS`.
   *
   * @example
   * ```tsx
   * <PlayerProvider initialCaptions={[{ id: 'c1', startTime: 0, endTime: 2, text: 'Привет' }]} />
   * ```
   */
  initialCaptions?: CaptionCue[];
  /**
   * Интерактивные маркеры (интро, спонсор, аутро).
   *
   * @example
   * ```tsx
   * <PlayerProvider initialMarkers={[{ id: 'm1', type: 'intro', startTime: 0, endTime: 30, label: 'Пропустить' }]} />
   * ```
   */
  initialMarkers?: Marker[];
  /**
   * Доступные варианты качества видео.
   *
   * @example
   * ```tsx
   * <PlayerProvider initialQualities={[{ id: '1080p', label: '1080p', height: 1080 }]} />
   * ```
   */
  initialQualities?: VideoQuality[];
}

/**
 * Провайдер плеера: создаёт конечный автомат, публикует его состояние
 * в React-контексте и восстанавливает сохранённые настройки.
 *
 * Провайдер отвечает за всё, что не относится к раскладке:
 * создание автомата и передачу начальных данных (главы, субтитры, маркеры,
 * качество), гидратацию громкости, скорости и режима Ambilight из
 * `localStorage`, адаптивные флаги `isSmall` и `tier` через `ResizeObserver`,
 * тактильную отдачу на смену главы, Web Audio-граф для AudioBoost и
 * координацию открытых меню.
 *
 * Дочерние компоненты не отрисовываются, пока настройки не восстановлены, —
 * это предотвращает расхождение гидратации.
 *
 * @public
 * @example
 * ```tsx
 * import { PlayerProvider, Root, Html5VideoProvider, TimeSlider } from '@web-react-player/ui';
 *
 * export function App() {
 *   return (
 *     <PlayerProvider
 *       initialMarkers={[{ id: 'sponsor', type: 'sponsor', startTime: 30, endTime: 90 }]}
 *     >
 *       <Root>
 *         <Html5VideoProvider src="/media/movie.mp4" />
 *         <TimeSlider />
 *       </Root>
 *     </PlayerProvider>
 *   );
 * }
 * ```
 */
export function PlayerProvider({
  children,
  initialChapters,
  initialCaptions,
  initialMarkers,
  initialQualities,
}: PlayerProviderProps) {
  const machine = useMemo(() => {
    const inst = createPlayerMachine();
    if (initialChapters) inst.send({ type: 'SET_CHAPTERS', chapters: initialChapters });
    if (initialCaptions) inst.send({ type: 'SET_CAPTIONS', captions: initialCaptions });
    if (initialMarkers) inst.send({ type: 'SET_MARKERS', markers: initialMarkers });
    if (initialQualities) inst.send({ type: 'SET_QUALITIES', qualities: initialQualities });
    return inst;
  }, [initialChapters, initialCaptions, initialMarkers, initialQualities]);

  const state = useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);

  // Keep ref to avoid recreating actions on state updates
  const stateRef = useRef(state);
  stateRef.current = state;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // AudioContext refs for AudioBoost (gain >100% via Web Audio API)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  // A MediaElementAudioSourceNode can only be attached to an element once;
  // remember which element the graph was built for so it is rebuilt on swap.
  const mediaElementRef = useRef<HTMLVideoElement | null>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [tier, setTier] = useState<ContainerTier>('xl');
  const [hydrated, setHydrated] = useState(false);

  // Active menu coordinator (quality, captions, etc.) so overlapping floating
  // controls (e.g. the Skip pill) can yield to whichever menu is open.
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Autonomous caption style preference (persisted separately from volume so it
  // survives across sessions and videos).
  const [captionStyles, setLocalCaptionStyles] =
    useState<CaptionStylePreferences>(DEFAULT_CAPTION_STYLES);

  useEffect(() => {
    setLocalCaptionStyles(loadCaptionPreferences());
  }, []);

  const setCaptionStyles = useCallback((newStyles: CaptionStylePreferences) => {
    setLocalCaptionStyles(newStyles);
    saveCaptionPreferences(newStyles);
  }, []);

  // Pending smart-pause fade timeout (fade out the gain before calling pause).
  const fadeTimeoutRef = useRef<number | null>(null);

  const send = useMemo(() => machine.send, [machine]);

  // Load previously persisted settings (volume, playback rate, ambient mode)
  // from localStorage to prevent hydration mismatches and restore user prefs.
  useEffect(() => {
    let volume: number | undefined;
    let playbackRate: number | undefined;
    let ambientMode: boolean | undefined;
    try {
      const storedVolume = window.localStorage.getItem('web-react-player:volume');
      const storedRate = window.localStorage.getItem('web-react-player:rate');
      const storedAmbient = window.localStorage.getItem('web-react-player:ambient');
      if (storedVolume !== null) {
        const parsed = Number.parseFloat(storedVolume);
        if (Number.isFinite(parsed)) volume = Math.max(0, Math.min(1, parsed));
      }
      if (storedRate !== null) {
        const parsed = Number.parseFloat(storedRate);
        if (Number.isFinite(parsed)) playbackRate = parsed;
      }
      if (storedAmbient !== null) {
        ambientMode = storedAmbient !== 'false';
      }
    } catch {
      // Storage unavailable (SSR / private mode) — fall back to defaults.
    }
    if (volume !== undefined || playbackRate !== undefined || ambientMode !== undefined) {
      const video = videoRef.current;
      if (video) {
        if (volume !== undefined) video.volume = volume;
        if (playbackRate !== undefined) video.playbackRate = playbackRate;
      }
      send({
        type: 'HYDRATE_SETTINGS',
        volume: volume ?? 1,
        playbackRate: playbackRate ?? 1,
        ambientMode: ambientMode ?? true,
      });
    }
    setHydrated(true);
  }, [send]);

  // Track the player's container width and publish the responsive tier. The
  // root element is only mounted after hydration, so the observer attaches once
  // the subtree exists (keyed on `hydrated`) and then follows resizes.
  useEffect(() => {
    if (!hydrated) return;
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const width = entry.contentRect.width;
        setIsSmall(width < SMALL_WHEN_WIDTH);
        setTier(getContainerTier(width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hydrated]);

  // Haptic Feedback on chapter change (UX)
  useEffect(() => {
    // Vibrate ONLY when the video is playing or the user is scrubbing.
    // This prevents the browser [Intervention] warning on initial metadata load.
    const isInteracting = stateRef.current.status === 'playing' || isScrubbing;

    if (
      isInteracting &&
      state.context.activeChapter &&
      typeof navigator !== 'undefined' &&
      navigator.vibrate
    ) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore possible API errors
      }
    }
  }, [state.context.activeChapter, isScrubbing]);

  const triggerAction = useCallback(
    (type: string, value?: string | number) => {
      send({
        type: 'ACTION_TRIGGERED',
        action: {
          type,
          ...(value !== undefined ? { value } : {}),
          timestamp: Date.now(),
        },
      });
    },
    [send],
  );

  const play = useCallback(
    async (smartResume = false) => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      const video = videoRef.current;
      if (video) {
        try {
          if (audioCtxRef.current?.state === 'suspended') {
            await audioCtxRef.current.resume();
          }
          if (gainNodeRef.current && audioCtxRef.current) {
            const context = audioCtxRef.current;
            const gain = gainNodeRef.current.gain;
            gain.cancelScheduledValues(context.currentTime);
            gain.setValueAtTime(gain.value, context.currentTime);
            gain.linearRampToValueAtTime(
              stateRef.current.context.audioGain,
              context.currentTime + FADE_DURATION,
            );
          }
          await video.play();
          send(smartResume ? { type: 'SMART_RESUME' } : { type: 'PLAY' });
          triggerAction(smartResume ? 'smart_resume' : 'play');
        } catch {
          // Playback prevented by the browser (autoplay policy).
        }
      } else {
        send(smartResume ? { type: 'SMART_RESUME' } : { type: 'PLAY' });
        triggerAction(smartResume ? 'smart_resume' : 'play');
      }
    },
    [send, triggerAction],
  );

  const pause = useCallback(
    (reason?: 'visibility' | 'intersection') => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      const video = videoRef.current;
      if (!video) {
        send(reason ? { type: 'SMART_PAUSE', reason } : { type: 'PAUSE' });
        triggerAction('pause');
        return;
      }
      // Smart pause fades the audio out before pausing the media element.
      if (reason && gainNodeRef.current && audioCtxRef.current) {
        const context = audioCtxRef.current;
        const gain = gainNodeRef.current.gain;
        gain.cancelScheduledValues(context.currentTime);
        gain.setValueAtTime(gain.value, context.currentTime);
        gain.linearRampToValueAtTime(0.0001, context.currentTime + FADE_DURATION);
        fadeTimeoutRef.current = window.setTimeout(() => {
          fadeTimeoutRef.current = null;
          videoRef.current?.pause();
        }, FADE_DURATION * 1000);
      } else {
        video.pause();
      }
      send(reason ? { type: 'SMART_PAUSE', reason } : { type: 'PAUSE' });
      triggerAction('pause');
    },
    [send, triggerAction],
  );

  const togglePlay = useCallback(async () => {
    if (stateRef.current.status === 'playing') {
      pause();
    } else {
      await play();
    }
  }, [play, pause]);

  const seek = useCallback(
    (time: number) => {
      const maxDuration = stateRef.current.context.duration || time;
      const clamped = Math.max(0, Math.min(time, maxDuration));
      const video = videoRef.current;
      if (video) {
        video.currentTime = clamped;
      }
      send({ type: 'TIME_UPDATE', currentTime: clamped });
    },
    [send],
  );

  const seekRelative = useCallback(
    (seconds: number) => {
      const targetTime = stateRef.current.context.currentTime + seconds;
      seek(targetTime);
      triggerAction(seconds > 0 ? 'seek_forward' : 'seek_backward', Math.abs(seconds));
    },
    [seek, triggerAction],
  );

  const setVolume = useCallback(
    (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume));
      const video = videoRef.current;
      if (video) {
        video.volume = clamped;
        video.muted = clamped === 0;
      }
      send({ type: 'VOLUME_CHANGE', volume: clamped, muted: clamped === 0 });
      triggerAction('volume', Math.round(clamped * 100));
    },
    [send, triggerAction],
  );

  // AudioBoost: gain up to 300% via AudioContext + GainNode (lazy initialization).
  // The graph is built at most once per <video> element and rebuilt only if the
  // element changes. If Web Audio is unavailable or cross-origin media refuses
  // it, we silently fall back to the native volume (capped at 100%).
  const initAudioGraph = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (audioCtxRef.current && gainNodeRef.current && mediaElementRef.current === video) {
      return;
    }
    try {
      if (audioCtxRef.current && mediaElementRef.current !== video) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
        gainNodeRef.current = null;
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API not available');
      const context = new AudioCtx();
      const source = context.createMediaElementSource(video);
      const gainNode = context.createGain();
      source.connect(gainNode);
      gainNode.connect(context.destination);
      audioCtxRef.current = context;
      gainNodeRef.current = gainNode;
      mediaElementRef.current = video;
      // Keep the native element at 100% so the GainNode owns the whole 0–300%
      // scale; otherwise the element volume would clamp the boosted signal.
      video.volume = 1;
    } catch {
      // Web Audio API unavailable: fall back to the native element volume.
    }
  }, []);

  const setAudioGain = useCallback(
    (gain: number) => {
      const clamped = Math.max(0, Math.min(3, gain));
      const video = videoRef.current;
      if (video) {
        initAudioGraph();
        const context = audioCtxRef.current;
        const gainNode = gainNodeRef.current;
        if (context && gainNode) {
          if (context.state === 'suspended') {
            void context.resume();
          }
          gainNode.gain.setValueAtTime(clamped, context.currentTime);
          video.muted = clamped === 0;
        } else {
          // Fallback when Web Audio is unavailable (native volume caps at 100%).
          video.volume = clamped;
          video.muted = clamped === 0;
        }
      }
      send({ type: 'AUDIO_GAIN_CHANGE', gain: clamped });
      triggerAction('audio_gain', `${Math.round(clamped * 100)}%`);
    },
    [initAudioGraph, send, triggerAction],
  );

  const toggleMute = useCallback(() => {
    const nextMuted = !stateRef.current.context.muted;
    const video = videoRef.current;
    if (video) {
      video.muted = nextMuted;
    }
    send({
      type: 'VOLUME_CHANGE',
      volume: stateRef.current.context.volume,
      muted: nextMuted,
    });
    triggerAction(nextMuted ? 'mute' : 'unmute');
  }, [send, triggerAction]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = rate;
      }
      send({ type: 'RATE_CHANGE', playbackRate: rate });
      triggerAction('speed', `${rate}x`);
    },
    [send, triggerAction],
  );

  const setBrightness = useCallback(
    (level: number) => {
      const clamped = Math.max(0.1, Math.min(3, level));
      send({ type: 'BRIGHTNESS_CHANGE', brightness: clamped });
      triggerAction('brightness', `${Math.round(clamped * 100)}%`);
    },
    [send, triggerAction],
  );

  const setLongPressSpeedUp = useCallback(
    (active: boolean) => {
      send({ type: 'LONG_PRESS_SPEED_CHANGE', isSpeedUp: active });
      if (active) triggerAction('long_press_speed', '>> 2x');
    },
    [send, triggerAction],
  );

  const toggleFullscreen = useCallback(async () => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      send({ type: 'FULLSCREEN_CHANGE', fullscreen: false });
    } else {
      if (root.requestFullscreen) {
        await root.requestFullscreen().catch(() => {});
        send({ type: 'FULLSCREEN_CHANGE', fullscreen: true });
        triggerAction('fullscreen');
      } else if (video && 'webkitEnterFullscreen' in video) {
        (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    }
  }, [send, triggerAction]);

  const togglePIP = useCallback(async () => {
    const video = videoRef.current;
    if (!(video && document.pictureInPictureEnabled)) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      send({ type: 'PIP_CHANGE', pip: false });
    } else {
      await video.requestPictureInPicture().catch(() => {});
      send({ type: 'PIP_CHANGE', pip: true });
      triggerAction('pip');
    }
  }, [send, triggerAction]);

  const toggleTheater = useCallback(() => {
    send({ type: 'THEATER_TOGGLE' });
    triggerAction('theater');
  }, [send, triggerAction]);

  const toggleCaptions = useCallback(() => {
    send({ type: 'TOGGLE_CAPTIONS' });
    triggerAction('captions');
  }, [send, triggerAction]);

  const toggleAmbient = useCallback(() => {
    const nextAmbient = !stateRef.current.context.ambientMode;
    send({ type: 'TOGGLE_AMBIENT' });
    triggerAction('ambient_mode', nextAmbient ? 'on' : 'off');
    try {
      window.localStorage.setItem('web-react-player:ambient', String(nextAmbient));
    } catch {
      // Storage unavailable — ignore persistence errors.
    }
  }, [send, triggerAction]);

  const toggleDocumentPip = useCallback(() => {
    const next = !stateRef.current.context.documentPip;
    send({ type: 'DOCUMENT_PIP_CHANGE', documentPip: next });
    triggerAction('document_pip', next ? 'on' : 'off');
  }, [send, triggerAction]);

  // Seamless quality switcher: swaps the source and preserves both the
  // playback position and the current playing state of the media element.
  const setQuality = useCallback(
    (qualityId: string | 'auto') => {
      const isAuto = qualityId === 'auto';
      const qualities = stateRef.current.context.qualities;
      const target = isAuto ? null : (qualities.find((q) => q.id === qualityId) ?? null);
      const video = videoRef.current;

      // Handle seamless source swap for multi-bitrate progressive MP4 streams
      if (video && target?.src && target.src !== video.src) {
        const prevTime = video.currentTime;
        const isPlaying = !video.paused;

        video.src = target.src;
        video.currentTime = prevTime;

        if (isPlaying) {
          video.play().catch(() => {});
        }
      }

      send({
        type: 'QUALITY_CHANGE',
        quality: target,
        auto: isAuto,
      });

      const label = isAuto ? 'Auto' : target?.label || `${target?.height}p`;
      triggerAction('quality', label);
    },
    [send, triggerAction],
  );

  // Actions are completely stable and never recreate
  const actions = useMemo(
    () => ({
      play,
      pause,
      togglePlay,
      seek,
      seekRelative,
      setVolume,
      setAudioGain,
      toggleMute,
      setPlaybackRate,
      setBrightness,
      setLongPressSpeedUp,
      toggleFullscreen,
      togglePIP,
      toggleTheater,
      toggleCaptions,
      toggleAmbient,
      toggleDocumentPip,
      triggerAction,
      setQuality,
    }),
    [
      play,
      pause,
      togglePlay,
      seek,
      seekRelative,
      setVolume,
      setAudioGain,
      toggleMute,
      setPlaybackRate,
      setBrightness,
      setLongPressSpeedUp,
      toggleFullscreen,
      togglePIP,
      toggleTheater,
      toggleCaptions,
      toggleAmbient,
      toggleDocumentPip,
      triggerAction,
      setQuality,
    ],
  );

  const contextValue = useMemo<PlayerContextValue>(
    () => ({
      state,
      subscribe: machine.subscribe,
      send,
      rootRef,
      videoRef,
      controlsVisible,
      setControlsVisible,
      isScrubbing,
      setIsScrubbing,
      isSmall,
      setIsSmall,
      tier,
      captionStyles,
      setCaptionStyles,
      activeMenu,
      setActiveMenu,
      actions,
    }),
    [
      state,
      machine.subscribe,
      send,
      controlsVisible,
      isScrubbing,
      isSmall,
      tier,
      captionStyles,
      setCaptionStyles,
      activeMenu,
      actions,
    ],
  );

  // Wait until persisted settings are restored before rendering children.
  // This prevents hydration mismatches (values from the server vs. localStorage).
  if (!hydrated) return null;

  return <PlayerContext.Provider value={contextValue}>{children}</PlayerContext.Provider>;
}
