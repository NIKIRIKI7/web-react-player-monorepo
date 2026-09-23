import * as LucideIcons from 'lucide-react';
import React from 'react';
import type { IRemotionPlugin } from '../types';

export class LucideIconsPlugin implements IRemotionPlugin {
  public readonly id = 'remotion-plugin-lucide';
  public readonly name = 'Lucide Icons Provider';

  public resolveImports(moduleName: string): Record<string, unknown> | null {
    if (moduleName === 'lucide-react') {
      return this.createSafeProxy(LucideIcons as Record<string, unknown>);
    }
    return null;
  }

  private createSafeProxy(target: Record<string, unknown>): Record<string, unknown> {
    return new Proxy(target, {
      get(obj, prop: string) {
        if (prop in obj) {
          return obj[prop];
        }
        // Fallback-компонент, если запрошена несуществующая иконка
        return function FallbackIcon(props: React.SVGProps<SVGSVGElement>) {
          return React.createElement(
            'svg',
            {
              viewBox: '0 0 24 24',
              width: 24,
              height: 24,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              ...props,
            },
            React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
            React.createElement('line', { x1: 12, y1: 8, x2: 12, y2: 12 }),
            React.createElement('line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }),
          );
        };
      },
    });
  }
}
