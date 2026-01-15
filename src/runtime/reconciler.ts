import { VNode, VNodeType, ElementVNode, TextVNode, ComponentVNode } from './vnode.js';

export interface DOMNode {
  el: Node;
  vnode: VNode;
}

export class Reconciler {
  private mountedNodes = new WeakMap<VNode, Node>();
  private componentInstances = new WeakMap<ComponentVNode, any>();

  mount(vnode: VNode, container: HTMLElement): Node {
    const node = this.createNode(vnode);
    this.mountedNodes.set(vnode, node);
    container.appendChild(node);
    return node;
  }

  patch(oldVNode: VNode, newVNode: VNode, container: HTMLElement): Node {
    if (oldVNode.type !== newVNode.type) {
      return this.replace(oldVNode, newVNode, container);
    }

    const node = this.mountedNodes.get(oldVNode);
    if (!node) {
      return this.mount(newVNode, container);
    }

    switch (newVNode.type) {
      case VNodeType.ELEMENT:
        this.patchElement(oldVNode as ElementVNode, newVNode as ElementVNode, node as HTMLElement);
        break;
      case VNodeType.TEXT:
        this.patchText(oldVNode as TextVNode, newVNode as TextVNode, node as Text);
        break;
      case VNodeType.COMPONENT:
        this.patchComponent(oldVNode as ComponentVNode, newVNode as ComponentVNode, node);
        break;
    }

    this.mountedNodes.set(newVNode, node);
    return node;
  }

  unmount(vnode: VNode): void {
    const node = this.mountedNodes.get(vnode);
    if (!node) return;

    if (vnode.type === VNodeType.COMPONENT) {
      const instance = this.componentInstances.get(vnode as ComponentVNode);
      if (instance && instance.dispose) {
        instance.dispose();
      }
      this.componentInstances.delete(vnode as ComponentVNode);
    }

    if (vnode.type === VNodeType.ELEMENT) {
      const element = vnode as ElementVNode;
      element.children.forEach(child => this.unmount(child));
    }

    node.parentNode?.removeChild(node);
    this.mountedNodes.delete(vnode);
  }

  private createNode(vnode: VNode): Node {
    switch (vnode.type) {
      case VNodeType.ELEMENT:
        return this.createElement(vnode as ElementVNode);
      case VNodeType.TEXT:
        return this.createText(vnode as TextVNode);
      case VNodeType.COMPONENT:
        return this.createComponent(vnode as ComponentVNode);
      default:
        return document.createTextNode('');
    }
  }

  private createElement(vnode: ElementVNode): HTMLElement {
    const el = document.createElement(vnode.tag);

    if (vnode.props) {
      this.setProps(el, {}, vnode.props);
    }

    vnode.children.forEach(child => {
      const childNode = this.createNode(child);
      this.mountedNodes.set(child, childNode);
      el.appendChild(childNode);
    });

    return el;
  }

  private createText(vnode: TextVNode): Text {
    return document.createTextNode(vnode.text);
  }

  private createComponent(vnode: ComponentVNode): Node {
    const instance = vnode.component.setup(vnode.props || {});
    this.componentInstances.set(vnode, instance);

    const rendered = vnode.component.render(instance);
    const node = this.createNode(rendered);
    this.mountedNodes.set(rendered, node);

    return node;
  }

  private patchElement(oldVNode: ElementVNode, newVNode: ElementVNode, el: HTMLElement): void {
    this.setProps(el, oldVNode.props || {}, newVNode.props || {});
    this.patchChildren(oldVNode.children, newVNode.children, el);
  }

  private patchText(oldVNode: TextVNode, newVNode: TextVNode, node: Text): void {
    if (oldVNode.text !== newVNode.text) {
      node.textContent = newVNode.text;
    }
  }

  private patchComponent(oldVNode: ComponentVNode, newVNode: ComponentVNode, node: Node): void {
    const instance = this.componentInstances.get(oldVNode);
    if (!instance) return;

    if (instance.update) {
      instance.update(newVNode.props || {});
    }

    const rendered = newVNode.component.render(instance);
    const oldRendered = oldVNode.component.render(instance);
    
    this.patch(oldRendered, rendered, node.parentElement!);
  }

  private patchChildren(oldChildren: VNode[], newChildren: VNode[], container: HTMLElement): void {
    const oldLength = oldChildren.length;
    const newLength = newChildren.length;
    const commonLength = Math.min(oldLength, newLength);

    for (let i = 0; i < commonLength; i++) {
      this.patch(oldChildren[i], newChildren[i], container);
    }

    if (newLength > oldLength) {
      for (let i = commonLength; i < newLength; i++) {
        const node = this.createNode(newChildren[i]);
        this.mountedNodes.set(newChildren[i], node);
        container.appendChild(node);
      }
    } else if (oldLength > newLength) {
      for (let i = commonLength; i < oldLength; i++) {
        this.unmount(oldChildren[i]);
      }
    }
  }

  private replace(oldVNode: VNode, newVNode: VNode, container: HTMLElement): Node {
    const oldNode = this.mountedNodes.get(oldVNode);
    const newNode = this.createNode(newVNode);
    
    if (oldNode) {
      container.replaceChild(newNode, oldNode);
      this.unmount(oldVNode);
    } else {
      container.appendChild(newNode);
    }
    
    this.mountedNodes.set(newVNode, newNode);
    return newNode;
  }

  private setProps(el: HTMLElement, oldProps: Record<string, any>, newProps: Record<string, any>): void {
    const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

    allKeys.forEach(key => {
      const oldValue = oldProps[key];
      const newValue = newProps[key];

      if (oldValue === newValue) return;

      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        if (oldValue) {
          el.removeEventListener(eventName, oldValue);
        }
        if (newValue) {
          el.addEventListener(eventName, newValue);
        }
      } else if (key === 'style') {
        this.setStyle(el, oldValue || {}, newValue || {});
      } else if (key === 'className' || key === 'class') {
        el.className = newValue || '';
      } else if (key in el) {
        (el as any)[key] = newValue;
      } else if (newValue != null) {
        el.setAttribute(key, String(newValue));
      } else {
        el.removeAttribute(key);
      }
    });
  }

  private setStyle(el: HTMLElement, oldStyle: Record<string, string>, newStyle: Record<string, string>): void {
    const allKeys = new Set([...Object.keys(oldStyle), ...Object.keys(newStyle)]);

    allKeys.forEach(key => {
      const oldValue = oldStyle[key];
      const newValue = newStyle[key];

      if (oldValue !== newValue) {
        if (newValue != null) {
          el.style.setProperty(key, newValue);
        } else {
          el.style.removeProperty(key);
        }
      }
    });
  }
}
