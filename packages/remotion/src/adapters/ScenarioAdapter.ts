import type { CaptionCue, Chapter, Marker } from '@web-react-player/core';

/**
 * Слово с таймкодом в формате распознавания Whisper (WhisperX).
 *
 * @public
 * @example
 * ```ts
 * import type { WhisperWordCue } from '@web-react-player/remotion';
 *
 * const word: WhisperWordCue = { word: 'Привет', start: 0.4, end: 0.9 };
 * ```
 */
export interface WhisperWordCue {
  /**
   * Распознанное слово.
   *
   * @example
   * ```ts
   * word: 'Привет'
   * ```
   */
  word: string;
  /**
   * Начало слова в секундах.
   *
   * @example
   * ```ts
   * start: 0.4
   * ```
   */
  start: number;
  /**
   * Конец слова в секундах.
   *
   * @example
   * ```ts
   * end: 0.9
   * ```
   */
  end: number;
}

/**
 * Реплика с таймкодом в формате распознавания Whisper (WhisperX).
 *
 * @public
 * @example
 * ```ts
 * import type { WhisperCaptionCue } from '@web-react-player/remotion';
 *
 * const cue: WhisperCaptionCue = {
 *   id: 'cue-1',
 *   start: 0.4,
 *   end: 2.1,
 *   text: 'Привет, мир',
 *   words: [{ word: 'Привет', start: 0.4, end: 0.9 }],
 * };
 * ```
 */
export interface WhisperCaptionCue {
  /**
   * Идентификатор реплики.
   *
   * Генерируется автоматически, если не передан.
   *
   * @example
   * ```ts
   * id: 'cue-1'
   * ```
   */
  id?: string;
  /**
   * Начало реплики в секундах.
   *
   * @example
   * ```ts
   * start: 0.4
   * ```
   */
  start: number;
  /**
   * Конец реплики в секундах.
   *
   * @example
   * ```ts
   * end: 2.1
   * ```
   */
  end: number;
  /**
   * Текст реплики.
   *
   * @example
   * ```ts
   * text: 'Привет, мир'
   * ```
   */
  text: string;
  /**
   * Пословные таймкоды для подсветки активного слова.
   *
   * @example
   * ```ts
   * words: [{ word: 'Привет', start: 0.4, end: 0.9 }]
   * ```
   */
  words?: WhisperWordCue[];
}

/**
 * Допустимый формат входных данных субтитров сценария.
 *
 * Принимает как внутренний формат `CaptionCue` из `@web-react-player/core`,
 * так и формат распознавания Whisper.
 *
 * @public
 * @example
 * ```ts
 * import type { ScenarioCaptionInput } from '@web-react-player/remotion';
 *
 * const fromCore: ScenarioCaptionInput = { startTime: 0, endTime: 2, text: 'Привет' };
 * const fromWhisper: ScenarioCaptionInput = { start: 0, end: 2, text: 'Привет' };
 * ```
 */
export type ScenarioCaptionInput = CaptionCue | WhisperCaptionCue;

/**
 * Дополнительные входные данные для разбора сценария.
 *
 * @public
 * @example
 * ```ts
 * import { parseScenario, type ScenarioParseOptions } from '@web-react-player/remotion';
 *
 * const options: ScenarioParseOptions = {
 *   duration: 120,
 *   captions: [{ start: 0, end: 2, text: 'Привет' }],
 *   markers: [{ id: 'm1', type: 'intro', startTime: 0, endTime: 15 }],
 * };
 * ```
 */
export interface ScenarioParseOptions {
  /**
   * Длительность проекта в секундах.
   *
   * Используется как `endTime` последней главы, если в сценарии нет
   * следующего заголовка. Значение из frontmatter имеет приоритет.
   *
   * @example
   * ```ts
   * duration: 120
   * ```
   */
  duration?: number;
  /**
   * Субтитры, если они не переданы отдельным аргументом.
   *
   * @example
   * ```ts
   * captions: [{ start: 0, end: 2, text: 'Привет' }]
   * ```
   */
  captions?: ReadonlyArray<ScenarioCaptionInput>;
  /**
   * Маркеры, которые нужно добавить к результату разбора.
   *
   * @example
   * ```ts
   * markers: [{ id: 'm1', type: 'sponsor', startTime: 30, endTime: 90 }]
   * ```
   */
  markers?: ReadonlyArray<Marker>;
}

