/**
 * Форматирует время в секундах как `мм:сс` или `ч:мм:сс`.
 *
 * Минуты и секунды дополняются нулём до двух цифр, а часы добавляются только
 * при длительности от одного часа. Нечисловые и отрицательные значения
 * трактуются как `00:00`.
 *
 * @param seconds - Время в секундах.
 * @returns Строка вида `MM:SS` либо `H:MM:SS`.
 * @public
 * @example
 * ```ts
 * import { formatTime } from '@web-react-player/ui';
 *
 * formatTime(0);     // '00:00'
 * formatTime(75);    // '01:15'
 * formatTime(3725);  // '1:02:05'
 * formatTime(-10);   // '00:00'
 * ```
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const paddedM = m.toString().padStart(2, '0');
  const paddedS = s.toString().padStart(2, '0');

  if (h > 0) {
    return `${h}:${paddedM}:${paddedS}`;
  }
  return `${paddedM}:${paddedS}`;
}
