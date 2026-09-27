import type { CaptionCue, Chapter, Marker } from '@web-react-player/core';

export interface WhisperWordCue {
  word: string;
  start: number;
  end: number;
}

export interface WhisperCaptionCue {
  id?: string;
  start: number;
  end: number;
  text: string;
  words?: WhisperWordCue[];
}

export type ScenarioCaptionInput = CaptionCue | WhisperCaptionCue;

export interface ScenarioParseOptions {
  duration?: number;
  captions?: ReadonlyArray<ScenarioCaptionInput>;
  markers?: ReadonlyArray<Marker>;
}

export interface VidoraScenarioData {
  title: string;
  chapters: Chapter[];
  captions: CaptionCue[];
  markers: Marker[];
}

interface FrontmatterData {
  body: string;
  values: Map<string, string>;
}

interface ChapterHeading {
  title: string;
  startTime: number;
}

const FRONTMATTER_PATTERN = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const CHAPTER_PATTERN =
  /^##\s+(?:\[([^\]]+)\]|(\d{1,3}:\d{2}(?::\d{2})?))\s*(?:[-|:]\s*)?(.+?)\s*$/;

function parseFrontmatter(markdown: string): FrontmatterData {
  const match = markdown.match(FRONTMATTER_PATTERN);
  if (!match) return { body: markdown, values: new Map() };

  const values = new Map<string, string>();
  const frontmatterBody = match[1];
  if (!frontmatterBody) return { body: markdown, values };

  for (const line of frontmatterBody.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, '$2');
    if (key) values.set(key, value);
  }

  return {
    body: markdown.slice(match[0].length),
    values,
  };
}

function parseTime(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const seconds = Number(normalized);
    return Number.isFinite(seconds) ? seconds : null;
  }

  const parts = normalized.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => part.trim() === '')) {
    return null;
  }

  const values = parts.map((part) => Number(part));
  if (values.some((value) => !Number.isFinite(value))) return null;

  if (values.length === 2) {
    const minutes = values[0];
    const seconds = values[1];
    if (minutes === undefined || seconds === undefined) return null;
    return seconds < 60 ? minutes * 60 + seconds : null;
  }

  const hours = values[0];
  const minutes = values[1];
  const seconds = values[2];
  if (hours === undefined || minutes === undefined || seconds === undefined) return null;
  return minutes < 60 && seconds < 60 ? hours * 3600 + minutes * 60 + seconds : null;
}

function parseChapterHeading(line: string): ChapterHeading | null {
  const match = line.match(CHAPTER_PATTERN);
  if (!match) return null;

  const timeRaw = match[1] ?? match[2];
  const titleRaw = match[3];
  if (!(timeRaw && titleRaw)) return null;

  const startTime = parseTime(timeRaw);
  const title = titleRaw.trim();
  return startTime === null || title.length === 0 ? null : { title, startTime };
}

function normalizeCaption(cue: ScenarioCaptionInput): CaptionCue {
  if ('startTime' in cue) {
    return {
      ...(cue.id ? { id: cue.id } : {}),
      startTime: cue.startTime,
      endTime: cue.endTime,
      text: cue.text,
      ...(cue.words ? { words: cue.words.map((word) => ({ ...word })) } : {}),
    };
  }

  return {
    ...(cue.id ? { id: cue.id } : {}),
    startTime: cue.start,
    endTime: cue.end,
    text: cue.text,
    ...(cue.words ? { words: cue.words.map((word) => ({ ...word })) } : {}),
  };
}

function getDuration(
  values: Map<string, string>,
  options: ScenarioParseOptions,
): number | undefined {
  if (options.duration !== undefined) {
    return Number.isFinite(options.duration) && options.duration >= 0
      ? options.duration
      : undefined;
  }

  const value = values.get('duration') ?? values.get('durationSeconds');
  return value ? (parseTime(value) ?? undefined) : undefined;
}

export function parseScenario(
  markdown: string,
  whisperXData?: ReadonlyArray<ScenarioCaptionInput>,
  options: ScenarioParseOptions = {},
): VidoraScenarioData {
  const { body, values } = parseFrontmatter(markdown);
  const headings = body
    .split(/\r?\n/)
    .map((line) => parseChapterHeading(line))
    .filter((heading): heading is ChapterHeading => heading !== null)
    .sort((left, right) => left.startTime - right.startTime);
  const duration = getDuration(values, options);

  const chapters = headings.map((heading, index) => {
    const nextStartTime = headings[index + 1]?.startTime;
    const endTime = nextStartTime ?? duration ?? Number.POSITIVE_INFINITY;
    return {
      title: heading.title,
      startTime: heading.startTime,
      endTime: Math.max(heading.startTime, endTime),
    };
  });

  const captions = (whisperXData ?? options.captions ?? []).map(normalizeCaption);
  const markers = [...(options.markers ?? [])];

  return {
    title: values.get('title') || 'Vidora Project',
    chapters,
    captions,
    markers,
  };
}

export function scenarioTimeToSeconds(value: string): number | null {
  return parseTime(value);
}

export const ScenarioAdapter = {
  parse: parseScenario,
  timeToSeconds: scenarioTimeToSeconds,
};