/**
 * Результат разбора сценария Vidora.
 *
 * @public
 * @example
 * ```ts
 * import { parseScenario } from '@web-react-player/remotion';
 *
 * const scenario = parseScenario(markdown, undefined, { duration: 120 });
 * scenario.title;    // 'Vidora Project'
 * scenario.chapters; // [{ title: 'Интро', startTime: 0, endTime: 30 }]
 * ```
 */
export interface VidoraScenarioData {
  /**
   * Заголовок проекта из frontmatter `title`.
   *
   * @example
   * ```ts
   * title: 'Обзор продукта'
   * ```
   */
  title: string;
  /**
   * Главы, восстановленные из заголовков с таймкодами.
   *
   * @example
   * ```ts
   * chapters: [{ title: 'Интро', startTime: 0, endTime: 30 }]
   * ```
   */
  chapters: Chapter[];
  /**
   * Нормализованные реплики субтитров.
   *
   * @example
   * ```ts
   * captions: [{ startTime: 0, endTime: 2, text: 'Привет' }]
   * ```
   */
  captions: CaptionCue[];
  /**
   * Маркеры, переданные в параметрах разбора.
   *
   * @example
   * ```ts
   * markers: [{ id: 'm1', type: 'sponsor', startTime: 30, endTime: 90 }]
   * ```
   */
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

const FRONTMATTER_PATTERN = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const CHAPTER_PATTERN =
  /^##[ \t]+(?:\[([^\]\r\n]+)\]|(\d{1,3}:\d{2}(?::\d{2})?))[ \t]*(?:[-|:][ \t]*)?([^\r\n]+)$/;

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

/**
 * Разбирает сценарий Vidora из Markdown.
 *
 * Из frontmatter извлекаются заголовок и длительность, а из тела — главы по
 * заголовкам с таймкодами вида `## 00:30 Название`. Главы сортируются по
 * времени, а `endTime` главы вычисляется по началу следующей; последняя
 * глава заканчивается на длительности проекта либо `Infinity`.
 *
 * Субтитры берутся из `whisperXData`, а при его отсутствии — из
 * `options.captions`, и приводятся к внутреннему формату `CaptionCue`.
 *
 * @param markdown - Исходный Markdown сценария.
 * @param whisperXData - Субтитры в формате Whisper.
 * @param options - Дополнительные данные: длительность, субтитры, маркеры.
 * @returns Нормализованные данные сценария.
 * @public
 * @example
 * ```ts
 * import { parseScenario } from '@web-react-player/remotion';
 *
 * const markdown = `---
 * title: Обзор
 * duration: 00:02:00
 * ---
 *
 * ## 00:00 Интро
 * ## 00:30 Основная часть`;
 *
 * const scenario = parseScenario(markdown);
 * console.log(scenario.title, scenario.chapters.length); // 'Обзор' 2
 * ```
 *
 * @example С готовыми субтитрами
 * ```ts
 * const scenario = parseScenario(markdown, undefined, {
 *   captions: [{ start: 0, end: 2, text: 'Привет' }],
 *   markers: [{ id: 'm1', type: 'intro', startTime: 0, endTime: 30 }],
 * });
 * ```
 */
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

/**
 * Разбирает строку таймкода в количество секунд.
 *
 * Поддерживает форматы `ss`, `mm:ss`, `hh:mm:ss` и вариант с точкой
 * (`12.5`) для субсекундной точности.
 *
 * @param value - Строка таймкода.
 * @returns Время в секундах либо `null`, если формат не распознан.
 * @public
 * @example
 * ```ts
 * import { scenarioTimeToSeconds } from '@web-react-player/remotion';
 *
 * scenarioTimeToSeconds('01:30');   // 90
 * scenarioTimeToSeconds('01:00:00'); // 3600
 * scenarioTimeToSeconds('12.5');    // 12.5
 * scenarioTimeToSeconds('abc');     // null
 * ```
 */
export function scenarioTimeToSeconds(value: string): number | null {
  return parseTime(value);
}

/**
 * Функциональная обёртка над разбором сценария.
 *
 * Содержит те же операции, что и {@link parseScenario} и
 * {@link scenarioTimeToSeconds}, и удобна для передачи целиком в качестве
 * одного объекта-адаптера.
 *
 * @public
 * @example
 * ```ts
 * import { ScenarioAdapter } from '@web-react-player/remotion';
 *
 * const scenario = ScenarioAdapter.parse(markdown);
 * const seconds = ScenarioAdapter.timeToSeconds('00:45'); // 45
 * ```
 */
export const ScenarioAdapter = {
  parse: parseScenario,
  timeToSeconds: scenarioTimeToSeconds,
};
