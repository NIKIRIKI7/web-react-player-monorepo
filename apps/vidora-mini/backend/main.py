import asyncio
import json
import os
import shlex
import subprocess
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

app = FastAPI(title="Vidora Real FFmpeg API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
INPUT_VIDEO = MEDIA_DIR / "input_sample.mp4"
SAMPLE_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4"
FFMPEG_BINARY = os.getenv("FFMPEG_BINARY", "ffmpeg")
FFPROBE_BINARY = os.getenv("FFPROBE_BINARY", "ffprobe")

app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


class FFmpegConfig(BaseModel):
    lufsNormalizer: bool = False
    reverb: bool = False
    grayscale: bool = False
    blur: bool = False


class RenderRequest(BaseModel):
    scenarioId: str = Field(min_length=1)
    config: FFmpegConfig


render_jobs: dict[str, dict[str, Any]] = {}
render_processes: dict[str, subprocess.Popen[str]] = {}


def serialize_event(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def serialize_config(config: FFmpegConfig) -> dict[str, bool]:
    return config.model_dump()


async def download_sample_if_needed() -> None:
    if INPUT_VIDEO.is_file() and INPUT_VIDEO.stat().st_size > 0:
        return

    temporary_video = INPUT_VIDEO.with_suffix(".part")
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                async with client.stream(
                    "GET",
                    SAMPLE_VIDEO_URL,
                    headers={"User-Agent": "Mozilla/5.0"},
                ) as response:
                    response.raise_for_status()
                    with temporary_video.open("wb") as output:
                        async for chunk in response.aiter_bytes():
                            output.write(chunk)

            if temporary_video.stat().st_size == 0:
                raise RuntimeError("The sample video response was empty")
            temporary_video.replace(INPUT_VIDEO)
            return
        except Exception as error:
            last_error = error
            if attempt < 2:
                await asyncio.sleep(0.5)
        finally:
            temporary_video.unlink(missing_ok=True)

    if last_error is not None:
        raise last_error
    raise RuntimeError("The sample video could not be downloaded")


def get_video_duration(filepath: Path) -> float:
    command = [
        FFPROBE_BINARY,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(filepath),
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            check=True,
            text=True,
            timeout=30,
        )
        duration = float(result.stdout.strip())
    except (OSError, ValueError, subprocess.SubprocessError):
        return 10.0

    return duration if duration > 0 else 10.0


def build_ffmpeg_command(config: FFmpegConfig, output_file: Path) -> list[str]:
    audio_filters: list[str] = []
    if config.lufsNormalizer:
        audio_filters.append("loudnorm=I=-14:LRA=11:TP=-1.5")
    if config.reverb:
        audio_filters.append("aecho=0.8:0.9:1000:0.3")

    video_filters: list[str] = []
    if config.grayscale:
        video_filters.append("hue=s=0")
    if config.blur:
        video_filters.append("boxblur=5:1")

    command = [
        FFMPEG_BINARY,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(INPUT_VIDEO),
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-dn",
        "-map_chapters",
        "-1",
    ]

    if video_filters:
        command.extend(["-vf", ",".join(video_filters), "-c:v", "libx264", "-preset", "veryfast", "-crf", "23"])
    else:
        command.extend(["-c:v", "copy"])

    if audio_filters:
        command.extend(["-af", ",".join(audio_filters), "-c:a", "aac", "-b:a", "192k"])
    else:
        command.extend(["-c:a", "copy"])

    command.extend(
        [
            "-shortest",
            "-movflags",
            "+faststart",
            "-progress",
            "pipe:1",
            "-nostats",
            str(output_file),
        ]
    )
    return command


def parse_progress_time_us(line: str) -> int | None:
    for key in ("out_time_us", "out_time_ms"):
        prefix = f"{key}="
        if not line.startswith(prefix):
            continue
        try:
            time_us = int(line[len(prefix) :].strip())
        except ValueError:
            return None
        return time_us if time_us >= 0 else None
    return None


def resolve_config(
    job: dict[str, Any],
    lufs: bool | None,
    reverb: bool | None,
    gray: bool | None,
    blur: bool | None,
) -> FFmpegConfig:
    stored = job.get("config", {})
    return FFmpegConfig(
        lufsNormalizer=lufs if lufs is not None else bool(stored.get("lufsNormalizer", False)),
        reverb=reverb if reverb is not None else bool(stored.get("reverb", False)),
        grayscale=gray if gray is not None else bool(stored.get("grayscale", False)),
        blur=blur if blur is not None else bool(stored.get("blur", False)),
    )


async def stop_process(process: subprocess.Popen[str] | None) -> None:
    if process is None or process.poll() is not None:
        return

    process.terminate()
    try:
        await asyncio.to_thread(process.wait, 5)
    except subprocess.TimeoutExpired:
        process.kill()
        await asyncio.to_thread(process.wait)


@app.on_event("startup")
async def startup_event() -> None:
    try:
        await download_sample_if_needed()
        print(f"[System] Sample video ready: {INPUT_VIDEO}")
    except Exception as error:
        print(f"[System] Sample video download failed: {type(error).__name__}: {error}")


@app.post("/api/v1/render/start")
async def start_render(request: RenderRequest) -> dict[str, Any]:
    job_id = str(uuid.uuid4())
    config = serialize_config(request.config)
    render_jobs[job_id] = {
        "status": "processing",
        "progress": 0,
        "config": config,
    }
    print(f"[FFmpeg] Start job {job_id} for {request.scenarioId}: {config}")
    return {"jobId": job_id, "config": config}


@app.delete("/api/v1/render/jobs/{job_id}")
async def cancel_render(job_id: str) -> dict[str, str]:
    job = render_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    job["status"] = "cancelled"
    process = render_processes.get(job_id)
    if process is not None and process.poll() is None:
        process.terminate()
    return {"status": "cancelled"}


@app.get("/api/v1/render/progress/{job_id}")
async def render_progress(
    job_id: str,
    request: Request,
    lufs: bool | None = None,
    reverb: bool | None = None,
    gray: bool | None = None,
    blur: bool | None = None,
) -> StreamingResponse:
    async def event_generator() -> AsyncIterator[str]:
        job = render_jobs.get(job_id)
        if job is None:
            yield serialize_event({"status": "error", "message": "Job not found"})
            return

        if not INPUT_VIDEO.is_file():
            try:
                await download_sample_if_needed()
            except Exception as error:
                yield serialize_event({"status": "error", "message": f"Sample download failed: {error}"})
                return

        config = resolve_config(job, lufs, reverb, gray, blur)
        job["config"] = serialize_config(config)
        output_file = MEDIA_DIR / f"{job_id}.mp4"
        output_file.unlink(missing_ok=True)
        duration = get_video_duration(INPUT_VIDEO)
        command = build_ffmpeg_command(config, output_file)
        print(f"[FFmpeg] Command: {shlex.join(command)}")

        process: subprocess.Popen[str] | None = None
        diagnostics: list[str] = []

        try:
            if job.get("status") == "cancelled":
                yield serialize_event({"status": "cancelled", "message": "Render cancelled"})
                return

            job["status"] = "processing"
            job["progress"] = 0
            yield serialize_event({"status": "processing", "progress": 0})

            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            render_processes[job_id] = process
            if process.stdout is None:
                raise RuntimeError("FFmpeg stdout pipe was not created")

            last_progress = 0
            while True:
                line = await asyncio.to_thread(process.stdout.readline)
                if line == "":
                    break

                normalized_line = line.strip()
                if normalized_line and not normalized_line.startswith(
                    (
                        "bitrate=",
                        "drop_frames=",
                        "dup_frames=",
                        "fps=",
                        "out_time=",
                        "out_time_ms=",
                        "out_time_us=",
                        "progress=",
                        "speed=",
                        "total_size=",
                    )
                ):
                    diagnostics.append(normalized_line)
                    diagnostics = diagnostics[-8:]

                time_us = parse_progress_time_us(normalized_line)
                if time_us is not None and duration > 0:
                    progress = min(99, int((time_us / 1_000_000 / duration) * 100))
                    if progress > last_progress:
                        last_progress = progress
                        job["progress"] = progress
                        yield serialize_event({"status": "processing", "progress": progress})

            return_code = await asyncio.to_thread(process.wait)
            if job.get("status") == "cancelled":
                output_file.unlink(missing_ok=True)
                yield serialize_event({"status": "cancelled", "message": "Render cancelled"})
            elif return_code == 0 and output_file.is_file():
                job["status"] = "completed"
                job["progress"] = 100
                download_url = str(request.url_for("media", path=output_file.name))
                yield serialize_event(
                    {
                        "status": "completed",
                        "progress": 100,
                        "downloadUrl": download_url,
                    }
                )
            else:
                detail = diagnostics[-1] if diagnostics else f"exit code {return_code}"
                job["status"] = "error"
                yield serialize_event({"status": "error", "message": f"FFmpeg process failed: {detail}"})
                output_file.unlink(missing_ok=True)
        except asyncio.CancelledError:
            job["status"] = "cancelled"
            raise
        except (OSError, RuntimeError, ValueError) as error:
            job["status"] = "error"
            output_file.unlink(missing_ok=True)
            yield serialize_event({"status": "error", "message": str(error)})
        finally:
            if render_processes.get(job_id) is process:
                render_processes.pop(job_id, None)
            await stop_process(process)
            if process is not None and process.stdout is not None:
                process.stdout.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8355)
