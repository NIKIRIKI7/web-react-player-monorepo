import {
  type CSSProperties,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';

export interface SlotProps extends Record<string, unknown> {
  children?: ReactNode;
  ref?: Ref<unknown>;
  className?: string;
  style?: CSSProperties;
  onClick?: (event: SyntheticEvent) => void;
  onPointerDown?: (event: SyntheticEvent) => void;
}

type ChildProps = {
  className?: string;
  style?: CSSProperties;
  onClick?: (event: SyntheticEvent) => void;
  onPointerDown?: (event: SyntheticEvent) => void;
  ref?: Ref<unknown>;
};

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as { current: T | null }).current = node;
      }
    }
  };
}

export const Slot = forwardRef<unknown, SlotProps>(({ children, ...props }, ref) => {
  if (!isValidElement(children)) return null;

  const child = children as ReactElement<ChildProps>;

  const resolvedProps: Record<string, unknown> = {
    ...props,
    ...child.props,
    style: {
      ...(props.style as CSSProperties | undefined),
      ...child.props.style,
    },
    className: [props.className, child.props.className].filter(Boolean).join(' '),
    onClick: (event: SyntheticEvent) => {
      (props.onClick as SlotProps['onClick'])?.(event);
      child.props.onClick?.(event);
    },
    onPointerDown: (event: SyntheticEvent) => {
      (props.onPointerDown as SlotProps['onPointerDown'])?.(event);
      child.props.onPointerDown?.(event);
    },
    ref: mergeRefs<unknown>(ref, child.props.ref),
  };

  return cloneElement(child, resolvedProps as Record<string, unknown>);
});
