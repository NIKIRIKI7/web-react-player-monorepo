import type { IRemotionPlugin, PluginPreflightContext } from '../types';

interface GlobalWithThree {
  THREE?: Record<string, unknown>;
}

export class ThreePlugin implements IRemotionPlugin {
  public readonly id = 'remotion-plugin-three';
  public readonly name = 'Three.js & 3D Objects Support';

  private threeInstances: Array<{ dispose?: () => void }> = [];

  public resolveImports(moduleName: string): Record<string, unknown> | null {
    if (moduleName === 'three' || moduleName === '@remotion/three') {
      const globalWithThree = globalThis as unknown as GlobalWithThree;
      const globalThree = globalWithThree.THREE;
      if (globalThree) {
        return {
          ...globalThree,
          default: globalThree,
        };
      }
    }
    return null;
  }

  public async preflight(_context: PluginPreflightContext): Promise<void> {
    if (typeof window !== 'undefined' && !('WebGLRenderingContext' in window)) {
      throw new Error('[ThreePlugin] WebGL is not supported in this environment');
    }
  }

  public registerInstance(instance: { dispose?: () => void }): void {
    this.threeInstances.push(instance);
  }

  public dispose(): void {
    for (const inst of this.threeInstances) {
      try {
        inst.dispose?.();
      } catch {
        // Игнорируем ошибки утилизации ресурсов GPU
      }
    }
    this.threeInstances = [];
  }
}
