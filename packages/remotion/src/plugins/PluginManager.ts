import type React from 'react';
import type {
  ExportProgressData,
  IRemotionPlugin,
  PluginPreflightContext,
  RemotionCompositionConfig,
} from '../types';

/**
 * Менеджер плагинов Remotion.
 *
 * Хранит зарегистрированные плагины в порядке регистрации и прогоняет через
 * них весь конвейер: предварительную проверку конфигурации, разрешение
 * виртуальных импортов, преобразование исходного кода, обёртку компонента
 * композиции и уведомления о прогрессе экспорта.
 *
 * Плагины с одинаковым `id` заменяют друг друга: при повторной регистрации
 * прежний плагин освобождает ресурсы через `dispose`.
 *
 * @public
 * @example
 * ```ts
 * import { RemotionPluginManager, ThreePlugin } from '@web-react-player/remotion';
 *
 * const manager = new RemotionPluginManager();
 * manager.register(new ThreePlugin());
 * console.log(manager.getPlugins().map((p) => p.id)); // ['remotion-plugin-three']
 * ```
 */
export class RemotionPluginManager {
  private plugins = new Map<string, IRemotionPlugin>();

  /**
   * Регистрирует плагин.
   *
   * Если плагин с таким же `id` уже зарегистрирован, его ресурсы
   * освобождаются, а новый плагин занимает его место.
   *
   * @param plugin - Плагин для регистрации.
   * @returns Тот же менеджер для цепочки вызовов.
   * @public
   * @example
   * ```ts
   * manager
   *   .register(new LucideIconsPlugin())
   *   .register(new TailwindPlugin());
   * ```
   */
  public register(plugin: IRemotionPlugin): this {
    if (this.plugins.has(plugin.id)) {
      this.plugins.get(plugin.id)?.dispose?.();
    }
    this.plugins.set(plugin.id, plugin);
    return this;
  }

  /**
   * Удаляет плагин по идентификатору и освобождает его ресурсы.
   *
   * @param pluginId - Идентификатор плагина.
   * @returns `true`, если плагин был найден и удалён.
   * @public
   * @example
   * ```ts
   * manager.unregister('remotion-plugin-three'); // true
   * ```
   */
  public unregister(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.dispose?.();
      return this.plugins.delete(pluginId);
    }
    return false;
  }

  /**
   * Возвращает все зарегистрированные плагины в порядке регистрации.
   *
   * @returns Массив плагинов.
   * @public
   * @example
   * ```ts
   * manager.getPlugins().forEach((plugin) => console.log(plugin.name));
   * ```
   */
  public getPlugins(): IRemotionPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Разрешает имя модуля через плагины.
   *
   * Первый плагин, вернувший модуль, выигрывает; порядок соответствует
   * порядку регистрации.
   *
   * @param moduleName - Имя импортируемого модуля.
   * @returns Экспорты модуля либо `null`, если ни один плагин его не предоставил.
   * @public
   * @example
   * ```ts
   * const icons = manager.resolveVirtualModule('lucide-react');
   * ```
   */
  public resolveVirtualModule(moduleName: string): Record<string, unknown> | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.resolveImports) {
        const resolved = plugin.resolveImports(moduleName);
        if (resolved) return resolved;
      }
    }
    return null;
  }

  /**
   * Запускает предварительную проверку у всех плагинов.
   *
   * Проверки выполняются параллельно; ошибка любого плагина отклоняет промис.
   *
   * @param context - Контекст проверки: конфигурация, пропсы, сигнал отмены.
   * @throws Ошибка, брошенная одним из плагинов.
   * @public
   * @example
   * ```ts
   * await manager.runPreflightAll({ config, inputProps: { title: 'Ролик' } });
   * ```
   */
  public async runPreflightAll(context: PluginPreflightContext): Promise<void> {
    const preflightPromises: Promise<void>[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.preflight) {
        preflightPromises.push(plugin.preflight(context));
      }
    }
    await Promise.all(preflightPromises);
  }

  /**
   * Прогоняет исходный код через `transformSource` всех плагинов.
   *
   * Преобразования применяются последовательно, в порядке регистрации, так
   * что каждый плагин видит результат предыдущих.
   *
   * @param sourceCode - Исходный код композиции.
   * @returns Преобразованный код.
   * @public
   * @example
   * ```ts
   * const compiled = manager.applySourceTransforms(code);
   * ```
   */
  public applySourceTransforms(sourceCode: string): string {
    let transformed = sourceCode;
    for (const plugin of this.plugins.values()) {
      if (plugin.transformSource) {
        transformed = plugin.transformSource(transformed);
      }
    }
    return transformed;
  }

  /**
   * Оборачивает компонент композиции через `wrapComponent` всех плагинов.
   *
   * Обёртки накладываются в порядке регистрации, поэтому плагин,
   * зарегистрированный позже, оказывается снаружи.
   *
   * @param Component - Исходный компонент композиции.
   * @param config - Конфигурация композиции, передаваемая обёрткам.
   * @returns Компонент с наложенными обёртками.
   * @public
   * @example
   * ```ts
   * const Wrapped = manager.applyComponentWrappers(Composition, config);
   * <Wrapped inputProps={{ title: 'Ролик' }} />
   * ```
   */
  public applyComponentWrappers(
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
  ): React.ComponentType<Record<string, unknown>> {
    let Wrapped = Component;
    for (const plugin of this.plugins.values()) {
      if (plugin.wrapComponent) {
        Wrapped = plugin.wrapComponent(Wrapped, config);
      }
    }
    return Wrapped;
  }

  /**
   * Уведомляет все плагины о прогрессе экспорта.
   *
   * @param progress - Данные о ходе экспорта.
   * @public
   * @example
   * ```ts
   * manager.notifyExportProgress({ progress: 0.5, renderedFrames: 150, totalFrames: 300, encodedFrames: 140 });
   * ```
   */
  public notifyExportProgress(progress: ExportProgressData): void {
    for (const plugin of this.plugins.values()) {
      plugin.onExportProgress?.(progress);
    }
  }

  /**
   * Освобождает ресурсы всех плагинов и очищает реестр.
   *
   * @public
   * @example
   * ```ts
   * useEffect(() => () => manager.disposeAll(), [manager]);
   * ```
   */
  public disposeAll(): void {
    for (const plugin of this.plugins.values()) {
      plugin.dispose?.();
    }
    this.plugins.clear();
  }
}
