import { VNode, Component } from './vnode.js';
import { createSignal, createComputed, createEffect } from './signal.js';

export interface ComponentOptions {
  name: string;
  role?: string;
  ariaLabel?: string;
  setup: (props: Record<string, any>) => any;
  render: (ctx: any) => VNode | VNode[];
}

export function createComponent(options: ComponentOptions): Component {
  return {
    name: options.name,
    setup: (props: Record<string, any>) => {
      const context = options.setup(props);
      
      if (options.role && typeof window !== 'undefined') {
        context.__role = options.role;
      }
      if (options.ariaLabel && typeof window !== 'undefined') {
        context.__ariaLabel = options.ariaLabel;
      }
      
      return context;
    },
    render: (ctx: any) => {
      const result = options.render(ctx);
      
      if (Array.isArray(result)) {
        return result[0];
      }
      
      return result;
    }
  };
}

export { createSignal, createComputed, createEffect };
