import { describe, expect, it } from 'vitest';
import { createPlayerMachine, type PlayerEvent } from '../src/index';

describe('@web-react-player/core State Machine Engine', () => {
  it('1. Должен инициализироваться в статусе idle с дефолтным контекстом', () => {
    const machine = createPlayerMachine();
    const snapshot = machine.getSnapshot();

    expect(snapshot.status).toBe('idle');
    expect(snapshot.context.currentTime).toBe(0);
    expect(snapshot.context.volume).toBe(1);
    expect(snapshot.context.playbackRate).toBe(1);
    expect(snapshot.context.muted).toBe(false);
  });

  it('2. Должен производить предсказуемые переходы: idle -> loading -> ready -> playing -> paused', () => {
    const machine = createPlayerMachine();

    machine.send({ type: 'LOAD', src: 'https://cdn.example.com/media.mp4' });
    expect(machine.getSnapshot().status).toBe('loading');
    expect(machine.getSnapshot().context.src).toBe('https://cdn.example.com/media.mp4');

    machine.send({ type: 'METADATA_LOADED', duration: 100, fps: 30 });
    machine.send({ type: 'CAN_PLAY' });
    expect(machine.getSnapshot().status).toBe('ready');
    expect(machine.getSnapshot().context.duration).toBe(100);
    expect(machine.getSnapshot().context.durationInFrames).toBe(3000);

    machine.send({ type: 'PLAY' });
    expect(machine.getSnapshot().status).toBe('playing');

    machine.send({ type: 'PAUSE' });
    expect(machine.getSnapshot().status).toBe('paused');
  });

  it('3. Должен вычислять активную главу и маркер при TIME_UPDATE', () => {
    const machine = createPlayerMachine();

    machine.send({
      type: 'LOAD',
      src: 'test.mp4',
      chapters: [
        { title: 'Вступление', startTime: 0, endTime: 10 },
        { title: 'Глава 1', startTime: 10, endTime: 25 },
      ],
      markers: [{ type: 'sponsor', startTime: 5, endTime: 8, label: 'Реклама' }],
    });

    machine.send({ type: 'CAN_PLAY' });
    machine.send({ type: 'TIME_UPDATE', currentTime: 6 });

    const snapshot = machine.getSnapshot();
    expect(snapshot.context.activeChapter?.title).toBe('Вступление');
    expect(snapshot.context.activeMarker?.label).toBe('Реклама');

    machine.send({ type: 'TIME_UPDATE', currentTime: 15 });
    const updated = machine.getSnapshot();
    expect(updated.context.activeChapter?.title).toBe('Глава 1');
    expect(updated.context.activeMarker).toBeNull();
  });

  it('4. Пайплайн Middleware должен корректно перехватывать и модифицировать поток событий', () => {
    const machine = createPlayerMachine();
    const interceptedEvents: string[] = [];

    machine.use((event: PlayerEvent, _snapshot, next) => {
      interceptedEvents.push(event.type);
      next(event);
    });

    machine.send({ type: 'LOAD', src: 'test.mp4' });
    machine.send({ type: 'CAN_PLAY' });

    expect(interceptedEvents).toEqual(['LOAD', 'CAN_PLAY']);
  });
});
