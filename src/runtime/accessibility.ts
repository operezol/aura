interface FocusableElement {
  element: HTMLElement;
  priority: number;
  group?: string;
}

interface KeyboardShortcut {
  key: string;
  modifiers: Set<string>;
  handler: (e: KeyboardEvent) => void;
  description: string;
}

export class AccessibilityManager {
  private focusableElements: FocusableElement[] = [];
  private currentFocusIndex: number = -1;
  private shortcuts = new Map<string, KeyboardShortcut>();
  private focusTrapStack: HTMLElement[] = [];
  private liveRegions = new Map<string, HTMLElement>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupKeyboardNavigation();
      this.setupFocusManagement();
    }
  }

  registerFocusable(element: HTMLElement, priority: number = 0, group?: string): () => void {
    const focusable: FocusableElement = { element, priority, group };
    this.focusableElements.push(focusable);
    this.sortFocusableElements();

    return () => {
      const index = this.focusableElements.indexOf(focusable);
      if (index > -1) {
        this.focusableElements.splice(index, 1);
      }
    };
  }

  registerShortcut(
    key: string,
    handler: (e: KeyboardEvent) => void,
    modifiers: string[] = [],
    description: string = ''
  ): () => void {
    const shortcutKey = this.createShortcutKey(key, modifiers);
    
    this.shortcuts.set(shortcutKey, {
      key,
      modifiers: new Set(modifiers),
      handler,
      description
    });

    return () => {
      this.shortcuts.delete(shortcutKey);
    };
  }

  focusNext(): void {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.focusElement(this.focusableElements[this.currentFocusIndex].element);
  }

  focusPrevious(): void {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex = this.currentFocusIndex <= 0 
      ? this.focusableElements.length - 1 
      : this.currentFocusIndex - 1;
    this.focusElement(this.focusableElements[this.currentFocusIndex].element);
  }

  focusFirst(): void {
    if (this.focusableElements.length === 0) return;
    this.currentFocusIndex = 0;
    this.focusElement(this.focusableElements[0].element);
  }

  focusLast(): void {
    if (this.focusableElements.length === 0) return;
    this.currentFocusIndex = this.focusableElements.length - 1;
    this.focusElement(this.focusableElements[this.currentFocusIndex].element);
  }

  trapFocus(container: HTMLElement): () => void {
    this.focusTrapStack.push(container);
    
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const focusableElements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      const index = this.focusTrapStack.indexOf(container);
      if (index > -1) {
        this.focusTrapStack.splice(index, 1);
      }
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  createLiveRegion(id: string, politeness: 'polite' | 'assertive' = 'polite'): HTMLElement {
    if (this.liveRegions.has(id)) {
      return this.liveRegions.get(id)!;
    }

    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';

    document.body.appendChild(region);
    this.liveRegions.set(id, region);

    return region;
  }

  announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    const region = this.createLiveRegion('default-announcer', politeness);
    region.textContent = '';
    
    setTimeout(() => {
      region.textContent = message;
    }, 100);
  }

  setAriaAttributes(element: HTMLElement, attributes: Record<string, string>): void {
    for (const [key, value] of Object.entries(attributes)) {
      const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
      element.setAttribute(ariaKey, value);
    }
  }

  inferRole(element: HTMLElement): string | null {
    const tag = element.tagName.toLowerCase();
    
    const implicitRoles: Record<string, string> = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'textarea': 'textbox',
      'select': 'combobox',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo',
      'aside': 'complementary',
      'section': 'region',
      'article': 'article',
      'form': 'form',
      'table': 'table',
      'ul': 'list',
      'ol': 'list',
      'li': 'listitem'
    };

    return implicitRoles[tag] || null;
  }

  validateAccessibility(element: HTMLElement): string[] {
    const warnings: string[] = [];

    if (element.hasAttribute('onclick') && !element.hasAttribute('role')) {
      warnings.push('Interactive element without role attribute');
    }

    const role = element.getAttribute('role');
    if (role === 'button' && !element.hasAttribute('aria-label') && !element.textContent?.trim()) {
      warnings.push('Button without accessible label');
    }

    if (element.tagName === 'IMG' && !element.hasAttribute('alt')) {
      warnings.push('Image without alt text');
    }

    const inputs = element.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      const id = input.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (!label && !input.hasAttribute('aria-label')) {
          warnings.push(`Form input without label: ${id}`);
        }
      }
    });

    return warnings;
  }

  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.focusTrapStack.length > 0) {
        return;
      }

      const shortcutKey = this.createShortcutKey(
        e.key,
        this.getActiveModifiers(e)
      );

      const shortcut = this.shortcuts.get(shortcutKey);
      if (shortcut) {
        e.preventDefault();
        shortcut.handler(e);
        return;
      }

      if (e.key === 'Tab' && !e.shiftKey) {
        if (this.focusableElements.length > 0) {
          e.preventDefault();
          this.focusNext();
        }
      } else if (e.key === 'Tab' && e.shiftKey) {
        if (this.focusableElements.length > 0) {
          e.preventDefault();
          this.focusPrevious();
        }
      }
    });
  }

  private setupFocusManagement(): void {
    document.addEventListener('focusin', (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const index = this.focusableElements.findIndex(f => f.element === target);
      if (index > -1) {
        this.currentFocusIndex = index;
      }
    });
  }

  private focusElement(element: HTMLElement): void {
    element.focus();
    
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    
    if (!isVisible) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private sortFocusableElements(): void {
    this.focusableElements.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      const rectA = a.element.getBoundingClientRect();
      const rectB = b.element.getBoundingClientRect();
      
      if (Math.abs(rectA.top - rectB.top) > 10) {
        return rectA.top - rectB.top;
      }
      
      return rectA.left - rectB.left;
    });
  }

  private createShortcutKey(key: string, modifiers: string[]): string {
    const sortedModifiers = [...modifiers].sort();
    return [...sortedModifiers, key.toLowerCase()].join('+');
  }

  private getActiveModifiers(e: KeyboardEvent): string[] {
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');
    if (e.metaKey) modifiers.push('meta');
    return modifiers;
  }
}

export function createAccessibilityManager(): AccessibilityManager {
  return new AccessibilityManager();
}
