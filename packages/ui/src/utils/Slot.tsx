import {
  type CSSProperties,
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';

// Extends the standard HTML attributes so style/className/onClick/aria-* stay typed
// without an index signature (an index signature would erase named props in
// React's PropsWithoutRef and force casts at every use site).
export interface SlotProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  type?: string | undefined;
}

type ChildProps = HTMLAttributes<HTMLElement> & {
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

export const Slot = forwardRef<HTMLElement, SlotProps>((props, ref) => {
  const { children, ...restProps } = props;

  if (!isValidElement(children)) return null;

  const child = children as ReactElement<ChildProps>;

  const resolvedProps: ChildProps = {
    ...restProps,
    ...child.props,
    style: {
      ...(props.style as CSSProperties | undefined),
      ...child.props.style,
    },
    className: [props.className, child.props.className].filter(Boolean).join(' '),
    onClick: (event) => {
      props.onClick?.(event);
      child.props.onClick?.(event);
    },
    onPointerDown: (event) => {
      props.onPointerDown?.(event);
      child.props.onPointerDown?.(event);
    },
    ref: mergeRefs<unknown>(ref, child.props.ref),
  };

  return cloneElement(child, resolvedProps);
});
