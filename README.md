# Aura Language

**The Declarative UI Language for the Future Web.**

Aura is a dedicated language designed from first principles for building semantic, reactive, and accessible user interfaces. It eliminates the boilerplate of modern frameworks by moving logic to a smart compiler and a surgical runtime.

---

## 🚀 Why Aura?

- **Declarative by Design**: Describe *what* you want, not *how* to do it. No hooks, no dependency arrays, no virtual DOM diffing.
- **Accessibility First**: Accessibility is enforced at compile-time. Missing roles or labels are compilation errors, not afterthoughts.
- **Native Animation**: FLIP-based animations are first-class language constructs, ensuring 60fps performance without complex CSS.
- **Fine-Grained Reactivity**: State changes trigger precise, surgical DOM updates via signals.
- **Zero-Config Tooling**: The CLI comes with everything: compiler, linter, formatter, and dev server.

---

## 📦 Installation

```bash
npm install -g aura-lang
```

## ⚡ Quick Start

Initialize a new project:

```bash
aura init my-app
cd my-app
npm install
npm run dev
```

### Your First Component

Create `src/App.aura`:

```aura
component App:
  state count = 0
  
  on click => count = count + 1
  
  animate click:
    scale: 1.2 -> 1
    duration: 300
    easing: spring
    
  style:
    .container:
      padding: "2rem"
      text-align: "center"
      font-family: "sans-serif"

  div class="container":
    h1: "Hello, Aura!"
    p: "Count is {count}"
    
    button onclick=click: "Increment"
```

Compile it:

```bash
aura compile src/App.aura
```

---

## 📖 Language Reference

### 1. Components & Props
Components are the building blocks. They encapsulate logic, style, and structure.

```aura
component Button:
  # Props are inferred automatically
  button onclick=props.action: props.label
```

### 2. State & Computed
State is reactive. Computed values update automatically when dependencies change.

```aura
component Counter:
  state count = 0
  computed double = count * 2
  
  on inc => count = count + 1
```

### 3. Global State (Spaces) **[NEW]**
Share state across components using `space`. Think of it as a global store.

```aura
space Theme:
  state dark = false
  computed bg = dark ? "#111" : "#fff"
  
  on toggle => dark = !dark
```

Use it in any component:

```aura
component Header:
  div style="background: ${Theme.bg}":
    button onclick=Theme.toggle: "Switch Theme"
```

### 4. Styles **[NEW]**
Styles can be scoped to the component.

```aura
component Card:
  style:
    .card:
      border: "1px solid #ddd"
      border-radius: "8px"
      padding: "16px"
  
  div class="card":
    slot
```

### 5. Control Flow
Clean syntax for conditionals and loops.

```aura
# Conditional
when isLoading:
  Spinner
when !isLoading:
  Content

# Loop
each item in items:
  li key=item.id: item.name
```

### 6. Animations
Animations are defined declaratively with simple physics.

```aura
animate fade_in:
  opacity: 0 -> 1
  duration: 500
```

---

## 🛡️ The `aura audit` Command

Aura includes a strict audit tool to ensure your application meets high standards for performance and accessibility.

```bash
aura audit --input src/
```

Checks typically include:
- **A11y Strictness**: Ensuring all interactive elements (`button`, `a`, `input`) have explicit `role`, `aria-label`, or visible text.
- **Performance**: Detecting expensive patterns or unused states.

---

## 🏗️ Architecture

Aura compiles your `.aura` files into highly optimized vanilla JavaScript (ESModules).

`Source (.aura)` → **Lexer** → **Parser** → **Semantic Analyzer** → **Code Generator** → `Output (.js)`

The runtime (`@aura/runtime`) is lightweight (~15KB) and handles:
- **Signal Graph**: For reactivity.
- **DOM Reconciler**: For surgical updates.
- **AnimationController**: For orchestrating FLIP animations.

---

## 🤝 Contributing

Aura is an experimental project exploring the boundaries of UI engineering. We welcome contributions!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License.
