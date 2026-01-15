type Subscriber = () => void;
type Cleanup = () => void;

let currentEffect: Effect | null = null;
let effectStack: Effect[] = [];
let batchDepth = 0;
let pendingEffects = new Set<Effect>();

export interface Signal<T> {
  (): T;
  peek(): T;
  set(value: T): void;
  update(fn: (prev: T) => T): void;
}

export interface Computed<T> {
  (): T;
  peek(): T;
}

class SignalNode<T> {
  private value: T;
  private subscribers = new Set<Effect>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    if (currentEffect) {
      this.subscribers.add(currentEffect);
      currentEffect.dependencies.add(this);
    }
    return this.value;
  }

  peek(): T {
    return this.value;
  }

  set(newValue: T): void {
    if (Object.is(this.value, newValue)) return;
    
    this.value = newValue;
    this.notify();
  }

  update(fn: (prev: T) => T): void {
    this.set(fn(this.value));
  }

  private notify(): void {
    if (batchDepth > 0) {
      this.subscribers.forEach(effect => pendingEffects.add(effect));
    } else {
      this.subscribers.forEach(effect => effect.execute());
    }
  }

  unsubscribe(effect: Effect): void {
    this.subscribers.delete(effect);
  }
}

class Effect {
  dependencies = new Set<SignalNode<any>>();
  private fn: () => void | Cleanup;
  private cleanup?: Cleanup;
  private isRunning = false;

  constructor(fn: () => void | Cleanup) {
    this.fn = fn;
  }

  execute(): void {
    if (this.isRunning) return;
    
    this.cleanup?.();
    this.cleanup = undefined;
    
    this.dependencies.forEach(dep => dep.unsubscribe(this));
    this.dependencies.clear();
    
    const prevEffect = currentEffect;
    currentEffect = this;
    effectStack.push(this);
    
    this.isRunning = true;
    
    try {
      const result = this.fn();
      if (typeof result === 'function') {
        this.cleanup = result;
      }
    } finally {
      this.isRunning = false;
      effectStack.pop();
      currentEffect = prevEffect;
    }
  }

  dispose(): void {
    this.cleanup?.();
    this.dependencies.forEach(dep => dep.unsubscribe(this));
    this.dependencies.clear();
  }
}

export function createSignal<T>(initialValue: T): [Signal<T>, (value: T) => void] {
  const node = new SignalNode(initialValue);
  
  const read: Signal<T> = (() => node.get()) as Signal<T>;
  read.peek = () => node.peek();
  read.set = (value: T) => node.set(value);
  read.update = (fn: (prev: T) => T) => node.update(fn);
  
  const write = (value: T) => node.set(value);
  
  return [read, write];
}

export function createComputed<T>(fn: () => T): Computed<T> {
  const [signal, setSignal] = createSignal<T>(undefined as T);
  
  const effect = new Effect(() => {
    setSignal(fn());
  });
  
  effect.execute();
  
  const read: Computed<T> = (() => signal()) as Computed<T>;
  read.peek = () => signal.peek();
  
  return read;
}

export function createEffect(fn: () => void | Cleanup): () => void {
  const effect = new Effect(fn);
  effect.execute();
  
  return () => effect.dispose();
}

export function batch(fn: () => void): void {
  batchDepth++;
  
  try {
    fn();
  } finally {
    batchDepth--;
    
    if (batchDepth === 0) {
      const effects = Array.from(pendingEffects);
      pendingEffects.clear();
      effects.forEach(effect => effect.execute());
    }
  }
}

export function untrack<T>(fn: () => T): T {
  const prevEffect = currentEffect;
  currentEffect = null;
  
  try {
    return fn();
  } finally {
    currentEffect = prevEffect;
  }
}

export function createMemo<T>(fn: () => T): Computed<T> {
  return createComputed(fn);
}

export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const effects: Effect[] = [];
  const prevEffect = currentEffect;
  
  const dispose = () => {
    effects.forEach(effect => effect.dispose());
    effects.length = 0;
  };
  
  try {
    currentEffect = null;
    return fn(dispose);
  } finally {
    currentEffect = prevEffect;
  }
}
