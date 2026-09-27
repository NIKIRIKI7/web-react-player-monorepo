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
/**
 * Свойства слота {@link Slot}.
 *
 * Наследует стандартные HTML-атрибуты, поэтому `style`, `className`,
 * `onClick` и `aria-*` остаются типизированными без индексной сигнатуры
 * (индексная сигнатура стёрла бы именованные свойства в
 * `PropsWithoutRef` и заставляла бы делать приведения типов в каждом месте
 * использования).
 *
 * @public
 * @example
 * ```tsx
 * import { Slot } from '@web-react-player/ui';
 *
 * <Slot className="button" onClick={handleClick}>
 *   <button>Воспроизвести</button>
 * </Slot>
 * ```
 */
export interface SlotProps extends HTMLAttributes<HTMLElement> {
  /**
   * Единственный дочерний элемент, которому передаются все свойства.
   *
   * Если дочерний узел не является валидным React-элементом, слот
   * отрисовывает `null`.
   *
   * @example
   * ```tsx
   * <Slot>
   *   <a href="/watch">Смотреть</a>
   * </Slot>
   * ```
   */
  children?: ReactNode;
  /**
   * Тип HTML-элемента.
   *
   * @example
   * ```tsx
   * <Slot type="submit" />
   * ```
   */
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

/**
 * Компонент-слот: передаёт свои свойства единственному дочернему элементу
 * вместо создания обёртки.
 *
 * Свойства ребёнка имеют приоритет, кроме составных: `style` сливается,
 * `className` конкатенируется, а `onClick` и `onPointerDown` вызывают
 * обработчики обоих уровней. Переданный `ref` объединяется с `ref` ребёнка.
 * Используется для поддержки паттерна `asChild` (см. `PlayButton`).
 *
 * @public
 * @example
 * ```tsx
 * import { Slot } from '@web-react-player/ui';
 *
 * <Slot aria-label="Play" className="icon-button" onClick={play}>
 *   <CustomIcon />
 * </Slot>
 * ```
 */
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
