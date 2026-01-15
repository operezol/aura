export enum VNodeType {
  ELEMENT = 'ELEMENT',
  TEXT = 'TEXT',
  COMPONENT = 'COMPONENT',
  FRAGMENT = 'FRAGMENT'
}

export interface BaseVNode {
  type: VNodeType;
  key?: string | number;
}

export interface ElementVNode extends BaseVNode {
  type: VNodeType.ELEMENT;
  tag: string;
  props?: Record<string, any>;
  children: VNode[];
}

export interface TextVNode extends BaseVNode {
  type: VNodeType.TEXT;
  text: string;
}

export interface ComponentVNode extends BaseVNode {
  type: VNodeType.COMPONENT;
  component: Component;
  props?: Record<string, any>;
}

export interface FragmentVNode extends BaseVNode {
  type: VNodeType.FRAGMENT;
  children: VNode[];
}

export type VNode = ElementVNode | TextVNode | ComponentVNode | FragmentVNode;

export interface Component {
  name: string;
  setup: (props: Record<string, any>) => any;
  render: (ctx: any) => VNode;
}

export function createElement(
  tag: string,
  props?: Record<string, any> | null,
  children?: (VNode | string | number | boolean | null | undefined)[]
): ElementVNode {
  const normalizedChildren: VNode[] = [];
  
  if (children) {
    for (const child of children) {
      if (child == null || typeof child === 'boolean') {
        continue;
      }
      
      if (typeof child === 'string' || typeof child === 'number') {
        normalizedChildren.push(createTextVNode(String(child)));
      } else if (Array.isArray(child)) {
        normalizedChildren.push(...child.flat(Infinity).map(c => 
          typeof c === 'string' || typeof c === 'number' 
            ? createTextVNode(String(c)) 
            : c
        ));
      } else {
        normalizedChildren.push(child);
      }
    }
  }
  
  return {
    type: VNodeType.ELEMENT,
    tag,
    props: props || undefined,
    children: normalizedChildren
  };
}

export function createTextVNode(text: string): TextVNode {
  return {
    type: VNodeType.TEXT,
    text
  };
}

export function createComponentVNode(component: Component, props?: Record<string, any>): ComponentVNode {
  return {
    type: VNodeType.COMPONENT,
    component,
    props
  };
}

export function createFragment(children: VNode[]): FragmentVNode {
  return {
    type: VNodeType.FRAGMENT,
    children
  };
}

export function h(
  tag: string | Component,
  props?: Record<string, any> | null,
  ...children: any[]
): VNode {
  if (typeof tag === 'string') {
    return createElement(tag, props, children);
  } else {
    return createComponentVNode(tag, props || undefined);
  }
}
