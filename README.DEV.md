# 🛠️ Руководство разработчика (Developer Guide)

Добро пожаловать в монорепозиторий **`web-react-player`**! Этот документ содержит описание структуры проекта, каталог всех инструментов контроля качества, правила коммитов и пошаговый пайплайн разработки (включая вайб-кодинг с ИИ).

> 📘 **Описание архитектуры и полного API** — в [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
> Этот файл отвечает за процессы: инструменты, правила, чек-листы.

---

## 📁 Структура проекта

Монорепозиторий управляется через **pnpm workspaces** (`packages/*`, `apps/*`, `apps/vidora-mini/frontend`):

```text
web-react-player/
├── packages/
│   ├── core/         # @web-react-player/core (v1.0.2): FSM машина состояний и типы, без React и DOM
│   ├── ui/           # @web-react-player/ui (v1.1.1): React-провайдер, headless-примитивы, раскладка, хоткеи
│   └── remotion/     # @web-react-player/remotion (v0.2.1): TSX-компилятор, плагины, экспорт, виджеты
├── apps/
│   ├── playground/       # Vite-песочница с 5 демо (порт 5173, private: true)
│   └── vidora-mini/      # Фронтенд (порт 5174) + FastAPI/FFmpeg-бэкенд (порт 8355)
├── docs/             # ARCHITECTURE.md + автогенерируемая Markdown-документация API (TypeDoc)
├── .github/          # CI/CD workflows: ci.yml, release.yml, security.yml
└── .husky/           # Git-хуки: pre-commit, commit-msg
```

Порядок зависимостей строго односторонний: `remotion → ui → core`. Проверяется через
`pnpm check:deps` (dependency-cruiser).

---

## 🚀 Быстрый старт

### Системные требования
* **Node.js**: `^20.19.0 || >=22.12.0` (рекомендуется `22.x LTS`)
* **pnpm**: `12.4.2` (зафиксировано полем `packageManager`)
* **Для `apps/vidora-mini` дополнительно**: Python `3.10+`, FFmpeg и ffprobe в `PATH`

### Установка зависимостей
```bash
pnpm install
```

### Запуск песочницы для разработки
```bash
pnpm dev:app
```
*Песочница доступна на `http://localhost:5173`. Благодаря Vite-алиасам изменения в `packages/*/src` моментально отображаются в браузере без пересборки пакетов (HMR).*

### Запуск второго приложения (Vidora Mini)
```bash
pnpm --filter vidora-tester dev   # http://localhost:5174
```
Бэкенд с реальным FFmpeg поднимается отдельно — см. [apps/vidora-mini/README.md](./apps/vidora-mini/README.md).

---

## 🧰 Полный каталог инструментов проекта

В проекте настроена многоуровневая система качества:

### 1. Форматирование, линтинг и гигиена кода
| Инструмент | Назначение | Команда |
| :--- | :--- | :--- |
| **Biome** | Сверхбыстрый линтер и форматтер (замена ESLint и Prettier) | `pnpm lint` / `pnpm lint:fix` |
| **TypeScript (5.8+)** | Проверка типов без компиляции файлов | `pnpm typecheck` |
| **ts-reset** | Устранение «дыр» в типах TS (`JSON.parse` и `.json()` возвращают `unknown`, а не `any`) | Работает автоматически через `packages/*/reset.d.ts` |
| **Knip** | Поиск мертвого кода, неиспользуемых экспортов и забытых пакетов | `pnpm check:knip` |
| **Syncpack** | Синхронизация версий зависимостей во всех пакетах репозитория | `pnpm check:syncpack` / `pnpm fix:syncpack` |
| **Dependency Cruiser** | Контроль архитектуры: запрет циклических импортов и утечек из UI в Core | `pnpm check:deps` |

### 2. Валидация сборки и контрактов npm-пакетов
| Инструмент | Назначение | Команда |
| :--- | :--- | :--- |
| **Vite + DTS** | Изолированная сборка ESM библиотек и генерация `.d.ts` | `pnpm build` |
| **Publint** | Проверка структуры `package.json` и путей `exports` по спецификации npm | `pnpm check:publint` |
| **ATTW (@arethetypeswrong/cli)** | Проверка резолва типов в разных режимах (Bundler, Node16, ESM-only) | `pnpm check:attw` |
| **Size Limit** | Защита от превышения лимитов размера бандла (`core` < 10 kB, `ui` < 25 kB) | `pnpm check:size` |
| **API Extractor** | Защита от случайных ломающих изменений API (SemVer guard через `etc/*.api.md`) | `pnpm api:check` / `pnpm api:update` |

### 3. Тестирование, безопасность и документация
| Инструмент | Назначение | Команда |
| :--- | :--- | :--- |
| **Vitest** | Юнит- и интеграционные тесты логики плеера | `pnpm test` |
| **Stryker Mutator** | Мутационное тестирование (проверка качества и «живучести» самих тестов) | `pnpm test:mutation` |
| **Socket.dev** | Сканирование зависимостей на уязвимости и вредоносный код | `pnpm check:security` |
| **Gitleaks** | Защита от случайного коммита секретов, токенов и API-ключей | В GitHub Actions (`security.yml`) |
| **TypeDoc** | Автоматическая генерация Markdown-документации API из JSDoc (`core`, `ui`, `remotion`) | `pnpm build && pnpm docs:api` |
| **CodeRabbit** | ИИ-ассистент, проводящий ревью каждого открытого Pull Request | Автоматически в PR |

---

## 📝 Правила коммитов (Commit Convention)

В проекте включен строгий перехват сообщений через **Commitlint** и **Husky**:

### Формат сообщения:
```text
type(scope): description
```

### Разрешенные типы (`type`):
* `feat` — новая функциональность (поднимает minor версию в Changesets)
* `fix` — исправление бага (поднимает patch версию)
* `docs` — изменения в документации или README
* `refactor` — переработка кода без изменения публичного API
* `perf` — оптимизация производительности
* `test` — добавление или правка тестов
* `chore` — служебные задачи, конфиги, обновление зависимостей

### ⚠️ Критические правила оформления:
1. **Только строчные буквы**: текст после двоеточия пишется **со строчной (маленькой) буквы** (`feat(core): add volume slider`, а не `feat(core): Add...`).
2. **Язык**: английский.
3. Без точки в конце сообщения.

---

## 🤖 Вайб-кодинг с ИИ (Repomix Workflow)

Чтобы нейросети (Claude, ChatGPT, Cursor, Windsurf) давали безупречный результат, передавайте им только актуальный контекст без шума (`dist`, локи, медиафайлы):

```bash 
# Упаковка всего монорепозитория
pnpm repomix             # -> repomix-output.xml
```

```bash 
# Упаковка только ядра (FSM, типы)
pnpm repomix:core        # -> repomix-core.xml
```

```bash 
# Упаковка только React UI
pnpm repomix:ui          # -> repomix-ui.xml
```

```bash 
# Упаковка только песочницы
pnpm repomix:app         # -> repomix-playground.xml
```

```bash 
# Упаковка приложения Vidora Mini (frontend + backend)
pnpm repomix:vidora-mini
```

### Памятка для системного промпта ИИ:
* Архитектура: Pure ESM (`"type": "module"`), React 19, TypeScript.
* Линтер: **Biome** (ESLint и Prettier использовать запрещено).
* `@web-react-player/core` — framework-agnostic (никакого React или DOM-специфичного UI).
* `@web-react-player/ui` — React-слой поверх `core`; состояние читается через `usePlayerState(selector)`.
* `@web-react-player/remotion` — движок: компиляция TSX, плагины, экспорт; общается с FSM через события.
* Типизация: строгий режим, запрещен `any`, использовать сужение `unknown`.
* Включён `exactOptionalPropertyTypes`: опциональные поля нельзя передавать как `undefined` явно — используйте условный spread.

---

## 🔄 Полный пайплайн качественной разработки (Step-by-Step Pipeline)

Пайплайн спроектирован так, чтобы вы могли разрабатывать функционал на максимальной скорости (включая вайб-кодинг с ИИ), но при этом ни один баг, мертвый код, опечатка, нарушение архитектуры или несовместимость с npm не могли попасть в релиз.

---

### Этап 0. Архитектурное планирование (Contract First)
Перед написанием кода определите границы ответственности:
1. **Логика и состояние:** Описываются **только** в `@web-react-player/core` через конечный автомат (FSM). Добавьте новые события и статусы в `packages/core/src/fsm/types.ts`.
   *Не забудьте добавить новое поле контекста в список сравнения в `processEvent` (`packages/core/src/fsm/machine.ts`) — иначе подписчики не узнают об изменении.*
2. **Интерфейс:** Описывается в `@web-react-player/ui` как подписка на снапшот FSM через хуки `usePlayerContext()` (полный контекст) и `usePlayerState(selector)` (гранулярная подписка).
3. **Движок медиа:** Отдельный пакет, который подключается к тому же контексту. Готовые примеры — `Html5VideoProvider` (`ui`) и `RemotionProvider` (`remotion`).
4. Пакет `core` **никогда не знает о DOM-элементах и React**.

---

### Этап 1. Подготовка ветки и контекста для ИИ
1. Создайте рабочую ветку от актуального `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b feat/playback-rate
   ```
2. Сгенерируйте контекст для нейросети в зависимости от задачи:
   * Нужен только чистый код (экономия токенов):
     ```bash
     pnpm repomix:pure
     ```
   * Нужна задача, затрагивающая публичный API и контракты:
     ```bash
     pnpm repomix:full
     ```
   * Нужна изоляция только по UI или Core:
     ```bash
     pnpm repomix:ui    # или pnpm repomix:core
     ```
3. Прикрепите полученный XML-файл (`repomix-*.xml`) в диалог с нейросетью.

---

### Этап 2. Итеративная разработка и живой тест в песочнице
1. Запустите тестовое окружение:
   ```bash
   pnpm dev:app
   ```
2. Пишите код/генерируйте фичу с помощью ИИ.
3. Проверяйте рендеринг, поведение видео и ошибки в консоли браузера на `http://localhost:5173`. Благодаря настроенным Vite-алиасам изменения применяются мгновенно без пересборки пакетов (HMR).

---

### Этап 3. Локальный аудит качества и очистка (Pre-Flight Checks)
Запустите цепочку проверок перед подготовкой коммита:

```bash
# 1. Поиск неиспользуемого кода, забытых файлов и зависимостей (Knip)
pnpm check:knip
```

```bash 
# 2. Проверка соответствия версий пакетов в монорепозитории (Syncpack)
pnpm check:syncpack
# Если есть расхождения: pnpm fix:syncpack
```

```bash 
# 3. Проверка архитектурных границ (Dependency Cruiser)
pnpm check:deps
```

```bash 
# 4. Проверка и автоматическое форматирование стилей (Biome)
pnpm lint:fix
```

```bash 
# 5. Строгая проверка типов во всех пакетах
pnpm typecheck
```

```bash 
# 6. Запуск юнит-тестов
pnpm test
```

---

### Этап 4. Валидация npm-пакетов и контроль SemVer (Breaking Changes)
Перед релизом пакетов необходимо удостовериться, что они корректно собираются, соответствуют стандартам npm и не ломают обратную совместимость.

1. **Сборка библиотек:**
   ```bash
   pnpm build
   ```
2. **Контроль публичного API через API Extractor:**
   Если вы намеренно изменили интерфейсы, пропсы или экспорты:
   ```bash
   pnpm api:update
   ```
   *Команда обновит слепки `packages/*/etc/*.api.md`. Обязательно выполните `git diff`, чтобы убедиться, что из публичного API не удалено ничего лишнего.*
3. **Генерация свежей Markdown-документации:**
   ```bash
   pnpm build && pnpm docs:api
   ```
   *TypeDoc работает по собранным `dist/*.d.ts`. Без `pnpm build` команда отработает «успешно», но создаст пустые страницы. Результат лежит в `docs/api/` и не версионируется.*
4. **Комплексная предрелизная проверка:**
   ```bash
   pnpm check:packages
   ```
   *Эта команда выполнит сборку, проверит структуру `package.json` (`publint`), корректность `.d.ts` типов во всех режимах резолва (`attw`), уложились ли мы в лимиты веса бандла (`size-limit`) и совпадает ли API со слепком (`api:check`).*

---

### Этап 5. Фиксация изменений (Changeset & Commit)
1. **Создайте запись об изменении для пользователей:**
   ```bash
   pnpm changeset
   ```
   * Выберите пакеты клавишей `Space` (`@web-react-player/core`, `@web-react-player/ui`, при необходимости `@web-react-player/remotion`).
   * Выберите уровень версии:
     * `patch` — багфикс или внутренняя оптимизация;
     * `minor` — новая функциональность с обратной совместимостью;
     * `major` — ломающее изменение API.
   * Напишите понятное описание изменения на английском языке.
2. **Создайте коммит:**
   ```bash
   git add .
   git commit -m "feat(core): add playback rate controls to fsm"
   ```
   *Хук `pre-commit` (Husky + lint-staged) автоматически прогонит Biome по staged-файлам.*  
   *Хук `commit-msg` (Commitlint) заблокирует коммит, если он написан не по стандарту Conventional Commits (со строчной буквы на английском).*

---

### Этап 6. Code Review и CI/CD
1. Отправьте ветку на GitHub:
   ```bash
   git push origin feat/playback-rate
   ```
2. Откройте Pull Request в ветку `main`.
3. **Автоматика GitHub Actions выполнит:**
   * `ci.yml`: сборку, typecheck, biоme ci, knip, syncpack, deps, attw, publint, size-limit.
   * `security.yml`: поиск утекших токенов через Gitleaks.
4. **CodeRabbit** проанализирует diff и напишет комментарии в PR по специфике плеера (проверка снятия слушателей событий, обработки ошибок промисов `play()`, доступности ARIA).
5. При необходимости внесите правки, сделайте коммит и дождитесь всех зеленых чеков.

---

### Этап 7. Автоматизированный релиз (Changesets Pipeline)
1. Нажмите кнопку **Merge** для слияния вашего PR в `main`.
2. Робот GitHub Actions (`release.yml`) увидит появившийся файл чейнджсета и автоматически создаст PR с заголовком **«chore: release packages»**.
3. В этом релизном PR робот:
   * Повысит версии в `packages/*/package.json`.
   * Обновит `CHANGELOG.md` для каждого пакета.
   * Удалит обработанный чейнджсет.
4. Как только вы мержите PR **«chore: release packages»** в `main`, Action:
   * Соберет пакеты (`pnpm build`).
   * Опубликует их в реестр [npmjs.com](https://www.npmjs.com/) с подтверждением подлинности (`npm provenance`).

---

## 📑 Справочник npm-скриптов

| Скрипт | Описание |
| :--- | :--- |
| `pnpm dev` | Фоновая сборка библиотек при изменениях (`watch`) |
| `pnpm dev:app` | Запуск локальной песочницы Vite |
| `pnpm build` | Сборка всех пакетов монорепозитория |
| `pnpm clean` | Полное удаление сгенерированных папок `dist` |
| `pnpm typecheck` | Проверка TypeScript во всех пакетах |
| `pnpm lint` / `pnpm lint:fix` | Проверка / исправление стиля Biome |
| `pnpm check:knip` | Поиск мертвого кода Knip |
| `pnpm check:syncpack` / `fix:syncpack` | Проверка / синхронизация версий в `package.json` |
| `pnpm check:deps` | Проверка архитектуры Dependency Cruiser |
| `pnpm check:security` | Аудит безопасности через Socket CLI |
| `pnpm check:publint` | Валидация манифестов пакетов перед релизом |
| `pnpm check:attw` | Проверка TypeScript-типов пакетов |
| `pnpm check:size` | Замер веса и tree-shaking через Size Limit |
| `pnpm check:packages` | **Полный предрелизный аудит** (билд + publint + attw + size + api) |
| `pnpm api:check` / `api:update` | Проверка / обновление слепка API Extractor |
| `pnpm docs:api` | Генерация Markdown API-документации TypeDoc (после `pnpm build`) |
| `pnpm test` | Запуск тестов Vitest |
| `pnpm test:mutation` | Запуск мутационного тестирования Stryker |
| `pnpm changeset` | Создание файла изменений для релиза |
| `pnpm version-packages` | Поднятие версий в `package.json` через Changesets |
| `pnpm release` | Сборка и публикация пакетов в npm |
