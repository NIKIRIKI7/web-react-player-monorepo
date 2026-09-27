import { describe, expect, it } from 'vitest';
import {
  AudioMixerPlugin,
  BrowserTsxCompiler,
  createDefaultRemotionSuite,
  LucideIconsPlugin,
  RemotionPluginManager,
  TailwindPlugin,
  ThreePlugin,
  WebRendererExportEngine,
  WidgetRegistry,
} from '../src/index';

const EXPECTED_PLUGIN_IDS = [
  'remotion-plugin-audio-mixer',
  'remotion-plugin-lucide',
  'remotion-plugin-tailwind',
  'remotion-plugin-three',
];

describe('createDefaultRemotionSuite', () => {
  it('связывает все подсистемы комплекта между собой', () => {
    const suite = createDefaultRemotionSuite();

    expect(suite.pluginManager).toBeInstanceOf(RemotionPluginManager);
    expect(suite.compiler).toBeInstanceOf(BrowserTsxCompiler);
    expect(suite.exporter).toBeInstanceOf(WebRendererExportEngine);
    expect(suite.widgetRegistry).toBeInstanceOf(WidgetRegistry);
  });

  it('регистрирует встроенные плагины', () => {
    const suite = createDefaultRemotionSuite();
    const plugins = suite.pluginManager.getPlugins();

    expect(plugins.map((plugin) => plugin.id).sort()).toEqual(EXPECTED_PLUGIN_IDS);
    expect(plugins.some((plugin) => plugin instanceof LucideIconsPlugin)).toBe(true);
    expect(plugins.some((plugin) => plugin instanceof TailwindPlugin)).toBe(true);
    expect(plugins.some((plugin) => plugin instanceof ThreePlugin)).toBe(true);
    expect(plugins.some((plugin) => plugin instanceof AudioMixerPlugin)).toBe(true);
  });
});

describe('BrowserTsxCompiler', () => {
  it('компилирует валидный TSX и извлекает метаданные композиции', async () => {
    const { compiler } = createDefaultRemotionSuite();

    const source = [
      "import React from 'react';",
      'export const config = {',
      '  durationInFrames: 240,',
      '  fps: 60,',
      '  width: 1920,',
      '  height: 1080,',
      '  audioMix: {',
      "    voiceover: { src: 'speech.mp3', startFrom: 30, volume: 0.95 }",
      '  }',
      '};',
      'export const MyScene = () => <div id="test-node">Hello Remotion</div>;',
    ].join('\n');

    const { Component, detectedConfig } = await compiler.compile(source);

    expect(Component).toBeTypeOf('function');
    expect(detectedConfig?.durationInFrames).toBe(240);
    expect(detectedConfig?.fps).toBe(60);
    expect(detectedConfig?.width).toBe(1920);
    expect(detectedConfig?.height).toBe(1080);
    expect(detectedConfig?.audioMix?.voiceover?.src).toBe('speech.mp3');
    expect(detectedConfig?.audioMix?.voiceover?.startFrom).toBe(30);
  });

  it('подставляет ассеты из виртуальной файловой системы', async () => {
    const { compiler } = createDefaultRemotionSuite();

    const source = [
      "import React from 'react';",
      'export const config = {',
      "  audioMix: { voiceover: { src: 'voice.mp3' } }",
      '};',
      'export const Scene = () => <div />;',
    ].join('\n');

    const { detectedConfig } = await compiler.compile(source, {
      'voice.mp3': 'https://cdn.example.com/voice.mp3',
    });

    expect(detectedConfig?.audioMix?.voiceover?.src).toBe('https://cdn.example.com/voice.mp3');
  });

  it('не падает на незарегистрированном модуле, а подставляет пустую заглушку', async () => {
    const { compiler } = createDefaultRemotionSuite();

    const source = [
      "import React from 'react';",
      "import { Something } from 'not-a-registered-module';",
      'export const Scene = () => <div>{String(typeof Something)}</div>;',
    ].join('\n');

    const { Component } = await compiler.compile(source);

    expect(Component).toBeTypeOf('function');
  });
});

describe('BrowserTsxCompiler: диагностика для разработчика', () => {
  it('превращает синтаксическую ошибку в RemotionCompilerError', async () => {
    const { compiler } = createDefaultRemotionSuite();

    const broken = [
      "import React from 'react';",
      'export const Invalid = () => {',
      '  return <div unclosed_tag_with_syntax_error',
      '};',
    ].join('\n');

    await expect(compiler.compile(broken)).rejects.toMatchObject({
      name: 'RemotionCompilerError',
      type: 'SyntaxError',
    });
  });

  it('сообщает об отсутствии экспортируемого компонента', async () => {
    const { compiler } = createDefaultRemotionSuite();

    const source = [
      'export const config = { fps: 30, durationInFrames: 100 };',
      'export const someData = 42;',
    ].join('\n');

    await expect(compiler.compile(source)).rejects.toMatchObject({
      name: 'RemotionCompilerError',
      type: 'MissingComponentError',
    });
  });

  it('отклоняет некорректный звуковой слой', async () => {
    const { compiler } = createDefaultRemotionSuite();

    const source = [
      "import React from 'react';",
      'export const config = {',
      '  audioMix: { voiceover: { src: "voice.mp3", startFrom: -50 } }',
      '};',
      'export const Scene = () => <div />;',
    ].join('\n');

    await expect(compiler.compile(source)).rejects.toMatchObject({
      name: 'RemotionCompilerError',
      type: 'InvalidConfigError',
    });
  });

  it('отклоняет неизвестный протокол ресурса', async () => {
    const { compiler } = createDefaultRemotionSuite();

    const source = [
      "import React from 'react';",
      'export const config = {',
      "  audioMix: { voiceover: { src: 'file:///etc/passwd' } }",
      '};',
      'export const Scene = () => <div />;',
    ].join('\n');

    await expect(compiler.compile(source)).rejects.toMatchObject({
      name: 'RemotionCompilerError',
      type: 'InvalidConfigError',
    });
  });
});
