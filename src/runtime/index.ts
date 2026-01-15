export { createSignal, createComputed, createEffect, batch, untrack, createMemo, createRoot } from './signal.js';
export { createElement, createTextVNode, createComponentVNode, createFragment, h } from './vnode.js';
export { createComponent } from './component.js';
export { Reconciler } from './reconciler.js';
export { AnimationController, createAnimationController, transition, spring } from './animation.js';
export { AccessibilityManager, createAccessibilityManager } from './accessibility.js';
export type { VNode, Component, ElementVNode, TextVNode, ComponentVNode } from './vnode.js';

import { Reconciler } from './reconciler.js';
import { VNode } from './vnode.js';
import { createAccessibilityManager } from './accessibility.js';

export function mount(vnode: VNode, container: HTMLElement | string): void {
  const targetContainer = typeof container === 'string'
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!targetContainer) {
    throw new Error(`Container not found: ${container}`);
  }

  const reconciler = new Reconciler();
  const a11yManager = createAccessibilityManager();

  reconciler.mount(vnode, targetContainer);

  const focusableElements = targetContainer.querySelectorAll(
    'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])'
  );

  focusableElements.forEach((element) => {
    a11yManager.registerFocusable(element as HTMLElement);
  });
}

export function render(vnode: VNode, container: HTMLElement | string): void {
  mount(vnode, container);
}
