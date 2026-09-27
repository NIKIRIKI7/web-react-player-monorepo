# @web-react-player/ui

> Набор доступных, модульных и адаптивных React-компонентов для сборки интерфейсов видеоплееров любого уровня сложности: таймлайн, пословные субтитры, фоновое свечение (Ambilight), поддержка хоткеев и жестов.

[![npm version](https://img.shields.io/npm/v/@web-react-player/ui.svg?style=flat-square)](https://www.npmjs.com/package/@web-react-player/ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![React: 18 / 19](https://img.shields.io/badge/React-18%20%7C%2019-61dafb.svg?style=flat-square)](https://react.dev/)

---

## Возможности

- **Headless-примитивы:** `Root`, `PlayButton`, `MuteButton`, `TimeSlider`, `TimeDisplay`, `Captions`, `AmbientBackground`, `ScreenGestures`, `SettingsMenu`, `QualityMenu`.
- **Готовая раскладка (`DefaultStandardLayout`):** предварительно собранный интерфейс в стиле YouTube со скрытием панелей при неактивности, всплывающим безелем действий и поддержкой тёмной темы.
- **Пословные субтитры (Karaoke):** активное слово подсвечивается через CSS-переменные и прямые `element.style`, без перерисовки дерева React.
- **Фоновое свечение Ambilight (`AmbientBackground`):** размытие кадра видео позади контейнера плеера.
- **AudioBoost до 300%:** разгон громкости выше 100% через Web Audio API (`GainNode`), диапазон ограничен 0–3.
- **Декларативные горячие клавиши:** стандарт YouTube (`Space`, `K`, `J`, `L`, `F`, `M`, `C`, `T`, цифры `0`–`9`, стрелки) с блокировкой срабатывания при фокусе в `input`, `textarea` и `select`.

---

## Установка

```bash
# pnpm
pnpm add @web-react-player/ui

# npm
npm install @web-react-player/ui

# yarn
yarn add @web-react-player/ui
```

`react` и `react-dom` — peer-зависимости (`^18 || ^19`). `@web-react-player/core`
устанавливается автоматически как обычная зависимость.

---

## Быстрый старт

```tsx
import React from 'react';
import {
  DefaultStandardLayout,
  Html5VideoProvider,
  PlayerProvider,
  Root,
} from '@web-react-player/ui';

export function App() {
  return (
    <PlayerProvider>
      <div style={{ aspectRatio: '16 / 9', maxWidth: 840, margin: '40px auto' }}>
        <Root>
          <Html5VideoProvider
            src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
            crossOrigin="anonymous"
          />
          <DefaultStandardLayout debug={false} />
        </Root>
      </div>
    </PlayerProvider>
  );
}
```

`DefaultStandardLayout` собирает стандартный набор элементов управления. Проп `debug`
включает оверлей `PlayerDebug` — держите его выключенным в продакшене.

---

## Применение отдельных примитивов (Custom Layout)

Если нужен уникальный интерфейс, компоненты размещаются вручную:

```tsx
import {
  FullscreenButton,
  Html5VideoProvider,
  PlayButton,
  PlayerProvider,
  Root,
  TimeDisplay,
  TimeSlider,
  VolumeControl,
} from '@web-react-player/ui';

export function CustomPlayer() {
  return (
    <PlayerProvider>
      <Root style={{ width: '100%', height: '100%' }}>
        <Html5VideoProvider src="/video.mp4" />
        <div className="bottom-bar">
          <TimeSlider />
          <div className="controls-row">
            <PlayButton />
            <VolumeControl />
            <TimeDisplay type="current" />
            <FullscreenButton />
          </div>
        </div>
      </Root>
    </PlayerProvider>
  );
}
```

---

## Контекст

| Экспорт | Назначение |
| --- | --- |
| `PlayerProvider` | Поднимает машину состояния и отдаёт контекст потомкам |
| `usePlayerContext()` | Полный доступ: снимок состояния, `send`, `machine` |
| `usePlayerState(selector)` | Произвольный кусок состояния: принимает селектор и возвращает только его результат |
| `getContainerTier(width)` | Плотность контролов по ширине контейнера: `xl` ≥ 800, `lg` ≥ 660, `md` ≥ 520, `sm` ≥ 360, иначе `xs` |

`PlayerProvider` принимает начальные данные, чтобы не отправлять их событиями после
монтирования: `initialCaptions`, `initialChapters`, `initialMarkers`, `initialQualities`.

---

## Примитивы

| Компонент | Назначение |
| --- | --- |
| `Root` | Контейнер, отслеживает idle-таймер, горячие клавиши, адаптивный размер |
| `PlayButton` | Воспроизведение и пауза |
| `MuteButton` | Переключение звука |
| `VolumeControl` | Громкость, до 300% через AudioBoost |
| `TimeDisplay` | Текущее время, длительность или остаток (`type`) |
| `TimeSlider` | Перемотка |
| `QualityMenu` | Переключение качества |
| `SettingsMenu` | Меню настроек |
| `Captions` | Вывод субтитров с пословной подсветкой |
| `CaptionCustomizer`, `CaptionPreviewBox` | Настройка стиля субтитров с предпросмотром |
| `InteractiveMarkers` | Интерактивные маркеры по таймлайну |
| `PIPButton` | Обычный Picture-in-Picture |
| `DocumentPipPortal` | Picture-in-Picture поверх документа |
| `FullscreenButton` | Полноэкранный режим |
| `ScreenGestures` | Жесты по экрану: свайп для громкости и яркости |
| `ActionBezel` | Всплывающая подсказка действия |
| `AmbientBackground` | Размытый фон под ambient-режим |
| `Match` | Рендерит детей только подходящего размера контейнера |
| `PlayerDebug` | Отладочный оверлей состояния, включается пропом `enabled` |

Большинство примитивов расширяют `ComponentProps<'div'>`, поэтому `className`, `style` и
остальные HTML-атрибуты доступны без обёрток.

---

## Слои

| Экспорт | Назначение |
| --- | --- |
| `Html5VideoProvider` | Привязывает `<video>` к машине: отправляет нативные события |
| `DefaultStandardLayout` | Готовая композиция элементов управления |

`Html5VideoProvider` принимает все пропы `<video>` (`src`, `poster`, `crossOrigin`,
`playsInline` и прочие).

---

## Субтитры

Помимо рендера, пакет умеет хранить настройки оформления:

```ts
import {
  captionStylesToCssVariables,
  loadCaptionPreferences,
  saveCaptionPreferences,
} from '@web-react-player/ui';

const styles = loadCaptionPreferences();
styles.fontSize = '150%';
saveCaptionPreferences(styles);

const vars = captionStylesToCssVariables(styles);
```

`captionStylesToCssVariables` превращает настройки в набор CSS-переменных, а `hexToRgba`
помогает приготовить полупрозрачный фон. Значения по умолчанию лежат в
`DEFAULT_CAPTION_STYLES`. В Node.js и Web Worker `loadCaptionPreferences` возвращает
значения по умолчанию, не трогая `localStorage`.

---

## Горячие клавиши

| Экспорт | Назначение |
| --- | --- |
| `DEFAULT_HOTKEYS` | Раскладка по умолчанию |
| `compileHotkeyBindings(map)` | Компилирует раскладку в обработчик |
| `handleKeyboardShortcut(event)` | Разбирает конкретное событие клавиатуры |
| `executeCanonicalCommand(command)` | Выполняет каноническую команду |

Своя раскладка передаётся в `Root` через проп `hotkeys`. Шаблон соответствия — тип
`HotkeysMap`, каждая привязка описывается через `HotkeyBindingDescriptor`. Клавиши
перехватаются только когда фокус не внутри поля ввода.

---

## Утилиты

- `formatTime(seconds)` — форматирование времени: `MM:SS`, а для часа и больше — `H:MM:SS`.
  Нечисловые и отрицательные значения дают `00:00`.
- `Slot` — обёртка над единственным дочерним элементом: сливает `className` и `style`,
  вызывает `onClick` и `onPointerDown` обоих, объединяет `ref` через `mergeRefs`.

---

## Реэкспорт типов core

Для удобства пакет переэкспортирует типы
[`@web-react-player/core`](../core): `CaptionCue`, `WordCue`, `Chapter`, `Marker`,
`VideoQuality`, `PlayerEvent`, `PlayerSnapshot`, `PlayerStatus`, `PlayerActionRecord`,
`PlayerMiddleware`. Импортировать их можно прямо из `@web-react-player/ui`.

---

## Тестирование и сборка

```bash
pnpm --filter @web-react-player/ui test       # Vitest
pnpm --filter @web-react-player/ui build      # tsc --noEmit && vite build
pnpm --filter @web-react-player/ui lint       # Biome
```

Полный API-контракт фиксируется API Extractor в `etc/ui.api.md`; отчёт проверяется в CI
командой `pnpm check:packages` и не должен меняться без обновления.

---

## Лицензия

MIT © [Никита Горобец](https://github.com/NIKIRIKI7/web-react-player-monorepo).
Подробности в файле [LICENSE](./LICENSE).
