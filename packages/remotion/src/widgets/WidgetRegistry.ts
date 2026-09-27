import type React from 'react';
import type { ITsxCompiler, RemotionCompositionConfig } from '../compositionConfig';
import type { VidoraWidgetDefinition, VidoraWidgetPackage } from './types';
import { WidgetPropsEngine } from './WidgetPropsEngine';

export class WidgetRegistry {
  private widgets = new Map<string, VidoraWidgetDefinition>();
  private componentCache = new Map<string, React.ComponentType<Record<string, unknown>>>();

  constructor(private compiler: ITsxCompiler) {}

  /**
   * Регистрирует JSON-пакет, отдельный виджет или JSON-строку
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

  public get(id: string): VidoraWidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  public getAll(): VidoraWidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  public getByCategory(category: string): VidoraWidgetDefinition[] {
    return this.getAll().filter((w) => w.category === category);
  }

  /**
   * Компилирует виджет единожды и возвращает React-компонент из кэша
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

  public clearCache(): void {
    this.componentCache.clear();
  }
}
