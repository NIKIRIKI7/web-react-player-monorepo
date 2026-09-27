# @web-react-player/core

> Независимое и изолированное ядро конечного автомата (Finite State Machine) для воспроизведения мультимедиа: чистое управление состоянием, таймлайном, главами, субтитрами, маркерами и качеством без внешних зависимостей.

[![npm version](https://img.shields.io/npm/v/@web-react-player/core.svg?style=flat-square)](https://www.npmjs.com/package/@web-react-player/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg?style=flat-square)](https://bundlephobia.com/package/@web-react-player/core)
[![Tree Shaking](https://img.shields.io/badge/tree--shaking-supported-brightgreen.svg?style=flat-square)](https://webpack.js.org/guides/tree-shaking/)

---

## Особенности

- **Zero Dependencies:** абсолютная независимость от фреймворков и DOM-окружения. Работает в браузере, Node.js и Web Worker.
- **Единый источник правды:** клики, горячие клавиши, жесты и нативные события медиа-элементов сходятся в один поток событий, поэтому программный вызов действия вызывает те же эффекты, что и физическое нажатие.
- **Строгий FSM:** защита от невозможных переходов (`idle` → `loading` → `ready` → `playing` / `paused` / `buffering` → `ended` / `error`).
- **Синхронизация по времени:** автоматический расчёт активных глав (`activeChapter`), субтитров (`activeCue`) и маркеров (`activeMarker`) на каждом тике времени.
- **Пайплайн Middleware:** перехват, модификация или подавление событий автомата через `machine.use(...)`.
- **Селективная подписка:** `subscribe()` уведомляет подписчиков только при фактическом изменении статуса или отслеживаемых полей контекста.

---

## Установка

```bash
# pnpm
pnpm add @web-react-player/core

# npm
npm install @web-react-player/core

# yarn
yarn add @web-react-player/core
```

---

## Быстрый старт

```ts
import { createPlayerMachine } from '@web-react-player/core';

// 1. Изолированный экземпляр автомата
const machine = createPlayerMachine();

// 2. Подписка на снимок состояния
const unsubscribe = machine.subscribe((snapshot) => {
  console.log(`Статус: ${snapshot.status}, Время: ${snapshot.context.currentTime}s`);
  if (snapshot.context.activeChapter) {
    console.log(`Текущая глава: ${snapshot.context.activeChapter.title}`);
  }
});

// 3. Отправка событий
machine.send({
  type: 'LOAD',
  src: 'https://example.com/video.mp4',
  chapters: [
    { title: 'Интро', startTime: 0, endTime: 30 },
    { title: 'Основная часть', startTime: 30, endTime: 120 },
  ],
});

machine.send({ type: 'METADATA_LOADED', duration: 120, fps: 30 });
machine.send({ type: 'CAN_PLAY' });
machine.send({ type: 'PLAY' });
machine.send({ type: 'TIME_UPDATE', currentTime: 45 });

// 4. Отписка
unsubscribe();
```

---

## Модель состояния

Всё состояние описано одним снимком:

```ts
interface PlayerSnapshot {
  status: PlayerStatus;
  context: PlayerContext;
}
```

`status` — конечное число состояний, `context` — плоские данные плеера. Компонент читает
только снимок и не знает, как он получился.

```ts
type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';
```

### Переходы

| Из | Событие | В |
| --- | --- | --- |
| `idle` | `LOAD` | `loading` |
| `idle` | `METADATA_LOADED`, `CAN_PLAY` | `ready` |
| `idle` | `PLAY`, `PLAYING` | `playing` |
| `loading` | `METADATA_LOADED`, `CAN_PLAY` | `ready` |
| `loading` | `PLAY`, `PLAYING` | `playing` |
| `ready`, `paused`, `ended` | `PLAY` | `playing` |
| `ready`, `paused`, `ended` | `SMART_RESUME` (если была smart-пауза) | `playing` |
| `playing` | `PAUSE`, `SMART_PAUSE` | `paused` |
| `playing` | `WAITING` | `buffering` |
| `playing` | `ENDED` | `ended` |
| `buffering` | `CAN_PLAY`, `PLAYING` | `playing` |
| `buffering` | `PAUSE` | `paused` |
| любое | `ERROR` | `error` |
| любое | `RESET` | `idle` + сброс контекста |

Неописанное в таблице событие не меняет статус. Переход в `SMART_RESUME` срабатывает, только
если ранее пришло `SMART_PAUSE` — иначе событие игнорируется, чтобы не перезапускать видео,
которое пользователь поставил на паузу вручную.

Интервалы глав, субтитров и маркеров полуоткрытые: активна сущность, у которой
`startTime <= time < endTime`.

### Единый источник правды

Автомат — единственное место, где живёт состояние плеера. Клики в UI, горячие клавиши,
жесты и нативные события медиа-элементов сводятся в один поток событий, поэтому
программный вызов действия вызывает ровно те же эффекты, что и физическое нажатие:

```ts
// Оба варианта проходят через один и тот же конвейер middleware и редьюсер.
machine.send({ type: 'PLAY' });
machine.send({ type: 'ACTION_TRIGGERED', action: { type: 'play', value: '▶', timestamp: Date.now() } });
```

События, не описанные в таблице, не меняют статус, но могут обновить контекст — например
`TIME_UPDATE` пересчитывает `activeChapter`, `activeCue` и `activeMarker` на каждом тике.

### Умная пауза и возврат

`SMART_PAUSE` запоминает причину (`'visibility'` или `'intersection'`) в
`context.smartPauseReason`, а `SMART_RESUME` переводит автомат в `playing` только если эта
причина действительно была. Это защищает от случайного запуска видео, которое
пользователь поставил на паузу вручную:

```ts
machine.send({ type: 'SMART_PAUSE', reason: 'visibility' });
// ...вкладка снова видна...
machine.send({ type: 'SMART_RESUME' }); // -> playing

machine.send({ type: 'PAUSE' });          // обычная пауза, reason не записан
machine.send({ type: 'SMART_RESUME' });  // проигнорировано, останется paused
```

---

## Архитектура Middleware

Middleware перехватывает событие до редьюсера. Вызов `next(event)` передаёт его дальше по
цепочке, отсутствие вызова — поглощает событие:

```ts
machine.use((event, snapshot, next) => {
  console.log(`[Event Dispatched]: ${event.type}`, event);
  next(event);
});
```

```ts
// Подавление события по условию
const stop = machine.use((event, snapshot, next) => {
  if (event.type === 'PLAY' && snapshot.context.volume === 0) {
    return;
  }
  next(event);
});

stop();
```

---

## API

### `createPlayerMachine()`

Создаёт машину в статусе `idle` с начальным контекстом. Аргументов не принимает.

### Экземпляр `PlayerMachine`

| Метод | Описание |
| --- | --- |
| `send(event)` | Отправляет событие в машину |
| `dispatch(event)` | Синоним `send` |
| `getSnapshot()` | Возвращает текущий снимок |
| `subscribe(listener)` | Подписывается на изменения, возвращает функцию отписки |
| `use(middleware)` | Регистрирует middleware, возвращает функцию снятия |

---

## Типы данных

| Тип | Назначение |
| --- | --- |
| `CaptionCue` | Реплика субтитров с `startTime` / `endTime`, опционально пословные `words` |
| `WordCue` | Пословный тайминг для подсветки слов |
| `Chapter` | Глава с `title` и интервалом |
| `Marker` | Интерактивный маркер: `sponsor`, `intro`, `outro`, `highlight` |
| `VideoQuality` | Вариант качества: `id`, `height`, опционально `label`, `src`, `bitrate` |
| `PlayerActionRecord` | Последнее сработавшее действие для аналитики |

`Chapter`, `Marker` и `CaptionCue` могут прийти вместе с событием `LOAD` либо позже через
`SET_CHAPTERS` / `SET_MARKERS` / `SET_CAPTIONS`.

## События

Всего 33 типа событий. Кроме переходов из таблицы они меняют только контекст:
`BUFFER_UPDATE`, `VOLUME_CHANGE`, `RATE_CHANGE`, `FULLSCREEN_CHANGE`, `PIP_CHANGE`,
`DOCUMENT_PIP_CHANGE`, `THEATER_TOGGLE`, `TOGGLE_CAPTIONS`, `TOGGLE_AMBIENT`,
`BRIGHTNESS_CHANGE`, `AUDIO_GAIN_CHANGE`, `LONG_PRESS_SPEED_CHANGE`, `QUALITY_CHANGE`,
`SET_QUALITIES`, `ACTION_TRIGGERED`, `HYDRATE_SETTINGS`.

Два частных случая:

- `AUDIO_GAIN_CHANGE` с `gain: 0` выставляет `muted: true` автоматически.
- `HYDRATE_SETTINGS` восстанавливает громкость, скорость и ambient-режим.

---

## Тестирование и сборка

```bash
pnpm --filter @web-react-player/core test       # Vitest
pnpm --filter @web-react-player/core build      # tsc --noEmit && vite build
pnpm --filter @web-react-player/core lint       # Biome
```

Полный API-контракт фиксируется API Extractor в `etc/core.api.md`; отчёт проверяется в CI
командой `pnpm check:packages` и не должен меняться без обновления.

---

## Лицензия

MIT © [Никита Горобец](https://github.com/NIKIRIKI7/web-react-player-monorepo).
Подробности в файле [LICENSE](./LICENSE).
