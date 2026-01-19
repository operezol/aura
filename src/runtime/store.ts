import { createSignal, createComputed, createEffect } from './signal.js';

export interface Space<T> {
    state: T;
    readonly computed: Record<string, any>;
    readonly actions: Record<string, Function>;
}

export function createSpace<T extends object>(
    name: string,
    initialState: T,
    computedDefs: Record<string, () => any> = {},
    effects: Array<() => void> = []
): Space<T> {
    // Create signals for each state property
    const stateSignals: Record<string, any> = {};
    const stateProxy: any = {};

    Object.entries(initialState).forEach(([key, value]) => {
        const [signal, setSignal] = createSignal(value);
        stateSignals[key] = { signal, setSignal };

        Object.defineProperty(stateProxy, key, {
            get: () => signal(),
            set: (newValue) => setSignal(newValue),
            enumerable: true
        });
    });

    // Create computed values
    const computedValues: Record<string, any> = {};

    Object.entries(computedDefs).forEach(([key, fn]) => {
        // We bind the function to the state proxy so it can access state directly
        const boundFn = fn.bind(stateProxy);
        const computed = createComputed(boundFn);

        Object.defineProperty(computedValues, key, {
            get: () => computed(),
            enumerable: true
        });

        // Also expose computed on stateProxy for inter-dependency
        Object.defineProperty(stateProxy, key, {
            get: () => computed(),
            enumerable: true
        });
    });

    // Register effects
    effects.forEach(effectFn => {
        const boundEffect = effectFn.bind(stateProxy);
        createEffect(boundEffect);
    });

    return {
        state: stateProxy,
        computed: computedValues,
        actions: {} // Actions are just helper functions usually
    };
}
