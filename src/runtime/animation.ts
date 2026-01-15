interface AnimationConfig {
  properties: Record<string, any>;
  duration: number;
  easing: string;
  stagger?: number;
  delay?: number;
}

interface FLIPState {
  first: DOMRect;
  last: DOMRect;
  invert: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
  };
}

const EASING_FUNCTIONS: Record<string, (t: number) => number> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in-cubic': (t) => t * t * t,
  'ease-out-cubic': (t) => (--t) * t * t + 1,
  'ease-in-out-cubic': (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  'ease-in-quart': (t) => t * t * t * t,
  'ease-out-quart': (t) => 1 - (--t) * t * t * t,
  'ease-in-out-quart': (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  'spring': (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  'bounce': (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }
};

export class AnimationController {
  private activeAnimations = new Map<Element, Animation>();
  private rafId: number | null = null;
  private reducedMotion: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = mediaQuery.matches;
      
      mediaQuery.addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
      });
    }
  }

  animate(element: Element, config: AnimationConfig): Promise<void> {
    if (this.reducedMotion) {
      this.applyFinalState(element, config.properties);
      return Promise.resolve();
    }

    this.cancelAnimation(element);

    return new Promise((resolve) => {
      const animation = this.createAnimation(element, config, resolve);
      this.activeAnimations.set(element, animation);
      animation.start();
    });
  }

  animateFLIP(element: Element, callback: () => void, config: Partial<AnimationConfig> = {}): Promise<void> {
    if (this.reducedMotion) {
      callback();
      return Promise.resolve();
    }

    const first = element.getBoundingClientRect();
    
    callback();
    
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const last = element.getBoundingClientRect();
        
        const invert = {
          x: first.left - last.left,
          y: first.top - last.top,
          scaleX: first.width / last.width,
          scaleY: first.height / last.height
        };

        const flipState: FLIPState = { first, last, invert };
        
        if (Math.abs(invert.x) < 0.5 && Math.abs(invert.y) < 0.5 && 
            Math.abs(invert.scaleX - 1) < 0.01 && Math.abs(invert.scaleY - 1) < 0.01) {
          resolve();
          return;
        }

        this.playFLIP(element, flipState, config, resolve);
      });
    });
  }

  animateGroup(elements: Element[], config: AnimationConfig): Promise<void[]> {
    const stagger = config.stagger || 0;
    
    return Promise.all(
      elements.map((element, index) => {
        const elementConfig = {
          ...config,
          delay: (config.delay || 0) + (stagger * index)
        };
        return this.animate(element, elementConfig);
      })
    );
  }

  cancelAnimation(element: Element): void {
    const animation = this.activeAnimations.get(element);
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(element);
    }
  }

  cancelAll(): void {
    this.activeAnimations.forEach(animation => animation.cancel());
    this.activeAnimations.clear();
  }

  private createAnimation(element: Element, config: AnimationConfig, onComplete: () => void): Animation {
    const startTime = performance.now() + (config.delay || 0);
    const duration = config.duration;
    const easingFn = EASING_FUNCTIONS[config.easing] || EASING_FUNCTIONS['ease-out'];
    
    const startValues: Record<string, number> = {};
    const endValues: Record<string, number> = {};
    
    for (const [prop, value] of Object.entries(config.properties)) {
      const computedStyle = window.getComputedStyle(element);
      const currentValue = this.parseValue(computedStyle.getPropertyValue(prop) || '0');
      const targetValue = this.parseValue(String(value));
      
      startValues[prop] = currentValue;
      endValues[prop] = targetValue;
    }

    let cancelled = false;
    let rafId: number;

    const animate = (currentTime: number) => {
      if (cancelled) return;

      const elapsed = currentTime - startTime;
      
      if (elapsed < 0) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      for (const [prop, startValue] of Object.entries(startValues)) {
        const endValue = endValues[prop];
        const currentValue = startValue + (endValue - startValue) * easedProgress;
        
        this.setProperty(element, prop, currentValue);
      }

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        this.activeAnimations.delete(element);
        onComplete();
      }
    };

    return {
      start: () => {
        rafId = requestAnimationFrame(animate);
      },
      cancel: () => {
        cancelled = true;
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
      }
    };
  }

  private playFLIP(element: Element, flip: FLIPState, config: Partial<AnimationConfig>, onComplete: () => void): void {
    const htmlElement = element as HTMLElement;
    
    htmlElement.style.transformOrigin = '0 0';
    htmlElement.style.transform = `
      translate(${flip.invert.x}px, ${flip.invert.y}px)
      scale(${flip.invert.scaleX}, ${flip.invert.scaleY})
    `;

    requestAnimationFrame(() => {
      const duration = config.duration || 300;
      const easing = config.easing || 'ease-out';
      
      htmlElement.style.transition = `transform ${duration}ms ${easing}`;
      htmlElement.style.transform = 'translate(0, 0) scale(1, 1)';

      const cleanup = () => {
        htmlElement.style.transition = '';
        htmlElement.style.transform = '';
        htmlElement.style.transformOrigin = '';
        onComplete();
      };

      htmlElement.addEventListener('transitionend', cleanup, { once: true });
      
      setTimeout(cleanup, duration + 50);
    });
  }

  private applyFinalState(element: Element, properties: Record<string, any>): void {
    for (const [prop, value] of Object.entries(properties)) {
      this.setProperty(element, prop, this.parseValue(String(value)));
    }
  }

  private parseValue(value: string): number {
    const match = value.match(/^([-+]?[\d.]+)([a-z%]*)/i);
    if (match) {
      return parseFloat(match[1]);
    }
    return 0;
  }

  private setProperty(element: Element, prop: string, value: number): void {
    const htmlElement = element as HTMLElement;
    
    const unitProps = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding'];
    const needsUnit = unitProps.some(p => prop.includes(p));
    
    if (prop === 'opacity' || prop === 'scale') {
      htmlElement.style.setProperty(prop, String(value));
    } else if (needsUnit) {
      htmlElement.style.setProperty(prop, `${value}px`);
    } else {
      htmlElement.style.setProperty(prop, String(value));
    }
  }
}

interface Animation {
  start: () => void;
  cancel: () => void;
}

export function createAnimationController(): AnimationController {
  return new AnimationController();
}

export function transition(
  element: Element,
  from: Record<string, any>,
  to: Record<string, any>,
  duration: number = 300,
  easing: string = 'ease-out'
): Promise<void> {
  const controller = new AnimationController();
  
  for (const [prop, value] of Object.entries(from)) {
    (element as HTMLElement).style.setProperty(prop, String(value));
  }

  return controller.animate(element, {
    properties: to,
    duration,
    easing
  });
}

export function spring(
  element: Element,
  properties: Record<string, any>,
  config: { stiffness?: number; damping?: number; mass?: number } = {}
): Promise<void> {
  const controller = new AnimationController();
  
  return controller.animate(element, {
    properties,
    duration: 600,
    easing: 'spring'
  });
}
