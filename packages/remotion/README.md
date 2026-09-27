# @web-react-player/remotion

> Модуль интеграции Remotion с экосистемой `@web-react-player`: компиляция пользовательского TSX прямо в браузере, офлайн-экспорт в MP4/WebM на базе WebCodecs, многоканальный звуковой микшер с дакингом и изолированный реестр виджетов.

[![npm version](https://img.shields.io/npm/v/@web-react-player/remotion.svg?label=@web-react-player/remotion)](https://www.npmjs.com/package/@web-react-player/remotion)
[![npm downloads](https://img.shields.io/npm/dm/@web-react-player/remotion.svg)](https://www.npmjs.com/package/@web-react-player/remotion)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node: 20.19+](https://img.shields.io/badge/node-%5E20.19%20%7C%20%3E%3D22.12-brightgreen.svg)](https://nodejs.org/)
[![Tree Shaking: Supported](https://img.shields.io/badge/tree--shaking-supported-success.svg)](https://webpack.js.org/guides/tree-shaking/)

---

## Возможности

- **Браузерная песочница (`BrowserTsxCompiler`)** — транспиляция TSX/JSX через Sucrase прямо на клиенте. Эмулирует модули `react`, `remotion`, `@remotion/media`, разрешает пользовательские виртуальные модули и работает с виртуальной файловой системой (VFS) для медиа.
- **Двусторонний адаптер (`RemotionProvider`)** — мост между FSM-машиной `@web-react-player/ui` и рантаймом Remotion: скраббинг, жесты, маркеры, субтитры и качество видео.
- **Звуковой микшер (`AudioMixerPlugin`)** — декларативное сведение голоса, музыки и звуковых эффектов с автоматическим дакингом, покадровым таймлайном, обрезкой исходников и плавными переходами.
- **Экспорт в браузере (`WebRendererExportEngine`)** — покадровое кодирование в MP4/WebM через WebCodecs с пресетами качества `draft`, `standard`, `high`.
- **Реестр виджетов (`WidgetRegistry`)** — нормализация пропсов и однократная компиляция параметрических анимаций, описанных в виде обычного JSON.
- **Адаптеры сценариев** — `ScenarioAdapter` для декларативных сценариев и `VidoraFFmpegService` для связки с внешним FFmpeg-бэкендом.

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

## Разработка

```bash
```bash
pnpm --filter @web-react-player/remotion test     # контрактные тесты публичного API
pnpm --filter @web-react-player/remotion build    # проверка типов и сборка дистрибутива
pnpm --filter @web-react-player/remotion lint     # Biome
```

Тесты лежат в каталоге `tests/` рядом с исходниками и вне `src/`, поэтому не попадают ни в дистрибутив, ни в декларации типов. Перед публикацией npm автоматически выполняет `build`, затем `test`: сломанный пакет не может покинуть машину разработчика.

## Лицензия

MIT — полный текст в файле [LICENSE](./LICENSE).

**Автор:** Никита Горобец ([репозиторий](https://github.com/NIKIRIKI7/web-react-player-monorepo))
