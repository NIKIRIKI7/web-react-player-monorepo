import type React from 'react';
import type { ITsxCompiler, RemotionCompositionConfig } from '../compositionConfig';
import type { VidoraWidgetDefinition, VidoraWidgetPackage } from './types';
import { WidgetPropsEngine } from './WidgetPropsEngine';

/**
 * Реестр виджетов Vidora с ленивой компиляцией TSX.
 *
 * Реестр принимает JSON-пакеты, отдельные определения или JSON-строки,
 * компилирует компонент виджета только по требованию и кэширует результат.
 * Если TSX-код виджета изменился, кэш сбрасывается автоматически.
 *
 * @public
 * @example
 * ```ts
 * import { createDefaultRemotionSuite, type VidoraWidgetDefinition } from '@web-react-player/remotion';
 *
 * const { widgetRegistry } = createDefaultRemotionSuite();
 * const widget: VidoraWidgetDefinition = {
 *   id: 'lower-third',
 *   name: 'Lower Third',
 *   tsx_code: 'export const C = ({ title }) => <div>{title}</div>;',
 * };
 *
 * widgetRegistry.register(widget);
 * const Widget = await widgetRegistry.compile('lower-third');
 * ```
 */
export class WidgetRegistry {
  private widgets = new Map<string, VidoraWidgetDefinition>();
  private componentCache = new Map<string, React.ComponentType<Record<string, unknown>>>();

  /**
   * Создаёт реестр.
   *
   * @param compiler - Компилятор, используемый для сборки TSX виджетов.
   * @public
   * @example
   * ```ts
   * const { compiler, widgetRegistry } = createDefaultRemotionSuite();
   * ```
   */
  constructor(private compiler: ITsxCompiler) {}

  /**
   * Регистрирует JSON-пакет, отдельный виджет или JSON-строку
   *
   * @param input - Пакет, определение виджета или JSON-строка с ними.
   * @returns Массив успешно зарегистрированных определений.
   * @throws Если JSON не разбирается, формат некорректен либо у виджета
   * отсутствует строковый `id` или `tsx_code`.
   * @public
   * @example
   * ```ts
   * registry.register(widgetPackage);
   * registry.register(widgetDefinition);
   * registry.register(JSON.stringify(widgetDefinition));
   * ```
   */
  public register(
    input: VidoraWidgetPackage | VidoraWidgetDefinition | string,
  ): VidoraWidgetDefinition[] {
    let parsed: unknown = input;

    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch (err) {
        throw new Error(
          `[WidgetRegistry] Не удалось распарсить JSON виджета: ${(err as Error).message}`,
        );
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('[WidgetRegistry] Некорректный формат пакета виджетов.');
    }

    const registered: VidoraWidgetDefinition[] = [];

    // Пакет виджетов: { widgets: [...] }
    if ('widgets' in parsed && Array.isArray((parsed as VidoraWidgetPackage).widgets)) {
      for (const w of (parsed as VidoraWidgetPackage).widgets) {
        this.registerSingle(w);
        registered.push(w);
      }
    }
    // Одиночный виджет: { id: "...", tsx_code: "..." }
    else if ('id' in parsed && 'tsx_code' in parsed) {
      const widget = parsed as VidoraWidgetDefinition;
      this.registerSingle(widget);
      registered.push(widget);
    }

    return registered;
  }

  private registerSingle(widget: VidoraWidgetDefinition): void {
    if (!widget.id || typeof widget.id !== 'string') {
      throw new Error('[WidgetRegistry] Виджет должен содержать строковый id.');
    }
    if (!widget.tsx_code || typeof widget.tsx_code !== 'string') {
      throw new Error(`[WidgetRegistry] Виджет "${widget.id}" не содержит tsx_code.`);
    }

    // Если код виджета обновился, сбрасываем кэш скомпилированного компонента
    const existing = this.widgets.get(widget.id);
    if (existing && existing.tsx_code !== widget.tsx_code) {
      this.componentCache.delete(widget.id);
    }

    this.widgets.set(widget.id, widget);
  }

