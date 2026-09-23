import type React from 'react';
import type {
  ExportProgressData,
  IRemotionPlugin,
  PluginPreflightContext,
  RemotionCompositionConfig,
} from '../types';

export class RemotionPluginManager {
  private plugins = new Map<string, IRemotionPlugin>();

  public register(plugin: IRemotionPlugin): this {
    if (this.plugins.has(plugin.id)) {
      this.plugins.get(plugin.id)?.dispose?.();
    }
    this.plugins.set(plugin.id, plugin);
    return this;
  }

  public unregister(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.dispose?.();
      return this.plugins.delete(pluginId);
    }
    return false;
  }

  public getPlugins(): IRemotionPlugin[] {
    return Array.from(this.plugins.values());
  }

  public resolveVirtualModule(moduleName: string): Record<string, unknown> | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.resolveImports) {
        const resolved = plugin.resolveImports(moduleName);
        if (resolved) return resolved;
      }
    }
    return null;
  }

  public async runPreflightAll(context: PluginPreflightContext): Promise<void> {
    const preflightPromises: Promise<void>[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.preflight) {
        preflightPromises.push(plugin.preflight(context));
      }
    }
    await Promise.all(preflightPromises);
  }

  public applySourceTransforms(sourceCode: string): string {
    let transformed = sourceCode;
    for (const plugin of this.plugins.values()) {
      if (plugin.transformSource) {
        transformed = plugin.transformSource(transformed);
      }
    }
    return transformed;
  }

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

  public notifyExportProgress(progress: ExportProgressData): void {
    for (const plugin of this.plugins.values()) {
      plugin.onExportProgress?.(progress);
    }
  }

  public disposeAll(): void {
    for (const plugin of this.plugins.values()) {
      plugin.dispose?.();
    }
    this.plugins.clear();
  }
}
