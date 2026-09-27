import { describe, expect, it } from 'vitest';
import { parseScenario, scenarioTimeToSeconds } from '../src/adapters/ScenarioAdapter';

const script = `---
title: Тестовый сценарий
duration: 120
---

[0:00-0:10]
Привет, это первая сцена.

## 00:10 Первая глава
Текст первой главы.

## 01:00 - Вторая глава
Текст второй главы.

## 02:00 | Третья глава
Текст третьей главы.

## [03:00] Четвёртая глава
Текст четвёртой главы.
`;

describe('parseScenario: заголовки глав', () => {
  it('извлекает главы в обоих форматах', () => {
    const scenario = parseScenario(script, []);
    expect(scenario.chapters.map((c) => ({ title: c.title, startTime: c.startTime }))).toEqual([
      { title: 'Первая глава', startTime: 10 },
      { title: 'Вторая глава', startTime: 60 },
      { title: 'Третья глава', startTime: 120 },
      { title: 'Четвёртая глава', startTime: 180 },
    ]);
    expect(scenario.title).toBe('Тестовый сценарий');
  });

  it('не превращает обычный текст в главу', () => {
    const scenario = parseScenario('## Просто раздел\nтекст\n', []);
    expect(scenario.chapters).toEqual([]);
  });

  it('игнорирует заголовок без названия', () => {
    expect(parseScenario('## 00:30\n', []).chapters).toEqual([]);
  });
});

describe('scenarioTimeToSeconds', () => {
  it('переводит mm:ss и h:mm:ss', () => {
    expect(scenarioTimeToSeconds('00:30')).toBe(30);
    expect(scenarioTimeToSeconds('01:02:03')).toBe(3723);
    expect(scenarioTimeToSeconds('broken')).toBeNull();
  });
});
