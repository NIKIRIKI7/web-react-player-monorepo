# Web React Player

[![npm core version](https://img.shields.io/npm/v/@web-react-player/core.svg?label=@web-react-player/core)](https://www.npmjs.com/package/@web-react-player/core)
[![npm ui version](https://img.shields.io/npm/v/@web-react-player/ui.svg?label=@web-react-player/ui)](https://www.npmjs.com/package/@web-react-player/ui)
[![npm downloads](https://img.shields.io/npm/dm/@web-react-player/core.svg)](https://www.npmjs.com/package/@web-react-player/core)

Видеоплеер для React: логика воспроизведения отделена от интерфейса и от движка медиа.

| Пакет | Версия | Назначение |
| :--- | :--- | :--- |
| [`@web-react-player/core`](./packages/core) | `1.0.2` | Framework-agnostic конечный автомат состояний. Без зависимостей |
| [`@web-react-player/ui`](./packages/ui) | `1.1.1` | React-провайдер, headless-примитивы, раскладка, горячие клавиши |
| [`@web-react-player/remotion`](./packages/remotion) | `0.2.1` | Компиляция TSX в браузере, Remotion Player, экспорт MP4/WebM |

## Документация

- **[Техническая документация](./docs/ARCHITECTURE.md)** — архитектура, полный публичный API,
  поведение FSM, движок Remotion, приложения, рецепты интеграции.
- **[Руководство разработчика](./README.DEV.md)** — инструменты качества, правила коммитов,
  пайплайн разработки и релиза.

Справочный API генерируется локально (папка `docs/api/` не версионируется):

```bash
pnpm build && pnpm docs:api
```

## Быстрый старт

```bash
pnpm install
pnpm dev:app     # playground на http://localhost:5173
```

```tsx
import { DefaultStandardLayout, Html5VideoProvider, PlayerProvider, Root } from '@web-react-player/ui';

export function App() {
  return (
    <PlayerProvider>
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

## Требования

Node.js `^20.19.0 || >=22.12.0`, pnpm `12.4.2`, React `^18 || ^19`.

## Лицензия

MIT
