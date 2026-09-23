import React from 'react';
import type { IRemotionPlugin, RemotionCompositionConfig } from '../types';

export class TailwindPlugin implements IRemotionPlugin {
  public readonly id = 'remotion-plugin-tailwind';
  public readonly name = 'Tailwind Scoped Styles';

  private customStyles: string;

  constructor(customCss = '') {
    this.customStyles = customCss;
  }

  public wrapComponent(
    Component: React.ComponentType<Record<string, unknown>>,
    config: RemotionCompositionConfig,
  ): React.ComponentType<Record<string, unknown>> {
    const customCss = this.customStyles;

    return function TailwindScopedContainer(props: Record<string, unknown>) {
      return React.createElement(
        'div',
        {
          'data-remotion-tailwind-scope': '',
          style: {
            width: `${config.width}px`,
            height: `${config.height}px`,
            position: 'relative',
            overflow: 'hidden',
          },
        },
        customCss ? React.createElement('style', null, customCss) : null,
        React.createElement(Component, props),
      );
    };
  }
}
