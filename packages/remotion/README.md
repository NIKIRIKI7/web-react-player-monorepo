# @web-react-player/remotion

> Модуль интеграции Remotion с экосистемой `@web-react-player`: компиляция пользовательского TSX прямо в браузере, офлайн-экспорт в MP4/WebM на базе WebCodecs, многоканальный звуковой микшер с дакингом и изолированный реестр виджетов.

[![npm version](https://img.shields.io/npm/v/@web-react-player/remotion.svg?label=@web-react-player/remotion)](https://www.npmjs.com/package/@web-react-player/remotion)
[![npm downloads](https://img.shields.io/npm/dm/@web-react-player/remotion.svg)](https://www.npmjs.com/package/@web-react-player/remotion)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node: 20.19+](https://img.shields.io/badge/node-%5E20.19%20%7C%20%3E%3D22.12-brightgreen.svg)](https://nodejs.org/)
[![Tree Shaking: Supported](https://img.shields.io/badge/tree--shaking-supported-success.svg)](https://webpack.js.org/guides/tree-shaking/)

---

## Возможности и Developer Experience (DX)

- **Браузерная песочница (`BrowserTsxCompiler`)** — транспиляция TSX/JSX через Sucrase прямо на клиенте. Эмулирует модули `react`, `remotion`, `@remotion/media`, разрешает пользовательские виртуальные модули и работает с виртуальной файловой системой (VFS) для медиа.
- **Widget-Driven Architecture** — no-code рендеринг: сложная анимация описывается обычным JSON (схема пропсов, теги, дефолты). Движок сам приводит типы, подставляет значения по умолчанию и выводит разрешение композиции по тегам или идентификатору виджета. Компиляция выполняется лениво и кэшируется, поэтому правка пропсов в инспекторе не пересобирает компонент.
- **Гибридная оркестрация** — JSON-виджеты прокидываются в компилятор как виртуальные пакеты (например, `import { NeonTitle } from '@vidora/widgets'`). Моушн-дизайнеры описывают эффекты в JSON, а разработчики импортируют их в таймлайн как обычные React-компоненты.
- **Декларативный саунд-дизайн (`AudioMixerPlugin`)** — никакой математики таймкодов: достаточно описать `audioMix` в конфиге композиции. Движок сам посчитает покадровые фейды, приглушит музыку под голос диктора (ducking), обрежет исходники по кадровым смещениям и заранее смонтирует `<Audio>`, чтобы не было буферизации.
- **Безопасное исполнение и человечные ошибки** — загрузка ресурсов ограничена белым списком протоколов, а ошибки TSX перехватываются и превращаются в `RemotionCompilerError` с конкретной подсказкой (`suggestion`) вместо падения приложения.
- **Экспорт в браузере (`WebRendererExportEngine`)** — покадровое кодирование в MP4/WebM через WebCodecs с пресетами качества `draft`, `standard`, `high`.
- **Интеграция с FFmpeg** — `VidoraFFmpegService` ведёт бесшовный Server-Sent Events (SSE) диалог с бэкендом: парсит события прогресса, нормализует числа, игнорирует лишние поля и корректно отменяет задачу.

Библиотека **не пишет в консоль**. Все диагностические сообщения передаются через типизированные исключения `RemotionCompilerError` с полем `suggestion` либо через события состояния.

## Установка

```bash
# pnpm
pnpm add @web-react-player/remotion

# npm
npm install @web-react-player/remotion

# yarn
yarn add @web-react-player/remotion
```

`@web-react-player/ui` и `@web-react-player/core` — обычные зависимости, они установятся
автоматически. А вот `react` и `react-dom` (18 или 19) — peer-зависимости: их нужно иметь в
проекте самостоятельно, чтобы гарантировать единственную копию React.

## Быстрый старт

### Проигрывание анимации из TSX-кода

```tsx
import { useMemo } from 'react';
import { DefaultStandardLayout, PlayerProvider, Root } from '@web-react-player/ui';
import { createDefaultRemotionSuite, RemotionProvider } from '@web-react-player/remotion';

const CODE_EXAMPLE = `
import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const config = {
  durationInFrames: 150,
  fps: 30,
  width: 1280,
  height: 720,
};

export const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });

  return React.createElement(
    AbsoluteFill,
    { style: { backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' } },
    React.createElement(
      'h1',
      { style: { color: '#38bdf8', fontSize: 60, transform: 'scale(' + scale + ')' } },
      'Web React Player',
    ),
  );
};
`;

export function PlayerApp() {
  const suite = useMemo(() => createDefaultRemotionSuite(), []);

  return (
    <PlayerProvider>
      <div style={{ aspectRatio: '16 / 9', maxWidth: 800, margin: '0 auto' }}>
        <Root>
          <RemotionProvider
            source={{ type: 'code', code: CODE_EXAMPLE }}
            pluginManager={suite.pluginManager}
            compiler={suite.compiler}
          />
          <DefaultStandardLayout />
        </Root>
      </div>
    </PlayerProvider>
  );
}
```

### Экспорт анимации в MP4

Экспорт требует браузер с поддержкой WebCodecs. Проверку поддержки библиотека берёт на себя:

```typescript
import {
  createDefaultRemotionSuite,
  type RemotionCompositionConfig,
} from '@web-react-player/remotion';

const suite = createDefaultRemotionSuite();

async function exportAnimation(tsxCode: string, setProgress: (percent: number) => void) {
  const { Component, detectedConfig } = await suite.compiler.compile(tsxCode);

  const config: RemotionCompositionConfig = {
    durationInFrames: 150,
    fps: 30,
    width: 1280,
    height: 720,
    ...detectedConfig,
  };

  const result = await suite.exporter.exportMedia(Component, config, {}, {
    format: 'mp4',
    quality: 'high',
    onProgress: ({ progress }) => setProgress(Math.round(progress * 100)),
  });

  // Либо отдайте наружу result.blob / result.buffer / result.url
  result.download('composition.mp4');
}
```

### Обработка ошибок компиляции

```typescript
import { createDefaultRemotionSuite, RemotionCompilerError } from '@web-react-player/remotion';

const suite = createDefaultRemotionSuite();

try {
  await suite.compiler.compile(userCode);
} catch (error) {
  if (error instanceof RemotionCompilerError) {
    // 'SyntaxError' | 'MissingComponentError' | 'InvalidConfigError' | 'RuntimeError'
    reportToEditor(error.type, error.message, error.suggestion);
  }
}
```

## Архитектура комплекта

Функция `createDefaultRemotionSuite(customCss?)` собирает и связывает между собой все подсистемы и регистрирует встроенные плагины:

| Плагин | Идентификатор | Назначение |
| :--- | :--- | :--- |
| `LucideIconsPlugin` | `remotion-plugin-lucide` | Прокси-импорт иконок из `lucide-react` с запасным SVG |
| `TailwindPlugin` | `remotion-plugin-tailwind` | Изоляция CSS-стилей внутри рабочей области композиции |
| `ThreePlugin` | `remotion-plugin-three` | 3D-сцены на WebGL с освобождением ресурсов GPU при размонтировании |
| `AudioMixerPlugin` | `remotion-plugin-audio-mixer` | Покадровое сведение голоса, музыки и звуковых эффектов с дакингом |

Возвращаемый объект:

| Поле | Тип | Роль |
| :--- | :--- | :--- |
| `pluginManager` | `RemotionPluginManager` | Реестр плагинов, разрешение виртуальных модулей, обёртки компонентов |
| `compiler` | `BrowserTsxCompiler` | Транспиляция TSX, извлечение `config`, однократная компиляция виджетов |
| `exporter` | `WebRendererExportEngine` | Покадровый рендер и кодирование через WebCodecs |
| `widgetRegistry` | `WidgetRegistry` | Нормализация пропсов и кэш компиляции JSON-виджетов |

### Источники сцены

`RemotionSource` — объединение трёх вариантов:

- `{ type: 'component', component, inputProps?, config? }` — уже готовый React-компонент;
- `{ type: 'code', code, assets?, assetBaseUrl?, allowedAssetProtocols?, assetResolver?, virtualModules? }` — исходный код и виртуальная файловая система;
- `{ type: 'widget', widget, widgetProps?, registry }` — параметрический виджет из JSON.

Ресурсы из VFS резолвятся в три этапа: пользовательский `assetResolver`, точное совпадение по ключу в `assets`, затем `assetBaseUrl`. Протоколы ограничены белым списком `http`, `https`, `data`, `blob` и `vidora-local`; попытка загрузить что-то другое прерывает компиляцию с `InvalidConfigError`, а не делает молчаливый сетевой запрос.

---

## Widget-Driven Architecture

Ключевая идея: анимация — это данные, а не код. Виджет описывается JSON-пакетом, а движок сам превращает его в скомпилированный React-компонент.

```ts
import { createDefaultRemotionSuite, type VidoraWidgetDefinition } from '@web-react-player/remotion';

const { widgetRegistry } = createDefaultRemotionSuite();

const widget: VidoraWidgetDefinition = {
  id: 'lower-third-9x16',
  name: 'Lower Third',
  tags: ['9:16', 'shorts'],
  tsx_code: 'export const C = ({ title }) => <div>{title}</div>;',
  props: [{ name: 'title', type: 'string', default: 'Заголовок' }],
};

widgetRegistry.register(widget);
```

Что делает движок за вас:

- **Нормализация пропсов (type coercion).** Значения приводятся к типам из схемы: строка `'32'` становится числом `32`, `'true'` — булевым `true`, JSON-строка для объекта разбирается через `JSON.parse`. Значения, которые не удалось привести, заменяются дефолтом. Ключи, не описанные в схеме, передаются как есть.
- **Автовывод композиции.** `WidgetPropsEngine.deriveCompositionConfig` смотрит на идентификатор и теги: наличие `9x16` в `id` либо тегов `9:16`, `shorts`, `reels`, `tiktok` даёт вертикальный кадр 1080×1920, иначе — горизонтальный 1920×1080. Длительность берётся из пропса `durationFrames`, по умолчанию 300 кадров.
- **Ленивая компиляция с кэшем.** Компонент компилируется при первом обращении к `registry.compile()` и дальше берётся из кэша. Если `tsx_code` виджета изменился, кэш сбрасывается автоматически. Пропсы приходят обычным объектом в рантайме, поэтому правка инспектора не пересобирает бандл.

```tsx
const suite = createDefaultRemotionSuite();

<RemotionProvider
  source={{ type: 'widget', widget: 'lower-third-9x16', widgetProps: { title: 'Эпизод 1' }, registry: suite.widgetRegistry }}
  pluginManager={suite.pluginManager}
  compiler={suite.compiler}
/>
```

### Гибридная оркестрация

Виртуальные модули позволяют вынести JSON-виджеты в отдельный «пакет» и импортировать их из TSX как обычные компоненты. Так разделяются труд: моушн-дизайнер наполняет JSON-базу эффектов, а разработчик пишет только логику таймлайна.

```tsx
// Так собрано демо apps/playground/src/MixedScenarioDemo.tsx из этого репозитория:
// сначала виджеты регистрируются в реестре и компилируются один раз...
const NeonTitle = await widgetRegistry.compile('FlickerNeonTitle16x9');
const KineticText = await widgetRegistry.compile('WordByWordText16x9');

// ...затем их можно импортировать из виртуального пакета '@vidora/widgets'
const virtualModules = {
  '@vidora/widgets': { NeonTitle, KineticText },
};

// В коде таймлайна это выглядит как обычный импорт:
// import { NeonTitle, KineticText } from '@vidora/widgets';

<RemotionProvider
  source={{ type: 'code', code: timelineCode, virtualModules }}
  pluginManager={suite.pluginManager}
  compiler={suite.compiler}
/>
```

---

## Virtual Environment & Sandboxing

Компилятор исполняет произвольный TSX, поэтому доступ к окружению ограничен на трёх уровнях:

- **Изолированная область видимости.** Транспилированный код выполняется в собственной функции со своим `require`, `exports` и `module`. Глобальные переменные браузера и хост-приложения недоступны, а модули `react`, `remotion` и `@remotion/media` подставляются контролируемыми копиями.
- **Перехваченная система модулей.** Каждый `import` проходит через резолвер: сначала встроенные модули, затем плагины, затем `virtualModules` и `additionalScope`. Неизвестный модуль не падает, а превращается в пустой объект, чтобы ошибка была видна на этапе компиляции, а не молча ломала рендер.
- **Белый список протоколов ресурсов.** `staticFile()` и пути аудиодорожек проходят через `createAssetResolver`. Протокол вне списка (`file:`, `ftp:` и другие) прерывает компиляцию с `InvalidConfigError` и подсказкой, вместо молчаливого сетевого запроса.

> **Важно:** изоляция защищает конвейер компиляции и рендера от случайных ошибок и нежелательных загрузок, но это не граница безопасности для исполнения враждебного кода. Не компилируйте код из ненадёжных источников.

---

## Declarative Audio

`AudioMixerPlugin` снимает с разработчика всю покадровую математику звука. Достаточно описать дорожки в `audioMix`:

```ts
const config: RemotionCompositionConfig = {
  durationInFrames: 300,
  fps: 30,
  width: 1920,
  height: 1080,
  audioMix: {
    voiceover: { src: 'narration.mp3' },
    music: [{ src: 'theme.mp3', loop: true, ducking: true, fadeInFrames: 30 }],
    sfx: [{ src: 'click.mp3', startFrom: 60 }],
  },
};
```

Что делает движок:

- **Автоматический дакинг.** Флаг `ducking: true` на музыкальной дорожке заставляет движок вычислить окно речи диктора и плавно убавить громкость музыки до 0.15 за полсекунды до первых слов, затем так же плавно вернуть её после окончания речи. Никакого кода для этого писать не нужно.
- **Идемпотентное разрешение путей.** Относительные имена (`'theme.mp3'`) прогоняются через VFS и превращаются в конкретные URL из `assets` или `assetBaseUrl`. Уже абсолютные URL возвращаются как есть, поэтому повторный вызов безопасен.
- **Декларативная обрезка и позиционирование.** `trimStartFrames` / `trimEndFrames` маппятся на `trimBefore` / `trimAfter`, а `startFrom` / `endAt` / `durationFrames` — на `Sequence`. Окно речи и длительности дорожек вычисляются один раз при создании обёртки, а не на каждом кадре.
- **Без буферизации.** Каждая дорожка монтируется с `premountFor={30}` (одна секунда при 30 fps), поэтому начало звука не проваливается из-за загрузки.

Опечатки в `audioMix` (отрицательные кадры, `endAt` раньше `src`, некорректный тип дорожки) ловятся на этапе компиляции и превращаются в `RemotionCompilerError` с подсказкой, а не в тихий сбой звука на рендере.

---

## Интеграция с FFmpeg (SSE)

`VidoraFFmpegService` связывает фронтенд с серверным пайплайном мастеринга:

```ts
import { VidoraFFmpegService, type MasteringConfig } from '@web-react-player/remotion';

const service = new VidoraFFmpegService({ apiUrl: 'https://api.example.com/api/v1/render' });

const config: MasteringConfig = {
  lufsTarget: -14,
  applyNoiseGate: true,
  removeSilence: false,
  videoQuality: 'high',
};

const downloadUrl = await service.startPipeline('scenario-1', config, ({ status, progress, downloadUrl }) => {
  console.log(`${Math.round(progress * 100)}%`, status, downloadUrl);
});
```

- **Нормализация ответов.** События прогресса приводятся к `VidoraRenderProgress`: прогресс зажимается в `[0, 1]`, кадры — в неотрицательные целые, ссылка на результат принимается и как `downloadUrl`, и как `download_url`. Неизвестные поля игнорируются.
- **Корректное завершение.** Промис разрешается ссылкой на скачивание при `completed` и отклоняется при `error`, разрыве потока или отмене через `AbortSignal`.
- **Отмена без зависших процессов.** `service.cancel(jobId)` отправляет `DELETE /jobs/{jobId}`; ответ `404` считается успехом, потому что задача уже не существует.
- **Тестируемость.** `fetch` и `EventSource` инъецируются через `VidoraFFmpegServiceOptions`, поэтому сервис легко мокается в тестах.

---

## Разработка

```bash
pnpm --filter @web-react-player/remotion test     # контрактные тесты публичного API
pnpm --filter @web-react-player/remotion build    # проверка типов и сборка дистрибутива
pnpm --filter @web-react-player/remotion lint     # Biome
```

Тесты лежат в каталоге `tests/` рядом с исходниками и вне `src/`, поэтому не попадают ни в дистрибутив, ни в декларации типов. Перед публикацией npm автоматически выполняет `build`, затем `test`: сломанный пакет не может покинуть машину разработчика.

## Лицензия

MIT — полный текст в файле [LICENSE](./LICENSE).

**Автор:** Никита Горобец ([репозиторий](https://github.com/NIKIRIKI7/web-react-player-monorepo))