  /**
   * Возвращает определение виджета по идентификатору.
   *
   * @param id - Идентификатор виджета.
   * @returns Определение виджета либо `undefined`, если оно не зарегистрировано.
   * @public
   * @example
   * ```ts
   * const widget = registry.get('lower-third');
   * ```
   */
  public get(id: string): VidoraWidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  /**
   * Возвращает все зарегистрированные виджеты.
   *
   * @returns Массив определений в порядке регистрации.
   * @public
   * @example
   * ```ts
   * registry.getAll().forEach((w) => console.log(w.name));
   * ```
   */
  public getAll(): VidoraWidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Возвращает виджеты указанной категории.
   *
   * @param category - Имя категории.
   * @returns Отфильтрованный массив определений.
   * @public
   * @example
   * ```ts
   * const textWidgets = registry.getByCategory('text');
   * ```
   */
  public getByCategory(category: string): VidoraWidgetDefinition[] {
    return this.getAll().filter((w) => w.category === category);
  }

  /**
   * Компилирует виджет единожды и возвращает React-компонент из кэша
   *
   * @param idOrWidget - Идентификатор или само определение виджета.
   * @returns Скомпилированный компонент виджета.
   * @throws Если виджет не найден в реестре.
   * @public
   * @example
   * ```ts
   * const Widget = await registry.compile('lower-third');
   * <Widget title="Эпизод 1" />
   * ```
   */
  public async compile(
    idOrWidget: string | VidoraWidgetDefinition,
  ): Promise<React.ComponentType<Record<string, unknown>>> {
    const widget = typeof idOrWidget === 'string' ? this.get(idOrWidget) : idOrWidget;
    if (!widget) {
      throw new Error(`[WidgetRegistry] Виджет "${idOrWidget}" не найден в реестре.`);
    }

    const cached = this.componentCache.get(widget.id);
    if (cached) {
      return cached;
    }

    // Компиляция через встроенный TsxCompiler
    const { Component } = await this.compiler.compile(
      widget.tsx_code,
      {},
      { WIDGET_ID: widget.id },
    );

    this.componentCache.set(widget.id, Component);
    return Component;
  }

  /**
   * Нормализует пропсы пользователя
   *
   * Значения по умолчанию подставляются, типы приводятся к ожидаемым,
   * а неизвестные ключи удаляются.
   *
   * @param idOrWidget - Идентификатор или само определение виджета.
   * @param userProps - Пропсы, заданные пользователем.
   * @returns Нормализованные пропсы; для неизвестного виджета возвращаются
   * исходные значения без изменений.
   * @public
   * @example
   * ```ts
   * const props = registry.normalizeProps('lower-third', { title: 'Ролик' });
   * ```
   */
  public normalizeProps(
    idOrWidget: string | VidoraWidgetDefinition,
    userProps: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const widget = typeof idOrWidget === 'string' ? this.get(idOrWidget) : idOrWidget;
    if (!widget) return userProps;
    return WidgetPropsEngine.normalizeProps(widget, userProps);
  }

  /**
   * Извлекает конфигурацию композиции
   *
   * На основе схемы свойств и нормализованных значений выводит длительность
   * и размеры кадра, объявленные виджетом.
   *
   * @param idOrWidget - Идентификатор или само определение виджета.
   * @param userProps - Пропсы, заданные пользователем.
   * @returns Частичная конфигурация композиции; для неизвестного виджета —
   * пустой объект.
   * @public
   * @example
   * ```ts
   * const config = registry.getWidgetConfig('lower-third', { durationInFrames: 150 });
   * ```
   */
  public getWidgetConfig(
    idOrWidget: string | VidoraWidgetDefinition,
    userProps: Record<string, unknown> = {},
  ): Partial<RemotionCompositionConfig> {
    const widget = typeof idOrWidget === 'string' ? this.get(idOrWidget) : idOrWidget;
    if (!widget) return {};
    const normalized = WidgetPropsEngine.normalizeProps(widget, userProps);
    return WidgetPropsEngine.deriveCompositionConfig(widget, normalized);
  }

  /**
   * Очищает кэш скомпилированных компонентов.
   *
   * Определения виджетов при этом сохраняются.
   *
   * @public
   * @example
   * ```ts
   * registry.clearCache();
   * const Widget = await registry.compile('lower-third'); // пересборка
   * ```
   */
  public clearCache(): void {
    this.componentCache.clear();
  }
}
