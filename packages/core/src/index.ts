/**
 * Zero-dependency ядро видеоплеера: детерминированный конечный автомат
 * состояний (FSM), типизированные события и контекст данных.
 *
 * Пакет не импортирует React, DOM и сторонние библиотеки, поэтому его можно
 * использовать в Node.js, в тестах, на сервере и в любом UI-фреймворке.
 *
 * @packageDocumentation
 *
 * @example Полный цикл жизни плеера без UI
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * const unsubscribe = machine.subscribe(({ status, context }) => {
 *   console.log(`[${status}] ${context.currentTime.toFixed(1)}s / ${context.duration}s`);
 * });
 *
 * machine.send({
 *   type: 'LOAD',
 *   src: 'https://example.com/movie.mp4',
 *   chapters: [{ title: 'Пролог', startTime: 0, endTime: 60 }],
 *   captions: [{ startTime: 0, endTime: 2, text: 'Давным-давно…' }],
 *   markers: [{ type: 'intro', startTime: 0, endTime: 10, label: 'Интро' }],
 * });
 * machine.send({ type: 'METADATA_LOADED', duration: 120, fps: 30 });
 * machine.send({ type: 'PLAY' });
 * machine.send({ type: 'TIME_UPDATE', currentTime: 12.4, bufferedEnd: 40 });
 * machine.send({ type: 'ENDED' });
 * unsubscribe();
 * ```
 *
 * @example Расширение поведения через middleware
 * ```ts
 * import { createPlayerMachine } from '@web-react-player/core';
 *
 * const machine = createPlayerMachine();
 * machine.use((event, snapshot, next) => {
 *   if (event.type === 'PLAY' && snapshot.context.duration === 0) {
 *     return; // нельзя играть, пока неизвестна длительность
 *   }
 *   next(event);
 * });
 * ```
 *
 * @example События и контекст в чистом TypeScript
 * ```ts
 * import { type PlayerEvent, type PlayerSnapshot, createPlayerMachine } from '@web-react-player/core';
 *
 * function onEvent(event: PlayerEvent, snapshot: PlayerSnapshot): void {
 *   if (event.type === 'QUALITY_CHANGE') {
 *     console.log('качество:', event.quality?.id ?? 'auto', 'auto:', event.auto ?? false);
 *   }
 *   console.log(snapshot.status);
 * }
 *
 * const machine = createPlayerMachine();
 * machine.subscribe(onEvent);
 * ```
 */

export * from './fsm/machine';
export * from './fsm/types';
