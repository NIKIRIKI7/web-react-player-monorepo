# Техническая документация Web React Player

Полное описание монорепозитория `web-react-player`: архитектура, публичный API всех пакетов,
поведение конечного автомата, медиадаapters, движок Remotion, приложения и регламент разработки.

Документ описывает **фактическую реализацию**. Каждое утверждение сверено с исходным кодом.

---

## Содержание

1. [Что это за проект](#1-что-это-за-проект)
2. [Структура монорепозитория](#2-структура-монорепозитория)
3. [Архитектурные принципы](#3-архитектурные-принципы)
4. [`@web-react-player/core`](#4-web-react-playercore)
5. [`@web-react-player/ui`](#5-web-react-playerui)
6. [`@web-react-player/remotion`](#6-web-react-playerremotion)
7. [Приложения](#7-приложения)
8. [Инструменты качества и команды](#8-инструменты-качества-и-команды)
9. [Тестирование](#9-тестирование)
10. [Релиз и SemVer](#10-релиз-и-semver)
11. [Готовые рецепты интеграции](#11-готовые-рецепты-интеграции)
12. [Важные нюансы реализации](#12-важные-нюансы-реализации)

---

## 1. Что это за проект

**Web React Player** — набор npm-пакетов для построения видеоплеера в React-приложениях.

Ключевая идея: **логика воспроизведения отделена от интерфейса и от движка медиа**.

| Слой | Пакет | Ответственность | Зависимости |
| :--- | :--- | :--- | :--- |
| Ядро | `@web-react-player/core` | Конечный автомат состояний, типы, middleware | Нулевые |
| Интерфейс | `@web-react-player/ui` | React-провайдер, headless-примитивы, раскладка | `core`, React |
| Движок | `@web-react-player/remotion` | Компиляция TSX, плагины, экспорт, виджеты | `core`, `ui`, Remotion |

Пакеты публикуются независимо:

- `@web-react-player/core` — версия `1.0.0`, **без runtime-зависимостей**.
- `@web-react-player/ui` — версия `1.0.0`, зависимость `core: workspace:*`.
- `@web-react-player/remotion` — версия `0.1.0` (в статусе pre-1.0), зависит от `core` и `ui`.

Все пакеты: `"type": "module"`, ESM-only, сборка через Vite + `vite-plugin-dts`, лицензия MIT,
`engines.node: ^20.19.0 || >=22.12.0`, `sideEffects: false`.

Поддерживаемые версии React: `^18.0.0 || ^19.0.0` (peer-зависимость `ui` и `remotion`).

---

## 2. Структура монорепозитория

```text
web-react-player/
├── packages/
│   ├── core/                          # @web-react-player/core   (v1.0.2)
│   │   ├── src/fsm/types.ts           # PlayerStatus, PlayerContext, PlayerEvent
│   │   ├── src/fsm/machine.ts         # PlayerMachine + createPlayerMachine
│   │   ├── src/index.ts
│   │   ├── tests/machine.test.ts
│   │   ├── etc/core.api.md            # слепок API Extractor
│   │   └── README.md
│   ├── ui/                            # @web-react-player/ui     (v1.1.1)
│   │   ├── src/context/               # PlayerProvider, usePlayerContext, usePlayerState
│   │   ├── src/primitives/            # 20 headless-компонентов
│   │   ├── src/providers/             # Html5VideoProvider
│   │   ├── src/layouts/               # DefaultStandardLayout
│   │   ├── src/hotkeys/               # normalizer, dispatcher, defaultHotkeys
│   │   ├── src/captions/              # стили субтитров + localStorage
│   │   ├── src/utils/                 # formatTime, Slot
│   │   └── tests/ui.test.ts
│   └── remotion/                      # @web-react-player/remotion (v0.2.1)
│       ├── src/compiler/              # BrowserTsxCompiler, assetResolver (VFS)
│       ├── src/plugins/               # PluginManager + 4 встроенных плагина
│       ├── src/exporter/              # WebRendererExportEngine (WebCodecs)
│       ├── src/adapter/               # RemotionPlaybackAdapter
│       ├── src/providers/             # RemotionProvider
│       ├── src/adapters/              # ScenarioAdapter, VidoraFFmpegService
│       ├── src/widgets/               # WidgetRegistry, WidgetPropsEngine
│       └── tests/suite.test.ts
├── apps/
│   ├── playground/                    # 5 демо, Vite, порт 5173
│   └── vidora-mini/                   # frontend (порт 5174) + FastAPI backend (8355)
├── docs/
│   ├── ARCHITECTURE.md                # этот документ
│   └── api/                           # автогенерируемая документация TypeDoc (в .gitignore)
├── typedoc.json
├── pnpm-workspace.yaml                # packages/*, apps/*, apps/vidora-mini/frontend
├── biome.json                         # линтер и форматтер
└── package.json                       # корневые скрипты
```

---

## 3. Архитектурные принципы

### 3.1 Однонаправленный поток данных

```text
  Медиа-движок                Ядро (FSM)                 UI
 ┌──────────────┐        ┌──────────────────┐      ┌──────────────┐
 │ <video>      │──────▶ │ PlayerMachine    │ ◀─── │ PlayerProvider│
 │ Remotion     │ events │ send(event)     │ snap │ usePlayerState│
 │ Player       │        │ getSnapshot()   │────▶ │ примитивы     │
 └──────────────┘        └──────────────────┘      └──────────────┘
                                 ▲
                          actions.* (UI → FSM)
```

Движок **никогда** не знает о React. UI **никогда** не знает о Remotion. Связь — только через
события FSM и снапшот.

### 3.2 Media-адаптеры

Любой источник видео подключается одним компонентом, который умеет только одно: переводить
события движка в события FSM. Готовые адаптеры:

- `Html5VideoProvider` (`ui`) — нативный `<video>` для MP4/WebM.
- `RemotionProvider` (`remotion`) — мост в Remotion Player.

Адаптер для HLS или другого плеера пишется по этому же образцу: рендерите элемент,
подписываетесь на события, отправляете `send({ type: ... })`.

### 3.3 Правила зависимостей

- `core` не импортирует ничего, кроме TypeScript-типов. Ни React, ни DOM.
- `ui` зависит только от `core`.
- `remotion` зависит от `core` и `ui`, но не наоборот.
- Проверяется автоматически: `pnpm check:deps` (dependency-cruiser).

### 3.4 Стиль кода

- Линтер и форматтер — **Biome** (ESLint и Prettier не используются).
- TypeScript в strict-режиме, `any` запрещён, работа через сужение `unknown`.
- Включён `exactOptionalPropertyTypes`: опциональные поля **нельзя** передавать как `undefined` явно —
  используйте spread-conditional:

```ts
// Правильно
const opts = { ...(value !== undefined ? { value } : {}) };

// Ошибка компиляции
const opts = { value: undefined };
```

---

## 4. `@web-react-player/core`

Framework-agnostic ядро. Экспортирует конечный автомат и типы.

```ts
import { createPlayerMachine, type PlayerEvent, type PlayerSnapshot } from '@web-react-player/core';
```

### 4.1 Класс `PlayerMachine`

```ts
class PlayerMachine {
  getSnapshot: () => PlayerSnapshot;
  subscribe: (listener: PlayerListener) => () => void;
  use: (middleware: PlayerMiddleware) => () => void;
  dispatch: (event: PlayerEvent) => void;
  send: (event: PlayerEvent) => void;
}
```

Фабрика `createPlayerMachine()` возвращает новый экземпляр.

| Метод | Поведение |
| :--- | :--- |
| `getSnapshot()` | Возвращает **иммутабельный** снапшот `{ status, context }`. Кэшируется, новый объект создаётся только при реальном изменении состояния. |
| `subscribe(listener)` | Подписка на снапшоты. Возвращает функцию отписки. |
| `use(middleware)` | Регистрирует middleware. Возвращает функцию снятия. |
| `send(event)` | Отправляет событие в конвейер middleware → reducer. |
| `dispatch(event)` | Псевдоним `send` для совместимости с Redux-стилем. |

### 4.2 Статусы

```ts
type PlayerStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';
```

### 4.3 Таблица переходов

| Текущий статус | Событие | Следующий статус |
| :--- | :--- | :--- |
| `idle` | `LOAD` | `loading` (записывает `src`, главы, субтитры, маркеры, качества) |
| `idle` | `METADATA_LOADED` \| `CAN_PLAY` | `ready` |
| `idle` | `PLAY` \| `PLAYING` | `playing` |
| `loading` | `METADATA_LOADED` \| `CAN_PLAY` | `ready` |
| `loading` | `PLAY` \| `PLAYING` | `playing` |
| `loading` | `ERROR` | `error` |
| `ready` / `paused` / `ended` | `PLAY` | `playing` |
| `ready` / `paused` / `ended` | `SMART_RESUME` (если был `smartPauseReason`) | `playing` |
| `playing` | `PAUSE` \| `SMART_PAUSE` | `paused` |
| `playing` | `WAITING` | `buffering` |
| `playing` | `ENDED` | `ended` |
| `buffering` | `CAN_PLAY` \| `PLAYING` | `playing` |
| `buffering` | `PAUSE` | `paused` |
| **любой** | `ERROR` | `error` |
| **любой** | `RESET` | `idle`, контекст сбрасывается в `INITIAL_CONTEXT` |

Переходы в статусы `error` из состояния `ended`/`ready` обрабатываются общей веткой в конце
`processEvent`, поэтому `ERROR` всегда переводит машину в `error` вне зависимости от текущего статуса.

### 4.4 События (`PlayerEvent`)

**Загрузка и метаданные**

| Событие | Поля | Эффект |
| :--- | :--- | :--- |
| `LOAD` | `src`, `chapters?`, `captions?`, `markers?`, `qualities?` | `idle → loading`; заполняет коллекции, выбирает первую качестве |
| `METADATA_LOADED` | `duration`, `fps?` | Пишет `duration`, `fps`, `durationInFrames = round(duration × fps)`, пересчитывает активную главу |
| `SET_CHAPTERS` / `SET_CAPTIONS` / `SET_MARKERS` / `SET_QUALITIES` | соответствующая коллекция | Заменяет коллекцию, пересчитывает активный элемент |

**Транспорт**

`PLAY`, `PLAYING`, `PAUSE`, `WAITING`, `CAN_PLAY`, `TIME_UPDATE` (`currentTime`, `bufferedEnd?`),
`BUFFER_UPDATE` (`bufferedEnd`), `ENDED`, `RESET`.

`TIME_UPDATE` — главное событие: обновляет `currentTime`, `currentFrame`, `bufferedEnd`
и **пересчитывает** `activeChapter`, `activeCue` (только если `captionsEnabled`), `activeMarker`.

**Громкость и скорость**

`VOLUME_CHANGE` (`volume`, `muted`), `AUDIO_GAIN_CHANGE` (`gain`), `RATE_CHANGE` (`playbackRate`),
`LONG_PRESS_SPEED_CHANGE` (`isSpeedUp`).

> `VOLUME_CHANGE` при `volume <= 1` синхронизирует `audioGain` с `volume`.
> `AUDIO_GAIN_CHANGE` при `gain === 0` автоматически выставляет `muted: true`.

**Интерфейс**

`TOGGLE_CAPTIONS`, `THEATER_TOGGLE`, `FULLSCREEN_CHANGE` (`fullscreen`), `PIP_CHANGE` (`pip`),
`DOCUMENT_PIP_CHANGE` (`documentPip`), `TOGGLE_AMBIENT`, `BRIGHTNESS_CHANGE` (`brightness`),
`QUALITY_CHANGE` (`quality`, `auto?`), `ACTION_TRIGGERED` (`action`),
`HYDRATE_SETTINGS` (`volume`, `playbackRate`, `ambientMode`).

**Умная пауза**

`SMART_PAUSE` (`reason: 'visibility' | 'intersection'`), `SMART_RESUME`.
Причина хранится в `smartPauseReason`; `SMART_RESUME` очищает её.

**Ошибка**

`ERROR` (`error: Error`) — переводит машину в `error` и сохраняет объект ошибки в контексте.

### 4.5 Контекст `PlayerContext`

```ts
interface PlayerContext {
  // Медиа
  src: string | null;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  fps: number;                 // по умолчанию 30
  durationInFrames: number;
  currentFrame: number;

  // Аудио
  volume: number;              // 0..1, по умолчанию 1
  muted: boolean;
  audioGain: number;           // 0..3 (AudioBoost), по умолчанию 1

  // Скорость и яркость
  playbackRate: number;        // по умолчанию 1
  brightness: number;          // 0.1..3, по умолчанию 1
  isLongPressSpeedUp: boolean;

  // Режимы
  fullscreen: boolean;
  pip: boolean;
  theater: boolean;
  ambientMode: boolean;        // по умолчанию true
  documentPip: boolean;
  smartPauseReason: 'visibility' | 'intersection' | null;

  // Таймлайн
  chapters: Chapter[];
  activeChapter: Chapter | null;
  captions: CaptionCue[];
  activeCue: CaptionCue | null;
  captionsEnabled: boolean;    // по умолчанию true
  markers: Marker[];
  activeMarker: Marker | null;

  // Качество
  qualities: VideoQuality[];
  currentQuality: VideoQuality | null;
  autoQuality: boolean;        // по умолчанию true

  // Служебное
  lastAction: PlayerActionRecord | null;
  error: Error | null;
}
```

### 4.6 Модель временных интервалов

Это важно для корректности отрисовки таймлайна и попадания в цель.

| Сущность | Проверка активности | Границы |
| :--- | :--- | :--- |
| `Chapter` | `time >= startTime && time < endTime` | Полуоткрытые: `[start, end)` |
| `Marker` | `time >= startTime && time < endTime` | Полуоткрытые: `[start, end)` |
| `CaptionCue` | `time >= startTime && time <= endTime` | **Закрытые: `[start, end]`** |

Следствие: в момент `endTime` глава уже неактивна, а последний кадр субтитра ещё показывается.
Это сделано намеренно, чтобы текст субтитра не исчезал на кадре ровно перед следующим.

### 4.7 Middleware

```ts
type PlayerMiddleware = (
  event: PlayerEvent,
  snapshot: PlayerSnapshot,
  next: (event: PlayerEvent) => void,
) => void;
```

Конвейер выполняется по порядку регистрации. Если middleware **не вызывает** `next(event)`,
событие поглощается и не доходит до reducer. Middleware может подменить событие, вызвав
`next({ ...event, currentTime: 0 })`.

```ts
const machine = createPlayerMachine();

const unsubscribe = machine.use((event, snapshot, next) => {
  if (event.type === 'TIME_UPDATE' && snapshot.context.currentTime > 300) {
    next({ type: 'PAUSE' });
    return;
  }
  next(event);
});

machine.send({ type: 'PLAY' });
unsubscribe(); // снять middleware
```

### 4.8 Оптимизация ререндеров

Машина вычисляет `hasStatusChanged` и `hasContextChanged` и **уведомляет подписчиков только при
изменении**. Сравнивается явный список полей:

`src`, `currentTime`, `duration`, `bufferedEnd`, `volume`, `muted`, `playbackRate`, `fullscreen`,
`pip`, `theater`, `captionsEnabled`, `activeChapter`, `activeCue`, `lastAction`, `brightness`,
`audioGain`, `isLongPressSpeedUp`, `error`, `documentPip`, `markers`, `activeMarker`,
`ambientMode`, `smartPauseReason`, `qualities`, `currentQuality`, `autoQuality`.

> **Важно при расширении:** если вы добавите поле в `PlayerContext`, которое должно вызывать
> ререндер, добавьте его и в этот список сравнения, иначе подписчики не узнают об изменении.

---

## 5. `@web-react-player/ui`

React-слой: провайдер состояния, headless-примитивы, раскладка, горячие клавиши, стили субтитров.

### 5.1 `PlayerProvider`

Единственная точка входа. Создаёт машину, подписывается на неё и отдаёт контекст.

```ts
interface PlayerProviderProps {
  children: ReactNode;
  initialChapters?: Chapter[];
  initialCaptions?: CaptionCue[];
  initialMarkers?: Marker[];
  initialQualities?: VideoQuality[];
}
```

Начальные коллекции отправляются в машину сразу при создании (`SET_CHAPTERS` и т.д.).

**Гидратация.** До чтения `localStorage` провайдер возвращает `null`. Это предотвращает расхождение
значений при серверном рендере. Первый кадр после монтирования задерживается на один цикл.

### 5.2 Хуки

```ts
const { state, send, actions, ...rest } = usePlayerContext();
const isPlaying = usePlayerState((s) => s.status === 'playing');
```

| Хук | Назначение |
| :--- | :--- |
| `usePlayerContext()` | Полный контекст. **Бросает ошибку** `Player UI components must be used within a <PlayerProvider>`, если вызван вне провайдера. |
| `usePlayerState(selector)` | Подписка на **выбранные** поля. Компонент перерисовывается, только если изменилось значение селектора. Секлектор должен быть стабильным или результат примитивный. |

`PlayerContextValue`:

| Поле | Тип | Назначение |
| :--- | :--- | :--- |
| `state` | `PlayerSnapshot` | Текущий снапшот |
| `subscribe` | `(l: PlayerListener) => () => void` | Подписка на машину |
| `send` | `(event: PlayerEvent) => void` | Отправка события |
| `rootRef` | `RefObject<HTMLDivElement \| null>` | Контейнер плеера |
| `videoRef` | `RefObject<HTMLVideoElement \| null>` | Нативный video-элемент |
| `controlsVisible` / `setControlsVisible` | `boolean` | Видимость панели управления |
| `isScrubbing` / `setIsScrubbing` | `boolean` | Флаг перетаскивания таймлайна |
| `isSmall` / `setIsSmall` | `boolean` | Компактный режим (ширина < 580 px) |
| `tier` | `ContainerTier` | Уровень плотности: `xl \| lg \| md \| sm \| xs` |
| `captionStyles` / `setCaptionStyles` | `CaptionStylePreferences` | Стили субтитров |
| `activeMenu` / `setActiveMenu` | `string \| null` | Координатор открытых меню |

### 5.3 Действия (`actions`)

Все действия мемоизированы и **никогда не пересоздаются** — безопасно класть их в зависимости.

| Действие | Сигнатура | Поведение |
| :--- | :--- | :--- |
| `play` | `(smartResume?: boolean) => Promise<void>` | Возобновляет `AudioContext`, делает плавный **fade-in** громкости за 0.3 с, вызывает `video.play()`, шлёт `PLAY` или `SMART_RESUME` |
| `pause` | `(reason?: 'visibility' \| 'intersection') => void` | С **fade-out** громкости за 0.3 с, затем `video.pause()`, шлёт `PAUSE` или `SMART_PAUSE` |
| `togglePlay` | `() => Promise<void>` | `pause()` если играет, иначе `play()` |
| `seek` | `(time: number) => void` | Клампит в `[0, duration]`, пишет в `video.currentTime`, шлёт `TIME_UPDATE` |
| `seekRelative` | `(seconds: number) => void` | `seek(current + seconds)`, пишет action `seek_forward`/`seek_backward` |
| `setVolume` | `(volume: number) => void` | Клампит `0..1`; при `0` включает `muted` |
| `setAudioGain` | `(gain: number) => void` | Клампит `0..3`. Использует Web Audio `GainNode`; при недоступности Web Audio откатывается к нативному `video.volume` (максимум 100 %) |
| `toggleMute` | `() => void` | Инвертирует `muted` |
| `setPlaybackRate` | `(rate: number) => void` | Пишет в `video.playbackRate` |
| `setBrightness` | `(level: number) => void` | Клампит `0.1..3`; применяется как CSS `filter: brightness()` на `Root` |
| `setLongPressSpeedUp` | `(active: boolean) => void` | Флаг ускорения при долгом нажатии |
| `toggleFullscreen` | `() => Promise<void>` | Полный экран на `rootRef`; fallback на `webkitEnterFullscreen` |
| `togglePIP` | `() => Promise<void>` | Работает только если `document.pictureInPictureEnabled` |
| `toggleTheater` | `() => void` | Флаг театрального режима |
| `toggleCaptions` | `() => void` | Показ/скрытие субтитров |
| `toggleAmbient` | `() => void` | Ambient-подсветка + сохранение в `localStorage` |
| `toggleDocumentPip` | `() => void` | Document Picture-in-Picture |
| `triggerAction` | `(type: string, value?: string \| number) => void` | Пишет `lastAction` для `ActionBezel` и внешней аналитики |
| `setQuality` | `(qualityId: string \| 'auto') => void` | **Бесшовное** переключение: меняет `video.src`, сохраняет позицию и состояние воспроизведения |

### 5.4 AudioBoost (громкость до 300 %)

`setAudioGain` строит граф `MediaElementSource → GainNode → destination` один раз на `<video>`.
Нативный `video.volume` принудительно остаётся `1.0`, иначе усиленный сигнал обрезался бы на 100 %.

Ограничения и откаты:

- `MediaElementAudioSourceNode` можно привязать к элементу только один раз; при смене элемента
  старый `AudioContext` закрывается и граф пересоздаётся.
- Если медиаэлемент с другого origin без CORS-заголовков — `createMediaElementSource` бросит ошибку,
  и код молча откатится к нативной громкости.
- Если `AudioContext` недоступен (в т.ч. SSR) — тот же откат.

### 5.5 Адаптивность

`getContainerTier(width)` возвращает уровень плотности:

| Ширина (px) | `tier` |
| :--- | :--- |
| `>= 800` | `xl` |
| `>= 660` | `lg` |
| `>= 520` | `md` |
| `>= 360` | `sm` |
| `< 360` | `xs` |

Отдельно `isSmall` — компактный режим при ширине `< 580` (константа `SMALL_WHEN_WIDTH`).
Отслеживание ведётся через `ResizeObserver` на `rootRef`.

### 5.6 `Root`

```ts
interface RootProps extends ComponentProps<'div'> {
  keyboardShortcuts?: boolean;  // по умолчанию true
  hotkeys?: HotkeysMap;         // пользовательские переопределения
  idleTimeout?: number;         // 2500 мс
  smallWhenWidth?: number;      // 580
}
```

`Root` — обязательная обёртка. Она:

1. Монтирует `rootRef` и вешает `ResizeObserver` для `isSmall`.
2. Реализует **автоскрытие** панели управления: показывает на движении мыши, прячет через
   `idleTimeout`, если статус `playing` и пользователь не скраббит.
3. Подписывается на `keydown` на `document` (если `keyboardShortcuts`).
4. Синхронизирует нативные события fullscreen (`fullscreenchange`, `webkitfullscreenchange`).
5. Публикует CSS-переменные и атрибуты состояния.

**data-атрибуты на корне** (используйте их для собственного CSS):

| Атрибут | Условие |
| :--- | :--- |
| `data-player-root` | Всегда |
| `data-status` | Текущий `PlayerStatus` |
| `data-playing` / `data-paused` | Взаимоисключающие |
| `data-muted` | `context.muted` |
| `data-fullscreen`, `data-theater` | Соответствующие флаги |
| `data-sm` / `data-lg`, `data-size` | Адаптивность |
| `data-controls-visible` / `data-controls-hidden` | Видимость панели |

**CSS-переменные на корне:**

| Переменная | Значение |
| :--- | :--- |
| `--player-time-progress` | `(currentTime / duration) × 100 %` |
| `--player-buffered` | `(bufferedEnd / duration) × 100 %` |
| `--player-volume` | `volume × 100 %` |
| `--player-cue-font-size` | Абсолютный `px` из настроек субтитров |
| `--player-cue-color` | Цвет текста субтитра |
| `--player-cue-bg` | `rgba()` фона подложки |
| `--player-cue-shadow` | Значение `text-shadow` |
| `--player-cue-font-family` | Стек шрифта |

CSS-переменные обновляются **без ререндера** React, поэтому внешние оверлеи могут читать прогресс
и громкость из CSS.

### 5.7 Медиадаapter `Html5VideoProvider`

```tsx
<Html5VideoProvider src="https://example.com/video.mp4" crossOrigin="anonymous" />
```

Принимает все пропсы `<video>`. Принудительно ставит `playsInline` и `data-media-provider`.
Пробрасывает в FSM:

| Событие DOM | Событие FSM |
| :--- | :--- |
| `timeupdate` | `TIME_UPDATE` с `currentTarget.currentTime` |
| `loadedmetadata` | `METADATA_LOADED` с `duration` |
| `canplay` | `CAN_PLAY` |
| `play` | `PLAYING` |
| `pause` | `PAUSE` |
| `ended` | `ENDED` |
| `error` | `ERROR` с читаемым сообщением (`MediaError (code N): ...`) |

> `Html5VideoProvider` **не** шлёт `BUFFER_UPDATE`. Если нужен прогресс буфера, добавьте свой
> `onProgress`-обработчик и отправляйте `BUFFER_UPDATE`.

### 5.8 Примитивы

| Компонент | Пропсы | Назначение |
| :--- | :--- | :--- |
| `Root` | `keyboardShortcuts?`, `hotkeys?`, `idleTimeout?`, `smallWhenWidth?` + пропсы `div` | Контейнер, автоскрытие, хоткеи, CSS-переменные |
| `PlayButton` | `asChild?` + пропсы `button` | Кнопка play/pause. `asChild` делегирует рендер в `Slot` |
| `TimeSlider` | `thumbClassName?`, `trackClassName?`, `progressClassName?`, `bufferClassName?`, `previewClassName?` | Таймлайн с scrub-превью, буфером и сегментами глав/маркеров |
| `TimeDisplay` | `type?: 'current' \| 'duration' \| 'remaining'` | Тайм-код, `role="timer"` |
| `VolumeControl` | пропсы `fieldset` | Ползунок громкости (AudioBoost до 300 %) |
| `MuteButton` | пропсы `button` | Переключатель mute |
| `Captions` | `activeWordColor?` (`#38bdf8`), `passedWordOpacity?` (`0.7`), `wordTransition?` + пропсы `section` | Субтитры с **караоке**-подсветкой слов |
| `CaptionCustomizer` | `isOpen`, `onClose` | Панель настройки стиля субтитров |
| `CaptionPreviewBox` | — | Живое превью стиля |
| `QualityMenu` | пропсы `div` | Меню качества (в т.ч. `Auto`) |
| `SettingsMenu` | `onOpenSubtitleStyles?` + пропсы `div` | Единое меню: качество, скорость, ambient, document PiP, стили субтитров |
| `FullscreenButton` | пропсы `button` | Полный экран |
| `PIPButton` | пропсы `button` | Picture-in-Picture |
| `InteractiveMarkers` | `className?`, `style?` | Плавающая «Skip»-таблетка внутри активного маркера |
| `ActionBezel` | пропсы `div` | Крупный оверлей последнего действия (`+10s`, `MUTED`, `>> 2x`) |
| `AmbientBackground` | `blur?` (60), `saturate?` (2.2), `opacity?` (0.65), `fps?` (10) | «Ambilight»-подсветка вокруг плеера |
| `ScreenGestures` | пропсы `div` | Свайпы, двойной тап, ускорение 2× долгим нажатием |
| `DocumentPipPortal` | `children`, `width?`, `height?` | Портал в Document Picture-in-Picture окно |
| `Match` | `media: 'sm' \| 'lg'`, `children` | Рендерит детей только в нужном брейкпоинте (принимает функцию) |
| `PlayerDebug` | `enabled?` | Отладочная панель состояния |
| `Slot` | `type?`, `children` | Слияние пропсов в единственного ребёнка (аналог Radix Slot) |

### 5.9 `DefaultStandardLayout`

Готовая «YouTube-подобная» композиция примитивов.

```tsx
<DefaultStandardLayout debug={false} />
```

```ts
interface DefaultStandardLayoutProps extends ComponentProps<'div'> {
  debug?: boolean;  // включает PlayerDebug
}
```

Порядок слоёв (снизу вверх):

1. `AmbientBackground` — подсветка
2. `ActionBezel` — оверлей действия
3. `InteractiveMarkers` — «Skip»
4. `Captions` — субтитры
5. `PlayerDebug` (если `debug`)
6. Нижняя панель: `TimeSlider` + ряд `PlayButton`, `VolumeControl`, `TimeDisplay` … `QualityMenu`, `SettingsMenu`, `FullscreenButton`

Панель скрывается вслед за `controlsVisible`.

### 5.10 Горячие клавиши

**Стандартные сочетания (YouTube):**

| Клавиша | Команда |
| :--- | :--- |
| `K`, `Space` | Play / Pause |
| `J` / `L` | Назад / вперёд на 10 с |
| `←` / `→` | Назад / вперёд на 5 с |
| `↑` / `↓` | Громкость ±5 % (AudioBoost) |
| `M` | Mute |
| `F` | Полный экран |
| `C` | Субтитры |
| `T` | Театральный режим |
| `>` / `<` | Скорость ±0.25 (диапазон 0.25…3) |
| `.` / `,` | Кадр вперёд / назад |
| `Shift+S` | Пропустить активный маркер (переход на его `endTime`) |
| `0`…`9` | Переход на 0 %, 10 %, … 90 % длительности |

**Кастомные сочетания.** `Root` принимает `hotkeys` четырёх форм:

```tsx
<Root
  hotkeys={{
    // 1. Перепривязка команды
    togglePlay: ['Enter', 'p'],
    // 2. Команда → одна клавиша
    seekForward10: 'w',
    // 3. Клавиша → команда
    x: 'toggleMute',
    // 4. Макрос с полным контекстом
    'Shift+N': (ctx) => ctx.actions.setQuality('1080p'),
    // 5. Дескриптор с описанием
    y: { keys: 'k', handler: 'toggleCaptions', description: 'Субтитры' },
  }}
/>
```

Приоритет: пользовательские привязки проверяются **первыми**, стандартные служат fallback.
`preventDefault()` вызывается **только** если клавиша реально обработана.

События игнорируются, если фокус в поле ввода. Клавиши, нажатые на `<button>`, пропускаются, чтобы
сохранить нативные `Space`/`Enter`.

Публичный API хоткеев:

- `compileHotkeyBindings(userHotkeys?)` — сборка приоритетного списка привязок.
- `executeCanonicalCommand(command, context)` — единая точка исполнения команды.
- `handleKeyboardShortcut(event, bindings, context)` — конвейер обработки `keydown`.
- `DEFAULT_HOTKEYS` — карта команд по умолчанию.

### 5.11 Субтитры и караоке

`CaptionCue.words?: WordCue[]` включает режим караоке: `Captions` подсвечивает активное слово
(`activeWordColor`) и приглушает уже произнесённые (`passedWordOpacity`).

`CaptionCustomizer` предлагает пресеты:

- Размер: `75%`, `100%`, `125%`, `150%`, `200%`
- Цвет текста: `#ffffff`, `#ffff00`, `#00ffff`, `#00ff00`, `#ff8080`
- Фон: `#080808`, `#202020`, `#ffffff`, `#000080`
- Прозрачность: `0`, `0.25`, `0.5`, `0.75`, `1`
- Тень: `none`, `drop-shadow`, `outline`, `raised`, `depressed`
- Шрифт: `pro-sans`, `mono-sans`, `pro-serif`, `mono-serif`, `casual`, `cursive`

Настройки применяются через CSS-переменные — смена стиля **не перерисовывает** дерево субтитров.

Публичные утилиты: `DEFAULT_CAPTION_STYLES`, `captionStylesToCssVariables`, `hexToRgba`,
`loadCaptionPreferences`, `saveCaptionPreferences`.

### 5.12 Персистентность (`localStorage`)

| Ключ | Что хранит |
| :--- | :--- |
| `web-react-player:volume` | Громкость `0..1` |
| `web-react-player:rate` | Скорость воспроизведения |
| `web-react-player:ambient` | Ambient-подсветка (`'true'` / `'false'`) |
| `web-react-player:caption-styles` | JSON с настройками стиля субтитров |

Все операции обёрнуты в `try/catch`: при недоступном хранилище (SSR, приватный режим) код
продолжает работать на значениях по умолчанию.

### 5.13 Прочее

- `formatTime(seconds)` → `mm:ss` или `h:mm:ss`; отрицательные значения дают `00:00`.
- `UI_PACKAGE_READY = true` — флаг готовности пакета.
- `ui` реэкспортирует типы ядра: `CaptionCue`, `Chapter`, `Marker`, `WordCue`, `PlayerEvent`,
  `PlayerSnapshot`, `PlayerStatus`, `VideoQuality`, `PlayerMiddleware`, `PlayerActionRecord`.

---

## 6. `@web-react-player/remotion`

Интеграционный пакет: компиляция TSX в браузере, воспроизведение через Remotion Player,
офлайн-экспорт в MP4/WebM, многослойный звук, виджеты из JSON, адаптеры сценариев и FFmpeg.

### 6.1 Быстрый старт

```tsx
import {
  createDefaultRemotionSuite,
  RemotionProvider,
} from '@web-react-player/remotion';
import { DefaultStandardLayout, PlayerProvider, Root } from '@web-react-player/ui';
import { useState } from 'react';

export function Scene({ title }: { title: string }) {
  return <AbsoluteFill>{title}</AbsoluteFill>;
}

export function App() {
  const [suite] = useState(() => createDefaultRemotionSuite());

  return (
    <PlayerProvider>
      <Root>
        <RemotionProvider
          source={{ type: 'component', component: Scene, inputProps: { title: 'Привет' } }}
          pluginManager={suite.pluginManager}
          compiler={suite.compiler}
        />
        <DefaultStandardLayout />
      </Root>
    </PlayerProvider>
  );
}
```

### 6.2 `createDefaultRemotionSuite(customCss?)`

Фабрика комплекта. Регистрирует плагины и создаёт все подсистемы.

```ts
const { pluginManager, compiler, exporter, widgetRegistry } = createDefaultRemotionSuite();
```

| Возвращает | Тип | Роль |
| :--- | :--- | :--- |
| `pluginManager` | `RemotionPluginManager` | Реестр плагинов |
| `compiler` | `BrowserTsxCompiler` | Компиляция TSX-строк |
| `exporter` | `WebRendererExportEngine` | Офлайн-рендер в MP4/WebM |
| `widgetRegistry` | `WidgetRegistry` | Компиляция и кэш JSON-виджетов |

Плагины по умолчанию: `LucideIconsPlugin`, `TailwindPlugin(customCss)`, `ThreePlugin`,
`AudioMixerPlugin`.

### 6.3 Источники `RemotionSource`

```ts
type RemotionSource =
  | { type: 'component'; component; inputProps?; config? }
  | { type: 'code'; code; assets?; assetBaseUrl?; allowedAssetProtocols?; assetResolver?; virtualModules?; inputProps?; config? }
  | { type: 'widget'; widget: string | VidoraWidgetDefinition; widgetProps?; registry: WidgetRegistry; config? };
```

| Вариант | Когда использовать |
| :--- | :--- |
| `component` | Компонент уже есть в коде приложения. Компиляция не нужна. |
| `code` | Строка TSX: LLM-вывод, редактор, сервер. Требуется компилятор. |
| `widget` | JSON-описание виджета. Компонент компилируется один раз и кэшируется в реестре. |

### 6.4 `BrowserTsxCompiler`

```ts
interface ITsxCompiler {
  compile(
    code: string,
    assets?: Record<string, string>,
    virtualScope?: Record<string, unknown>,
    options?: RemotionCompilerOptions,
  ): Promise<{
    Component: React.ComponentType<Record<string, unknown>>;
    detectedConfig?: Partial<RemotionCompositionConfig>;
  }>;
}
```

**Пайплайн компиляции:**

1. `pluginManager.applySourceTransforms(code)` — плагины могут переписать исходник.
2. Создаётся резолвер ассетов.
3. `sucrase` трансформирует `typescript` + `jsx` + `imports` (`jsxRuntime: 'classic'`, `production: true`).
4. Код выполняется в песочнице `new Function('require', 'exports', 'module', 'React', code)`.
5. Рефлексия экспортов ищет компонент.
6. Извлекается и валидируется конфигурация композиции.

**Виртуальные модули** (порядок разрешения `require`):

| Модуль | Что отдаётся |
| :--- | :--- |
| `react` | Реальный React |
| `remotion` | Реальный Remotion, **но `staticFile` переопределён** на резолвер VFS |
| `@remotion/media` | Реальный `@remotion/media` (нужен для `<Audio />`) |
| модули плагинов | `pluginManager.resolveVirtualModule(name)` — например `lucide-react`, `three` |
| `options.virtualModules` | Пользовательские модули |
| `virtualScope` (3-й аргумент) | Дополнительные модули |
| любой другой | Пустая заглушка `{ __esModule: true, default: {} }` — **без падения** |

> Неизвестный импорт не вызывает ошибку. Если вы ожидаете реальный модуль, проверьте, что
> зарегистрировали плагин или передали модуль через `virtualModules`.

**Рефлексия компонента** ищет экспорт в порядке:
`default` → `Animation` → `Composition` → `Scene` → `MyComp` → первая экспортированная функция.

**Конфигурация** читается из экспорта `config` или `compositionConfig` и валидируется:

| Поле | Правило |
| :--- | :--- |
| `fps` | положительное число |
| `durationInFrames` | положительное число |
| `width` / `height` | положительное число |
| `audioMix` | проходит `validateAudioMixConfig` |

Все найденные поля собираются в `detectedConfig`; поля не передаются, если некорректны
(кроме случаев, когда ошибка критична — тогда бросается исключение).

### 6.5 Виртуальная файловая система (VFS)

`createAssetResolver(assets, options, scopeAssetBaseUrl)` — единая точка разрешения путей
для `staticFile()` и для `audioMix`.

**Порядок разрешения** (первый успех побеждает):

1. Кастомный `options.assetResolver(assetPath, assets)`.
2. Если путь содержит протокол — проверка по белому списку.
3. Поиск в `assets` (сначала с отброшенным ведущим `/`, затем как есть).
4. Склейка с `assetBaseUrl` / `scopeAssetBaseUrl`.
5. Возврат пути как есть.

**Белый список протоколов** по умолчанию:
`http:`, `https:`, `data:`, `blob:`, `vidora-local:`. Расширяется через `allowedAssetProtocols`.

> Протокол вроде `file:` приводит к `RemotionCompilerError` типа `InvalidConfigError`.
> Это защита от чтения локальной файловой системы браузером.

Пример:

```ts
const source = {
  type: 'code' as const,
  code,
  assets: {
    'bg-music.mp3': 'https://cdn.example.com/music.mp3',
    'logo.png': 'https://cdn.example.com/logo.png',
  },
};
```

Внутри TSX: `staticFile('bg-music.mp3')` вернёт полный URL из `assets`.
`resolveAudioMixAssets` прогоняет по тому же резолверу все `src` в `audioMix`; операция идемпотентна —
уже готовые URL (включая `blob:`) не меняются.

### 6.6 Диагностика ошибок

`RemotionCompilerError` расширяет `Error` полями `type` и `suggestion`.

| `type` | Когда | Пример подсказки |
| :--- | :--- | :--- |
| `SyntaxError` | Ошибка трансформации Sucrase | «Проверьте правильность написания тегов, незакрытые скобки…» |
| `RuntimeError` | Ошибка при выполнении песочницы | «Проверьте, не используете ли вы неизвестные глобальные переменные…» |
| `MissingComponentError` | В экспортах нет компонента | «Добавьте компонент и экспортируйте его…» |
| `InvalidConfigError` | Некорректный `config` или `audioMix` | «Укажите относительный путь к файлу, например: src: "bg.mp3"» |

Плагин `WebRendererExportEngine` и адаптер показывают эту диагностику пользователю:
тип ошибки заголовком, сообщение моноширинным блоком, подсказка отдельным блоком.

### 6.7 Плагины

```ts
interface IRemotionPlugin {
  readonly id: string;
  readonly name: string;
  readonly version?: string;
  preflight?: (context: PluginPreflightContext) => Promise<void>;
  resolveImports?: (moduleName: string) => Record<string, unknown> | null | undefined;
  wrapComponent?: (Component, config) => React.ComponentType;
  transformSource?: (code: string) => string;
  onExportProgress?: (progress: ExportProgressData) => void;
  dispose?: () => void;
}
```

| Плагин | `id` | Механизм | Что делает |
| :--- | :--- | :--- | :--- |
| `LucideIconsPlugin` | `remotion-plugin-lucide` | `resolveImports` | Отдаёт иконки `lucide-react`. Несуществующая иконка заменяется на SVG-заглушку вместо падения |
| `TailwindPlugin` | `remotion-plugin-tailwind` | `wrapComponent` | Оборачивает компонент в `<div data-remotion-tailwind-scope>` размером композиции, при необходимости инжектит `<style>` |
| `ThreePlugin` | `remotion-plugin-three` | `resolveImports`, `preflight` | Прокидывает глобальный `THREE` для `three` и `@remotion/three`; `preflight` требует `WebGLRenderingContext`; `dispose` освобождает GPU-ресурсы |
| `AudioMixerPlugin` | `remotion-plugin-audio-mixer` | `wrapComponent` | Наложение аудиодорожек с fade in/out и ducking |

**`RemotionPluginManager`:**

| Метод | Поведение |
| :--- | :--- |
| `register(plugin)` | Регистрирует; при повторном `id` вызывает `dispose` старого экземпляра. Возвращает `this` |
| `unregister(id)` | Снимает плагин и вызывает `dispose`. Возвращает `boolean` |
| `getPlugins()` | Массив всех плагинов в порядке регистрации |
| `resolveVirtualModule(name)` | Первое непустое разрешение от плагинов |
| `runPreflightAll(context)` | Параллельный запуск всех `preflight` |
| `applySourceTransforms(code)` | Последовательное применение `transformSource` |
| `applyComponentWrappers(Component, config)` | Последовательное наложение `wrapComponent` |
| `notifyExportProgress(progress)` | Рассылка прогресса всем плагинам |
| `disposeAll()` | `dispose` для всех и очистка реестра |

> Порядок важен: `wrapComponent` накладываются в порядке регистрации, последний becomes внешним.
> В наборе по умолчанию порядок — `Lucide` → `Tailwind` → `Three` → `AudioMixer`,
> поэтому `AudioMixerWrapper` — внешний слой, а Tailwind-скоуп находится под ним.

### 6.8 `AudioMixerPlugin` и `audioMix`

Нейросеть или пользователь описывает **только** звук в конфиге, вся покадровая математика —
в плагине.

```ts
interface AudioMixConfig {
  voiceover?: BaseAudioTrack;
  music?: AudioTrackMusic[];
  sfx?: AudioTrackSFX[];
}

interface BaseAudioTrack {
  src: string;
  volume?: number;          // 0..1
  // Позиционирование на таймлайне
  startFrom?: number;       // кадр начала (по умолчанию 0)
  endAt?: number;           // кадр окончания
  durationFrames?: number;  // длительность на таймлайне
  // Обрезка самого файла
  trimStartFrames?: number;
  trimEndFrames?: number;
}

interface AudioTrackMusic extends BaseAudioTrack {
  loop?: boolean;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  ducking?: boolean;        // авто-приглушение под голос диктора
}
```

Правила таймлайна:

- Начало: `max(0, startFrom ?? 0)`.
- Конец: `startFrom + durationFrames` → `endAt` → длительность композиции (что задано раньше),
  затем клампится в длительность композиции.
- Если не задано ни `durationFrames`, ни `endAt`, дорожка звучит до конца композиции.

Ducking (только для музыки при `ducking: true` и наличии `voiceover`):
приглушение до `0.15` в окне речи, плавный переход за 15 кадров в каждую сторону.

Premount: все дорожки получают `premountFor={30}` — это исключает буферизацию на старте дорожки.

Fast-path: если в `audioMix` нет дорожек, компонент возвращается **без обёртки**.

Валидация `audioMix` (`validateAudioMixConfig`) ловит опечатки до рендера:
`src` обязателен и непустой, кадровые поля — неотрицательные числа, `endAt >= startFrom`,
`music` и `sfx` — массивы.

### 6.9 Экспорт `WebRendererExportEngine`

```ts
const result = await suite.exporter.exportMedia(Component, config, inputProps, {
  format: 'mp4',
  quality: 'high',
  onProgress: ({ progress, renderedFrames, totalFrames, encodedFrames }) => { /* ... */ },
});

result.download('my-video.mp4');
```

`canExport(config)` проверяет среду:

| Проверка | Результат |
| :--- | :--- |
| `typeof window === 'undefined'` | `{ canRender: false, reason: 'SSR environment not supported' }` |
| `canRenderMediaOnWeb` из `@remotion/web-renderer` | Реальная проверка целевого разрешения |
| Fallback | `'VideoEncoder' in window` |

`getAvailableCodecs()` возвращает кодеки для контейнера `mp4`; при недоступности — `['h264']`.

**Пресеты качества** (явные `videoBitrate` / `audioBitrate` имеют приоритет):

| Пресет | Видео | Аудио |
| :--- | :--- | :--- |
| `draft` | 1 000 000 bps (≈1 Mbps) | 64 000 bps |
| `standard` | `width × height × fps × 0.1` | 128 000 bps |
| `high` | 15 000 000 bps | 320 000 bps |

Результат `ExportResult`: `blob`, `buffer`, `url` (object URL) и `download(fileName?)`.
Рендер идёт в браузере; для офлайн-рендера на сервере есть `VidoraFFmpegService`.

### 6.10 Виджеты

Виджет — JSON-описание компонента с TSX-кодом, которое можно загрузить и отрендерить без
перекомпиляции при каждом движении слайдера.

```ts
interface VidoraWidgetDefinition {
  id: string;
  name: string;
  category?: string;
  description?: string;
  tsx_code: string;                 // обязательное
  props?: VidoraWidgetProp[];       // JSON-схема пропов
  default_props?: Record<string, unknown>;
  tags?: string[];
  example_snippet?: string;
  import_path?: string;
  is_custom?: boolean;
}

interface VidoraWidgetProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object';
  required?: boolean;
  default?: unknown;
  enum_values?: string[];
  description?: string;
}
```

**`WidgetRegistry`:**

| Метод | Поведение |
| :--- | :--- |
| `register(input)` | Принимает `VidoraWidgetPackage`, `VidoraWidgetDefinition` или JSON-строку. Возвращает массив зарегистрированных виджетов |
| `get(id)` / `getAll()` / `getByCategory(c)` | Доступ к определениям |
| `compile(idOrWidget)` | Компилирует **один раз** и кэширует компонент. В `virtualScope` передаётся `{ WIDGET_ID }` |
| `normalizeProps(idOrWidget, props)` | Нормализует пропсы через `WidgetPropsEngine` |
| `getWidgetConfig(idOrWidget, props)` | Выводит конфигурацию композиции из пропов и тегов |
| `clearCache()` | Сброс кэша компонентов |

**Инвалидация кэша:** если при повторной регистрации виджета с тем же `id` изменился `tsx_code`,
скомпилированный компонент выбрасывается и компилируется заново.

**`WidgetPropsEngine.normalizeProps`** (порядок слияния):

1. `default_props` виджета.
2. Дефолты из схемы `props` для ещё не заданных полей.
3. Пользовательские overrides с приведением типов.

Приведение типов: `number` → `Number()` с откатом на дефолт; `boolean` → `true`/`'true'`/`'1'`/`1`;
`enum` → строка с проверкой по `enum_values` (иначе дефолт); `object` → `JSON.parse` для строк.

**`deriveCompositionConfig`** выводит разрешение из признака вертикального видео
(`id` содержит `9x16` или теги `9:16`, `shorts`, `reels`, `tiktok`):

| Формат | Разрешение | fps | Длительность |
| :--- | :--- | :--- | :--- |
| Горизонтальный | 1920 × 1080 | 30 | `props.durationFrames` → `default_props.durationFrames` → `300` |
| Вертикальный | 1080 × 1920 | 30 | то же |

### 6.11 `RemotionProvider` и `RemotionPlaybackAdapter`

`RemotionProvider` — мост между FSM из `ui` и Remotion Player.

```ts
interface RemotionProviderProps {
  source: RemotionSource;
  config?: RemotionCompositionConfig;
  pluginManager: RemotionPluginManager;
  compiler: ITsxCompiler;
  style?: React.CSSProperties;
  className?: string;
}
```

**Что делает провайдер:**

| Действие | Отправка в FSM |
| :--- | :--- |
| Смена источника (один раз на источник) | `LOAD` с `src: 'remotion://code' \| 'remotion://widget' \| 'remotion://component'` |
| Обновление кадра | `TIME_UPDATE` с `frame / fps` |
| Метаданные готовы | `METADATA_LOADED(duration, fps)`, затем `CAN_PLAY` |
| Старт / пауза | `PLAYING` / `PAUSE` |
| Ошибка | `ERROR` |

> Ключ источника для `LOAD`: `'component'`, `code:${code}` или `widget:${id}`.
> Изменение `widgetProps` **не** вызывает повторный `LOAD` — иначе инспектор сбрасывал бы
> время и длительность при каждом движении слайдера.

**`RemotionPlaybackAdapter`** содержит всю логику:

*Фазы рендера:*

1. **Компиляция** — вычисляется ключ (`component`, `code:${code}` или `widget:${id}:${tsx_code}`).
   Пока компилируется — экран `Compiling TSX Engine...`.
2. **Слияние конфигурации.** Приоритет (снизу вверх):
   `DEFAULT_CONFIG (150 / 30 / 1920×1080)` → `detectedConfig` или конфиг виджета → `source.config`.
   Затем `audioMix` прогоняется через VFS-резолвер.
3. **Обёртка плагинами** — `pluginManager.applyComponentWrappers`.
4. **Синхронизация**: `fsmStatus` → `play()`/`pause()`; `currentTime` → `seekTo` (если разница
   больше 1 кадра); `muted`/`volume` → `mute()`/`unmute()`/`setVolume()`.
5. **Подписки:** `frameupdate` → `TIME_UPDATE`, `play` → `PLAYING`, `pause` → `PAUSE`.
6. **Ошибки** — свой DX-экран с типом, сообщением и подсказкой; React Error Boundary ловит
   рантайм-ошибки внутри Remotion Player.

Защита от петли обратной связи: флаг `isInternalSeeking` сбрасывается в `requestAnimationFrame`
после `frameupdate`, поэтому seek от плеера не вызывает повторный `seekTo`.

Контейнер адаптера помечен `data-media-provider="remotion"` (у `<video>` — пустое значение
`data-media-provider`).

### 6.12 `ScenarioAdapter`

Парсер Markdown-сценария Vidora.

```ts
const data = parseScenario(markdown, whisperXData, { duration: 120, markers: [] });
// { title, chapters, captions, markers }
```

Разметка сценария:

```markdown
---
title: Мой ролик
duration: 95
---

## [00:00] Вступление
## [00:12 - 00:40] Основная часть
## 1:05 Финал
```

- Frontmatter разбирается в плоский словарь `ключ: значение`; значение снимается с кавычек.
- Заголовок главы: `## [время] Заголовок` или `## время - Заголовок`. Время: `12`, `1:05`, `1:02:03`,
  запятая как десятичный разделитель допускается.
- Главы сортируются по времени. Конец главы = начало следующей, иначе `duration`, иначе `Infinity`.
- `duration` берётся из `options.duration`, затем из frontmatter `duration` / `durationSeconds`.
- Заголовок по умолчанию — `Vidora Project`.
- Субтитры принимаются в двух форматах: `CaptionCue` (`startTime`) и `WhisperCaptionCue`
  (`start`/`end`, опционально `words`). Формат определяется наличием поля `startTime`.
- Маркеры берутся из `options.markers`.

Дополнительно: `scenarioTimeToSeconds(value)`, объект-синоним `ScenarioAdapter`
с методами `parse` и `timeToSeconds`.

### 6.13 `VidoraFFmpegService`

Клиент серверного FFmpeg-рендера с прогрессом по SSE.

```ts
const service = new VidoraFFmpegService({ apiUrl: 'http://localhost:8355/api/v1/render' });

const downloadUrl = await service.startPipeline(
  'scenario-42',
  { lufsTarget: -14, applyNoiseGate: true, removeSilence: false, videoQuality: 'high' },
  (progress) => console.log(progress.status, progress.progress),
);
```

Поведение:

1. `POST {apiUrl}/start` с `{ scenarioId, config }` → принимает `jobId` (или `id`).
2. Открывает `EventSource` на `{apiUrl}/progress/{jobId}`.
3. Разбирает SSE-события, нормализует прогресс и вызывает `onProgress`.
4. `status: 'error'` → промис отклоняется с `message`.
5. `status: 'completed'` → промис резолвится в `downloadUrl` (принимается и `download_url`).
6. `onerror` потока → отклонение.

`cancel(jobId)` вызывает `DELETE {apiUrl}/jobs/{jobId}`; ответ `404` считается успехом
(задача уже завершена).

Все зависимости инъецируются: `fetch`, `createEventSource`, `headers`, `signal` — это делает
сервис полностью тестируемым без сети.

Значения по умолчанию: `apiUrl = 'http://localhost:8355/api/v1/render'`, автоподстановка
`Content-Type: application/json`, клампинг прогресса в `0..1`, нормализация счётчиков кадров.

---

## 7. Приложения

### 7.1 `apps/playground`

Пять независимых демо на Vite + React 19 (порт `5173`).

| Вкладка | Что показывает |
| :--- | :--- |
| **Widget Studio (JSON)** | Загрузка JSON-пакета виджетов, инспектор пропов, живое обновление без перекомпиляции |
| **Hybrid JSON+TSX** | Комбинация готовых виджетов и TSX-сцен в одном сценарии |
| **Audio Mixer Test** | Многодорожечный звук: голос, музыка, эффекты, fade, ducking |
| **Remotion Engine** | TSX-код + VFS-ассеты + экспорт в MP4 с выбором качества |
| **HTML5 Native** | Нативное видео с главами, маркерами и субтитрами |

Демо Remotion показывает ключевой момент: `<Audio />` из `@remotion/media` вместе с `<Img />`
позволяет экспортировать звук в MP4, а VFS (`assets`) разрешает относительные пути в ссылки.

```bash
pnpm dev:app          # из корня
pnpm --filter playground dev
```

### 7.2 `apps/vidora-mini`

Fullstack-приложение: React/Vite фронтенд с караоке-субтитрами и **настоящий** FFmpeg на
бэкенде с прогрессом через SSE.

**Структура:**

```text
apps/vidora-mini/
├── start.ps1                 # запуск обоих сервисов одной командой
├── backend/
│   ├── main.py               # FastAPI + FFmpeg
│   ├── requirements.txt
│   └── media/                # тестовое видео и готовые рендеры
└── frontend/
    ├── src/App.tsx
    ├── src/KaraokeCaptions.tsx
    ├── src/ScenarioUtils.ts
    ├── src/VidoraFFmpegService.ts
    └── tailwind.config.cjs
```

**API бэкенда:**

| Метод | Путь | Назначение |
| :--- | :--- | :--- |
| `POST` | `/api/v1/render/start` | Принимает `scenarioId` и конфиг фильтров, создаёт задачу, возвращает `jobId` |
| `GET` | `/api/v1/render/progress/{jobId}` | Запускает FFmpeg и отдаёт прогресс через `text/event-stream` |
| `DELETE` | `/api/v1/render/jobs/{jobId}` | Отменяет задачу |
| `GET` | `/media/*` | Раздача тестового видео и готовых рендеров |
| `GET` | `/docs` | Swagger UI |

Фильтры конфигурации: `lufsNormalizer` (`loudnorm=I=-14:LRA=11:TP=-1.5`), `reverb` (`aecho`),
`grayscale`, `blur`. CORS разрешён для `http://localhost:5174` и `http://127.0.0.1:5174`.
Бинарники FFmpeg переопределяются через `FFMPEG_BINARY` / `FFPROBE_BINARY`.

При первом запуске бэкенд скачивает тестовое видео; при недоступности `ffmpeg`/`ffprobe`
ошибка возвращается в SSE-потоке.

**Запуск:**

```bash
# 1. Зависимости монорепозитория
pnpm install

# 2. Бэкенд
cd apps/vidora-mini/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8355

# 3. Фронтенд (из корня репозитория)
pnpm --filter vidora-tester dev     # http://localhost:5174
```

Либо одной командой из PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\vidora-mini\start.ps1
# с установкой зависимостей:
powershell -ExecutionPolicy Bypass -File .\apps\vidora-mini\start.ps1 -Install
```

**Требования:** Node.js `20.19+` или `22.12+`, pnpm `12.4.2`, Python `3.10+`,
FFmpeg и ffprobe в `PATH`, доступ в интернет для первичной загрузки тестового видео.

---

## 8. Инструменты качества и команды

### 8.1 Скрипты корня

| Скрипт | Назначение |
| :--- | :--- |
| `pnpm dev` | Параллельный watch-сборка всех пакетов |
| `pnpm dev:app` | Запуск playground |
| `pnpm build` | Сборка всех пакетов |
| `pnpm build:app` | Продакшен-сборка playground |
| `pnpm typecheck` | `tsc --noEmit` во всех пакетах |
| `pnpm clean` | Удаление всех `dist` |
| `pnpm lint` / `pnpm lint:fix` | Biome: проверка / автоисправление |
| `pnpm test` | Vitest во всех пакетах |
| `pnpm test:mutation` | Stryker: мутационное тестирование |
| `pnpm check:knip` | Поиск мёртвого кода и лишних зависимостей |
| `pnpm check:syncpack` / `fix:syncpack` | Синхронизация версий зависимостей |
| `pnpm check:deps` | Архитектурные границы (dependency-cruiser) |
| `pnpm check:security` | Аудит зависимостей (Socket) |
| `pnpm check:publint` | Валидация `package.json` и `exports` |
| `pnpm check:attw` | Проверка резолва типов (ESM-only) |
| `pnpm check:size` | Лимиты размера бандла |
| `pnpm api:check` / `api:update` | Слепок публичного API (API Extractor) |
| `pnpm check:packages` | Полный предрелизный аудит: build + publint + attw + size + api |
| `pnpm docs:api` | Генерация Markdown-документации (TypeDoc). Требует предварительной `pnpm build` |
| `pnpm repomix` и варианты | Упаковка кода в XML для ИИ-контекста |
| `pnpm changeset` | Создание записи об изменении |
| `pnpm version-packages` | Поднятие версий |
| `pnpm release` | Сборка и публикация |

### 8.2 Контроль качества

| Инструмент | Роль |
| :--- | :--- |
| **Biome** | Линтер и форматтер (замена ESLint + Prettier) |
| **TypeScript 5.8+** | Строгая типизация, `exactOptionalPropertyTypes` |
| **ts-reset** | Убирает «дыры» типов (`JSON.parse` → `unknown`) |
| **Vitest** | Юнит-тесты |
| **Stryker** | Мутационное тестирование |
| **API Extractor** | Защита от ломающих изменений API через `etc/*.api.md` |
| **Publint / ATTW** | Стандарты npm и корректность типов |
| **Size Limit** | Бюджет размера бандлов |
| **Knip** | Мёртвый код |
| **Syncpack** | Единые версии зависимостей |
| **Dependency Cruiser** | Запрет циклов и утечек между слоями |
| **Socket.dev** | Уязвимости и вредоносный код |
| **TypeDoc** | Markdown-документация API по собранным `.d.ts` |
| **Changesets** | Версионирование и changelog |
| **Husky + lint-staged + Commitlint** | Pre-commit и Conventional Commits |

### 8.3 Правила коммитов

```text
type(scope): description
```

Разрешённые типы: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`.

Обязательные правила: строчная буква после двоеточия, английский язык, без точки в конце.
Пример: `feat(core): add playback rate controls to fsm`.

---

## 9. Тестирование

### 9.1 `packages/core/tests/machine.test.ts`

| Тест | Проверяет |
| :--- | :--- |
| 1 | Начальный статус `idle` и значения контекста по умолчанию |
| 2 | Переходы `idle → loading → ready → playing → paused`, вычисление `durationInFrames` |
| 3 | Активная глава и маркер при `TIME_UPDATE` |
| 4 | Перехват событий middleware-конвейером |

### 9.2 `packages/ui/tests/ui.test.ts`

| Тест | Проверяет |
| :--- | :--- |
| 1 | `formatTime`: `0 → 00:00`, `65 → 01:05`, `3665 → 1:01:05`, отрицательные → `00:00` |
| 2 | `hexToRgba` |
| 3 | `captionStylesToCssVariables` (включая перевод `150 %` в `23px`) |
| 4 | `getContainerTier` для всех брейкпоинтов |

### 9.3 `packages/remotion/tests/suite.test.ts`

| Группа | Проверяет |
| :--- | :--- |
| `createDefaultRemotionSuite` | Связанность подсистем и набор встроенных плагинов |
| `BrowserTsxCompiler` | Компиляцию валидного TSX, извлечение `config`, подстановку ассетов из VFS, заглушку для неизвестного модуля |
| Диагностика | `SyntaxError`, `MissingComponentError`, отказ для некорректного `audioMix`, отказ для запрещённого протокола `file:` |

```bash
pnpm test                                   # все пакеты
pnpm --filter @web-react-player/core test   # один пакет
```

---

## 10. Релиз и SemVer

1. Ветка от актуального `main`, разработка, `pnpm check:packages`.
2. `pnpm changeset` — выбрать пакеты и уровень: `patch` (багфикс), `minor` (новая функциональность),
   `major` (ломающее изменение).
3. Коммит по Conventional Commits.
4. PR в `main` → CI (`ci.yml`) и security-скан (`security.yml`).
5. Merge → бот Changesets создаёт PR «chore: release packages» → версии и changelog обновляются.
6. Merge релизного PR → `pnpm build` и публикация в npm.

Слепки публичного API лежат в `packages/*/etc/*.api.md`. При намеренном изменении API
выполните `pnpm api:update` и проверьте `git diff`: ничего не должно исчезнуть из экспортов.

---

## 11. Готовые рецепты интеграции

### 11.1 Минимальный HTML5-плеер

```tsx
import {
  type CaptionCue,
  type Chapter,
  DefaultStandardLayout,
  Html5VideoProvider,
  PlayerProvider,
  Root,
} from '@web-react-player/ui';

const CHAPTERS: Chapter[] = [
  { title: 'Intro', startTime: 0, endTime: 33 },
  { title: 'Main', startTime: 33, endTime: 156 },
];

const CAPTIONS: CaptionCue[] = [
  { startTime: 2, endTime: 6, text: 'The Blender Foundation presents...' },
];

export function App() {
  return (
    <PlayerProvider initialChapters={CHAPTERS} initialCaptions={CAPTIONS}>
      <div style={{ aspectRatio: '16 / 9', position: 'relative' }}>
        <Root>
          <Html5VideoProvider src="https://example.com/movie.mp4" crossOrigin="anonymous" />
          <DefaultStandardLayout />
        </Root>
      </div>
    </PlayerProvider>
  );
}
```

### 11.2 Кастомная раскладка из примитивов

```tsx
import {
  CaptionCustomizer,
  Captions,
  Match,
  PlayButton,
  Root,
  TimeDisplay,
  TimeSlider,
  usePlayerState,
  VolumeControl,
} from '@web-react-player/ui';

function MinimalControls() {
  const [customizerOpen, setCustomizerOpen] = useState(false);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'auto' }}>
        <TimeSlider />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <PlayButton />
          <VolumeControl />
          <TimeDisplay type="current" />
          <span style={{ flex: 1 }} />
          {/* Полный набор кнопок только на широком плеере */}
          <Match media="lg">
            <button type="button" onClick={() => setCustomizerOpen(true)}>
              CC
            </button>
          </Match>
        </div>
      </div>
      <Captions />
      {customizerOpen && <CaptionCustomizer isOpen onClose={() => setCustomizerOpen(false)} />}
    </div>
  );
}
```

### 11.3 Кастомные сочетания клавиш

```tsx
import { Root, usePlayerContext } from '@web-react-player/ui';

function Toolbar() {
  const { actions } = usePlayerContext();

  return (
    <Root
      hotkeys={{
        'Shift+ArrowRight': (ctx) => ctx.actions.seekRelative(30),
        p: 'togglePlay',
        z: { keys: ['Zoom+', 'Equal'], handler: (ctx) => ctx.actions.setVolume(0.5) },
      }}
    >
      {/* ... */}
    </Root>
  );
}
```

### 11.4 Сборка всего: главы + субтитры + маркеры + качество

```tsx
<PlayerProvider
  initialChapters={[
    { title: 'Вступление', startTime: 0, endTime: 40 },
    { title: 'Основная часть', startTime: 40, endTime: 210 },
  ]}
  initialMarkers={[
    { type: 'sponsor', startTime: 12, endTime: 30, label: 'Реклама' },
    { type: 'highlight', startTime: 90, endTime: 120, label: 'Ключевой момент' },
  ]}
  initialCaptions={[
    { startTime: 0, endTime: 3.5, text: 'Привет! Это пример субтитра.', words: [
      { word: 'Привет', start: 0, end: 0.6 },
      { word: 'Это', start: 0.7, end: 0.9 },
    ] },
  ]}
  initialQualities={[
    { id: '1080p', height: 1080, label: '1080p', src: 'https://example.com/movie-1080.mp4' },
    { id: '720p', height: 720, label: '720p', src: 'https://example.com/movie-720.mp4' },
  ]}
>
  {/* ... */}
</PlayerProvider>
```

### 11.5 Remotion: TSX из строки с ассетами и звуком

```ts
const code = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { Audio } from '@remotion/media';

export const config = {
  durationInFrames: 240,
  fps: 30,
  width: 1280,
  height: 720,
  audioMix: {
    voiceover: { src: 'voice.mp3', startFrom: 0, volume: 1 },
    music: [{ src: 'music.mp3', volume: 0.4, fadeInFrames: 20, fadeOutFrames: 30, ducking: true }],
  },
};

export const MyScene = () => (
  <AbsoluteFill>
    <Audio src={staticFile('music.mp3')} />
    <div style={{ color: 'white', fontSize: 64 }}>Frame {useCurrentFrame()}</div>
  </AbsoluteFill>
);
`;

const { Component, detectedConfig } = await suite.compiler.compile(code, {
  'voice.mp3': 'https://cdn.example.com/voice.mp3',
  'music.mp3': 'https://cdn.example.com/music.mp3',
});

const result = await suite.exporter.exportMedia(
  Component,
  { durationInFrames: 240, fps: 30, width: 1280, height: 720, ...detectedConfig },
  {},
  { format: 'mp4', quality: 'high', onProgress: ({ progress }) => console.log(Math.round(progress * 100)) },
);
result.download('scene.mp4');
```

### 11.6 Remotion: JSON-виджет с инспектором пропов

```ts
const registry = suite.widgetRegistry;
registry.register({
  id: 'lower-third-9x16',
  name: 'Lower Third (vertical)',
  tags: ['9:16', 'shorts'],
  default_props: { title: 'Заголовок', durationFrames: 90 },
  props: [
    { name: 'title', type: 'string', default: 'Заголовок' },
    { name: 'accent', type: 'enum', enum_values: ['blue', 'red'], default: 'blue' },
    { name: 'durationFrames', type: 'number', default: 90 },
  ],
  tsx_code: `
    import React from 'react';
    import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
    export const Scene = ({ title, accent }) => {
      const frame = useCurrentFrame();
      const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
      return (
        <AbsoluteFill style={{ justifyContent: 'flex-end', opacity }}>
          <div style={{ background: accent, padding: 24, color: '#fff' }}>{title}</div>
        </AbsoluteFill>
      );
    };
  `,
});

// Пропсы меняются каждый кадр — перекомпиляции не будет.
<RemotionProvider
  source={{ type: 'widget', widget: 'lower-third-9x16', widgetProps, registry }}
  pluginManager={suite.pluginManager}
  compiler={suite.compiler}
/>
```

### 11.7 Собственный плагин Remotion

```ts
import type { IRemotionPlugin, RemotionCompositionConfig } from '@web-react-player/remotion';
import type React from 'react';

export class WatermarkPlugin implements IRemotionPlugin {
  readonly id = 'my-watermark';
  readonly name = 'Watermark';

  wrapComponent(
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
  ) {
    return function WithWatermark(props: Record<string, unknown>) {
      return (
        <div style={{ position: 'relative', width: config.width, height: config.height }}>
          <Component {...props} />
          <div
            style={{
              position: 'absolute', right: 16, bottom: 16,
              color: 'rgba(255,255,255,0.5)', fontSize: 20,
            }}
          >
            © 2026
          </div>
        </div>
      );
    };
  }
}

suite.pluginManager.register(new WatermarkPlugin());
```

Порядок регистрации определяет вложенность обёрток: зарегистрированный позже становится внешним.

### 11.8 Доступ к состоянию из своего компонента

```tsx
import { usePlayerState } from '@web-react-player/ui';

function DebugOverlay() {
  const status = usePlayerState((s) => s.status);
  const currentTime = usePlayerState((s) => s.context.currentTime);
  const activeChapter = usePlayerState((s) => s.context.activeChapter);

  return (
    <div>
      {status} · {currentTime.toFixed(2)}с · {activeChapter?.title ?? '—'}
    </div>
  );
}
```

### 11.9 Отправка событий напрямую

```tsx
import { usePlayerContext } from '@web-react-player/ui';

function JumpToChapter() {
  const { send, state } = usePlayerContext();

  return (
    <button
      type="button"
      onClick={() => {
        const chapter = state.context.chapters[1];
        if (chapter) send({ type: 'TIME_UPDATE', currentTime: chapter.startTime });
      }}
    >
      Ко второй главе
    </button>
  );
}
```

### 11.10 Middleware: авто-лог аналитики

```ts
import { createPlayerMachine, type PlayerEvent } from '@web-react-player/core';

const machine = createPlayerMachine();

machine.use((event: PlayerEvent, _snapshot, next) => {
  if (event.type === 'ACTION_TRIGGERED') {
    console.debug('[player]', event.action.type, event.action.value);
  }
  next(event);
});
```

В React-приложении удобнее передать middleware в `PlayerProvider` при создании машины
или обернуть `send` собственной функцией.

### 11.11 Парсинг сценария Vidora

```ts
import { parseScenario } from '@web-react-player/remotion';

const data = parseScenario(markdown, whisperCues, {
  markers: [{ type: 'highlight', startTime: 30, endTime: 45, label: 'Ключевой момент' }],
});
```

---

## 12. Важные нюансы реализации

1. **Интервалы глав и маркеров полуоткрытые, субтитры — закрытые.** При совпадении границ
   соседние главы не конфликтуют, а последний кадр субтитра не пропадает.

2. **Машина уведомляет только при реальном изменении.** Сравнивается явный список полей
   контекста. Новое поле без добавления в этот список не вызовет ререндер.

3. **`PlayerProvider` возвращает `null` до гидратации.** Это исключает расхождение
   серверного и клиентского рендера, но требует, чтобы контейнер плеера уже существовал.

4. **`usePlayerState` требует стабильного селектора.** Создавайте селектор вне рендера
   или возвращайте примитивное значение, иначе подписка будет пересоздаваться каждый кадр.

5. **AudioBoost держит `video.volume = 1`.** Иначе усиление выше 100 % обрезалось бы
   нативным элементом. Если Web Audio недоступен, громкость ограничивается 100 %.

6. **Горячие клавиши игнорируют поля ввода и кнопки.** Это сохраняет нативное поведение
   форм и `Space`/`Enter` на кнопках.

7. **Неизвестный импорт в TSX не роняет компиляцию** — подставляется пустая заглушка.
   Если модуль нужен реально, регистрируйте плагин или передавайте `virtualModules`.

8. **Белый список протоколов ассетов** защищает от `file://` и других схем. Расширяйте
   его осознанно через `allowedAssetProtocols`.

9. **Точность `seek` — один кадр.** Адаптер не вызывает `seekTo`, если разница меньше
   кадра, и подавляет обратную связь флагом `isInternalSeeking`.

10. **Изменение пропов виджета не перекомпилирует компонент.** Ключ компиляции включает
    `id` и `tsx_code`, но не `widgetProps`. Смена самого `tsx_code` инвалидирует кэш.

11. **`exactOptionalPropertyTypes` включён.** Опциональные поля нельзя передавать
    как `undefined` — используйте условный spread.

12. **`typedoc` требует собранные `dist/*.d.ts`.** Он использует `entryPointStrategy: "packages"`,
    то есть читает `exports` из `package.json` каждого пакета, а не исходники. Без предварительной
    `pnpm build` генерация завершается «успешно», но создаёт пустые страницы. Пакет `remotion`
    включён в `entryPoints` наравне с `core` и `ui`.

13. **`docs/api/` не версионируется** (запись в `.gitignore`). Документация собирается на месте
    командой `pnpm build && pnpm docs:api`, поэтому ссылка на неё в `README.md` не должна
    использоваться как обязательная.

---

## Приложение: соответствие API и реализации

| Что документировано | Источник истины |
| :--- | :--- |
| Статусы, события, контекст | `packages/core/src/fsm/types.ts` |
| Переходы, middleware, инвалидация снапшота | `packages/core/src/fsm/machine.ts` |
| Провайдер, действия, адаптивность, персистентность | `packages/ui/src/context/PlayerContext.tsx` |
| Контейнер, data-атрибуты, CSS-переменные | `packages/ui/src/primitives/Root.tsx` |
| Клавиатура и приоритеты привязок | `packages/ui/src/hotkeys/{defaultHotkeys,dispatcher}.ts` |
| Стили субтитров и `localStorage` | `packages/ui/src/captions/{types,utils}.ts` |
| Публичный экспорт UI | `packages/ui/src/index.ts` |
| Компиляция TSX, VFS, ошибки | `packages/remotion/src/compiler/*` |
| Аудиомикшер | `packages/remotion/src/plugins/AudioMixerPlugin.tsx` |
| Экспорт и битрейты | `packages/remotion/src/exporter/WebRendererExportEngine.ts` |
| Виджеты и вывод конфигурации | `packages/remotion/src/widgets/*` |
| Мост FSM ↔ Remotion | `packages/remotion/src/{providers,adapter}/*` |
| Сценарии и FFmpeg | `packages/remotion/src/adapters/*` |
| Эндпоинты бэкенда | `apps/vidora-mini/backend/main.py` |
| Поведение, зафиксированное тестами | `packages/*/tests/*.test.ts` |
