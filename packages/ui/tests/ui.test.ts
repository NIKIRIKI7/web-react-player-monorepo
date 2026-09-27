import { describe, expect, it } from 'vitest';
import { captionStylesToCssVariables, formatTime, getContainerTier, hexToRgba } from '../src/index';

describe('@web-react-player/ui Utilities & Visual Calculations', () => {
  it('1. formatTime должен форматировать секунды в читаемый формат mm:ss или h:mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(599)).toBe('09:59');
    expect(formatTime(3665)).toBe('1:01:05');
    expect(formatTime(-10)).toBe('00:00');
  });

  it('2. hexToRgba должен корректно переводить HEX-цвета в формат RGBA с прозрачностью', () => {
    expect(hexToRgba('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    expect(hexToRgba('#38bdf8', 0.8)).toBe('rgba(56, 189, 248, 0.8)');
  });

  it('3. captionStylesToCssVariables должен рассчитывать набор CSS-переменных для субтитров', () => {
    const vars = captionStylesToCssVariables({
      fontSize: '150%',
      textColor: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 0.8,
      textShadow: 'drop-shadow',
      fontFamily: 'pro-sans',
    });

    expect(vars['--player-cue-font-size']).toBe('23px');
    expect(vars['--player-cue-color']).toBe('#ffffff');
    expect(vars['--player-cue-bg']).toBe('rgba(0, 0, 0, 0.8)');
    expect(vars['--player-cue-shadow']).toContain('rgba(0,0,0,0.8)');
  });

  it('4. getContainerTier должен определять адаптивный уровень плотности контролов плеера', () => {
    expect(getContainerTier(900)).toBe('xl');
    expect(getContainerTier(700)).toBe('lg');
    expect(getContainerTier(600)).toBe('md');
    expect(getContainerTier(400)).toBe('sm');
    expect(getContainerTier(300)).toBe('xs');
  });
});
