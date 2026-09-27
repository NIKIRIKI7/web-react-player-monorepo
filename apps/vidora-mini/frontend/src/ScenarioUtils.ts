import type { CaptionCue, Chapter } from '@web-react-player/core';

type WhisperWord = {
  word: string;
  start: number;
  end: number;
};

export type WhisperXCue = CaptionCue & {
  words?: WhisperWord[];
};

const CHAPTER_PATTERN = /^##[ \t]+\[(\d{2}:\d{2})\][ \t]+(\S[^\r\n]*)$/gm;

function timeToSeconds(value: string): number | null {
  const parts = value.split(':');
  const minStr = parts[0];
  const secStr = parts[1];

  if (minStr === undefined || secStr === undefined || parts.length !== 2) {
    return null;
  }

  const minutes = Number(minStr);
  const seconds = Number(secStr);

  if (
    !(Number.isFinite(minutes) && Number.isFinite(seconds)) ||
    minutes < 0 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    return null;
  }

  return minutes * 60 + seconds;
}

function parseChapters(markdown: string): Chapter[] {
  const chapters: Chapter[] = [];
  let previousTitle = '';
  let previousStart: number | null = null;

  for (const match of markdown.matchAll(CHAPTER_PATTERN)) {
    const timeStr = match[1];
    const titleStr = match[2];

    if (timeStr === undefined || titleStr === undefined) continue;

    const startTime = timeToSeconds(timeStr);
    if (startTime === null) continue;

    const title = titleStr.trim();
    if (title.length === 0) continue;

    if (previousStart !== null) {
      chapters.push({
        title: previousTitle,
        startTime: previousStart,
        endTime: startTime,
      });
    }

    previousTitle = title;
    previousStart = startTime;
  }

  if (previousStart !== null) {
    chapters.push({
      title: previousTitle,
      startTime: previousStart,
      endTime: 99999,
    });
  }

  return chapters;
}

export const ScenarioAdapter = {
  parseChapters,
};

export const SAMPLE_MARKDOWN = `---
title: Vidora Test
---

## [00:00] Вступление
Здесь мы проверяем пословные субтитры.

## [00:03] Мастеринг
А при экспорте мы отправляем задачу на FFmpeg!`;

export const MOCK_WHISPERX: WhisperXCue[] = [
  {
    startTime: 0,
    endTime: 3,
    text: 'Здесь мы проверяем пословные субтитры.',
    words: [
      { word: 'Здесь', start: 0.1, end: 0.5 },
      { word: 'мы', start: 0.6, end: 0.8 },
      { word: 'проверяем', start: 0.9, end: 1.5 },
      { word: 'пословные', start: 1.6, end: 2.3 },
      { word: 'субтитры.', start: 2.4, end: 3 },
    ],
  },
  {
    startTime: 3.1,
    endTime: 6,
    text: 'А при экспорте мы отправляем задачу на FFmpeg!',
    words: [
      { word: 'А', start: 3.2, end: 3.3 },
      { word: 'при', start: 3.4, end: 3.6 },
      { word: 'экспорте', start: 3.7, end: 4.2 },
      { word: 'мы', start: 4.3, end: 4.5 },
      { word: 'отправляем', start: 4.6, end: 5.1 },
      { word: 'задачу', start: 5.2, end: 5.5 },
      { word: 'на', start: 5.6, end: 5.7 },
      { word: 'FFmpeg!', start: 5.8, end: 6 },
    ],
  },
];
