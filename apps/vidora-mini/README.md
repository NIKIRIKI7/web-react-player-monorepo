# Vidora Mini

Мини-приложение Vidora: React/Vite frontend с видеоплеером и караоке-субтитрами, а также FastAPI backend, который запускает настоящий FFmpeg и передаёт прогресс через SSE.

## Требования

- Node.js `20.19+` или `22.12+`
- pnpm `12.4.2`
- Python `3.10+`
- FFmpeg и ffprobe, доступные в `PATH`
- Доступ в интернет для загрузки тестового видео при первом запуске

## Установка frontend

Выполните из корня репозитория:

```bash
pnpm install
```

## Запуск backend

Откройте отдельный терминал:

```bash
cd apps/vidora-mini/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8355
```

Для Linux/macOS активация окружения выполняется командой:

```bash
source .venv/bin/activate
```

Backend будет доступен на:

- API: `http://localhost:8355`
- Swagger UI: `http://localhost:8355/docs`

## Запуск frontend

Во втором терминале из корня репозитория выполните:

```bash
pnpm --filter vidora-tester dev
```

Откройте `http://localhost:5174` в браузере.

## Одновременный запуск PowerShell

Из корня репозитория можно запустить backend и frontend одной командой:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\vidora-mini\start.ps1
```

Скрипт дождётся готовности обоих сервисов и остановит их по `Ctrl+C`. Для первоначальной установки frontend-зависимостей и backend virtualenv используйте:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\vidora-mini\start.ps1 -Install
```

## Production-сборка frontend

```bash
pnpm --filter vidora-tester build
pnpm --filter vidora-tester preview
```

## API рендера

- `POST /api/v1/render/start` — принимает `scenarioId` и конфигурацию фильтров, создаёт задачу и возвращает `jobId`.
- `GET /api/v1/render/progress/{jobId}` — запускает FFmpeg и отдаёт реальный прогресс через `text/event-stream`.
- `GET /media/input_sample.mp4` — тестовое видео, которое backend скачивает при первом запуске.
- При завершении backend возвращает ссылку на готовый MP4 в `/media/{jobId}.mp4`.

Доступные фильтры: LUFS-нормализация, reverb, чёрно-белое и размытие. Если `ffmpeg` или `ffprobe` недоступны в `PATH`, backend вернёт ошибку в SSE.

## Структура

```text
apps/vidora-mini/
├── start.ps1
├── backend/
│   ├── main.py
│   ├── media/              # скачанный sample и готовые рендеры
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── KaraokeCaptions.tsx
    │   ├── ScenarioUtils.ts
    │   └── VidoraFFmpegService.ts
    ├── package.json
    └── vite.config.ts
```
