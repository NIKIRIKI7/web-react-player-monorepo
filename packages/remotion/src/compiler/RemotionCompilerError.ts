import type { CompilerError } from '../types';

/**
 * Ошибка компиляции Remotion с машиночитаемым типом и подсказкой.
 *
 * Устанавливает `name` в `RemotionCompilerError`, поэтому ошибка корректно
 * отображается в devtools и при сериализации.
 *
 * @public
 * @example
 * ```ts
 * import { RemotionCompilerError } from '@web-react-player/remotion';
 *
 * throw new RemotionCompilerError(
 *   'MissingComponentError',
 *   'В коде нет экспортируемого компонента композиции.',
 *   'Добавьте export default или export const Composition.',
 * );
 * ```
 */
export class RemotionCompilerError extends Error implements CompilerError {
  /**
   * Категория ошибки.
   *
   * @example
   * ```ts
   * if (error.type === 'InvalidConfigError') showConfigHint();
   * ```
   */
  public readonly type: CompilerError['type'];
  /**
   * Подсказка по исправлению ошибки.
   *
   * @example
   * ```ts
   * console.log(error.suggestion);
   * ```
   */
  public readonly suggestion?: string | undefined;

  /**
   * Создаёт ошибку компиляции.
   *
   * @param type - Категория ошибки.
   * @param message - Текст ошибки.
   * @param suggestion - Необязательная подсказка по исправлению.
   * @public
   * @example
   * ```ts
   * new RemotionCompilerError('SyntaxError', 'Неожиданный токен', 'Проверьте фигурные скобки.');
   * ```
   */
  constructor(type: CompilerError['type'], message: string, suggestion?: string) {
    super(message);
    this.type = type;
    this.suggestion = suggestion;
    this.name = 'RemotionCompilerError';
  }
}
