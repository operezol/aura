# Aura Language Manifesto

## The Vision

**Aura** is a declarative UI language designed from first principles to solve the fundamental challenges of modern interface development: **semantic clarity, reactive performance, native animation, and universal accessibility.**

This is not a framework. This is not a library. This is a **language** - with its own syntax, compiler, runtime, and philosophy.

---

## Core Philosophy

### 1. **Declarative by Nature**

UI should describe *what*, not *how*. Aura eliminates the imperative noise of traditional frameworks:

```aura
component Button:
  state pressed = false
  
  on click => pressed = !pressed
  
  animate click:
    scale: 1.1
    
  button: "Click me"
```

No `useState`. No `useEffect`. No lifecycle methods. Just pure declaration.

### 2. **Accessibility is Not Optional**

Accessibility is woven into the language itself. Roles, labels, and keyboard navigation are **inferred automatically** or declared as first-class citizens:

```aura
component Dialog:
  role "dialog"
  label "Confirmation dialog"
  
  on escape => close()
```

The compiler **validates** accessibility at compile-time. Missing alt text? Compilation error. Interactive element without a label? Warning.

### 3. **Animation as a Language Feature**

Animations are not CSS tricks or library calls. They are **native language constructs** powered by a custom FLIP-based engine:

```aura
animate hover:
  opacity: 1
  translateY: -4px
  duration: 200
  easing: spring
```

The runtime automatically:
- Calculates optimal animation paths
- Respects `prefers-reduced-motion`
- Coordinates multi-element choreography
- Prevents layout thrashing

### 4. **Reactive Without Complexity**

Aura uses a **fine-grained reactive system** based on signals. Dependencies are tracked automatically. Updates are surgical:

```aura
state count = 0
computed double = count * 2
effect (count) => console.log("Count changed:", count)
```

No virtual DOM diffing. No reconciliation overhead. Just direct, efficient updates.

### 5. **Semantic HTML by Default**

Every element in Aura maps to semantic HTML. The compiler ensures structural validity:

```aura
nav:
  ul:
    li: a href="/home": "Home"
    li: a href="/about": "About"
```

Generates proper `<nav><ul><li><a>` structure with appropriate ARIA attributes.

---

## Design Principles

### **P1: Performance First**

- Zero-cost abstractions
- Minimal runtime overhead
- Compile-time optimizations
- Direct DOM manipulation (no VDOM)
- Lazy evaluation where possible

### **P2: Developer Experience**

- Clear, readable syntax
- Helpful error messages
- Compile-time validation
- Hot module replacement
- Time-travel debugging

### **P3: Accessibility by Default**

- Automatic role inference
- Focus management
- Keyboard navigation
- Screen reader support
- Semantic structure validation

### **P4: Progressive Enhancement**

- Works without JavaScript (SSR)
- Graceful degradation
- Respects user preferences
- Mobile-first approach

---

## Language Features

### **State Management**

```aura
state todos = []
state filter = "all"

computed filteredTodos = todos.filter(t => 
  filter == "all" || t.status == filter
)
```

### **Event Handling**

```aura
on click => addTodo()
on keydown.enter => submit()
on focus => highlight = true
```

### **Conditional Rendering**

```aura
when isLoggedIn:
  div: "Welcome back!"
```

### **List Rendering**

```aura
each todo in todos:
  li key=todo.id: todo.text
```

### **Component Composition**

```aura
component TodoItem:
  slot
  
component TodoList:
  each todo in todos:
    TodoItem: todo.text
```

### **Animations**

```aura
animate enter:
  opacity: 0 -> 1
  translateY: 20 -> 0
  duration: 300
  easing: ease-out

animate exit:
  opacity: 1 -> 0
  scale: 1 -> 0.8
  duration: 200
```

### **Effects**

```aura
effect (userId) =>
  fetchUserData(userId)
  
effect () =>
  const interval = setInterval(tick, 1000)
  return () => clearInterval(interval)
```

---

## Architecture

### **Compilation Pipeline**

```
Source Code (.aura)
    ↓
Lexer (Tokenization)
    ↓
Parser (AST Generation)
    ↓
Semantic Analyzer (Validation)
    ↓
Code Generator (JavaScript)
    ↓
Optimized Output (.js)
```

### **Runtime Architecture**

```
Signal System (Reactive Core)
    ↓
Component System (Composition)
    ↓
Reconciler (DOM Updates)
    ↓
Animation Controller (FLIP Engine)
    ↓
Accessibility Manager (A11y)
```

### **Key Components**

1. **Signal System**: Fine-grained reactivity with automatic dependency tracking
2. **Reconciler**: Efficient DOM patching without virtual DOM
3. **Animation Controller**: FLIP-based animations with easing functions
4. **Accessibility Manager**: Automatic focus management and ARIA attributes
5. **Compiler**: Multi-stage compilation with semantic validation

---

## Use Cases

### **Ideal For:**

- **Design Systems**: Semantic components with built-in accessibility
- **Interactive Applications**: Real-time updates with minimal overhead
- **Animated Interfaces**: Complex choreography without performance cost
- **Accessible Web Apps**: WCAG compliance by default
- **Progressive Web Apps**: Fast, responsive, offline-capable

### **Not Ideal For:**

- **Static Sites**: Use a static site generator instead
- **Legacy Browser Support**: Targets modern browsers (ES2022+)
- **Existing Codebases**: Designed for greenfield projects

---

## Comparison with Existing Solutions

### **vs React**

- **Aura**: No virtual DOM, fine-grained reactivity, built-in animations
- **React**: Virtual DOM reconciliation, hooks complexity, external animation libraries

### **vs Vue**

- **Aura**: Compiled language, stricter semantics, native animation engine
- **Vue**: Template-based, runtime-heavy, CSS-based animations

### **vs Svelte**

- **Aura**: Dedicated language syntax, stronger accessibility, FLIP animations
- **Svelte**: JavaScript-based, less opinionated, CSS transitions

### **vs Solid**

- **Aura**: Custom syntax, integrated tooling, accessibility-first
- **Solid**: JSX-based, minimal runtime, manual accessibility

---

## Technical Specifications

### **Language Syntax**

- Indentation-based (like Python)
- Type inference (no explicit types needed)
- Expression-oriented
- Declarative constructs

### **Compiler**

- Written in TypeScript
- Multi-pass compilation
- Semantic analysis
- Code optimization
- Source map generation

### **Runtime**

- ~15KB gzipped
- Zero dependencies
- ES2022+ target
- Tree-shakeable
- SSR-capable

### **Animation Engine**

- FLIP technique
- RequestAnimationFrame-based
- Easing functions library
- Stagger support
- Reduced motion respect

### **Accessibility**

- Automatic ARIA attributes
- Focus trap management
- Keyboard navigation
- Screen reader announcements
- Semantic validation

---

## Roadmap

### **Phase 1: Foundation** ✅

- [x] Lexer and Parser
- [x] AST Definition
- [x] Code Generator
- [x] Signal System
- [x] Basic Reconciler

### **Phase 2: Core Features** ✅

- [x] Animation Engine
- [x] Accessibility Manager
- [x] Event System
- [x] Component System
- [x] CLI Tools

### **Phase 3: Tooling** ✅

- [x] Linter
- [x] Formatter
- [x] Dev Server
- [x] Build System

### **Phase 4: Advanced Features** (Planned)

- [ ] TypeScript Integration
- [ ] Server-Side Rendering
- [ ] Partial Hydration
- [ ] Code Splitting
- [ ] DevTools Extension

### **Phase 5: Ecosystem** (Future)

- [ ] Component Library
- [ ] Router
- [ ] State Management Patterns
- [ ] Testing Utilities
- [ ] Documentation Site

---

## Limitations

### **Current Constraints**

1. **Browser Support**: Modern browsers only (ES2022+)
2. **Learning Curve**: New syntax requires adaptation
3. **Ecosystem**: Limited third-party libraries
4. **Tooling**: IDE support in early stages
5. **Community**: Small, growing community

### **Design Trade-offs**

1. **Strictness vs Flexibility**: Prioritizes correctness over freedom
2. **Performance vs Features**: Optimizes for speed over convenience
3. **Accessibility vs Simplicity**: Enforces a11y even when verbose
4. **Compilation vs Runtime**: More compile-time work for runtime speed

---

## Contributing

Aura is an experimental language exploring the boundaries of UI development. Contributions are welcome in:

- **Language Design**: Syntax proposals and semantics
- **Compiler**: Optimizations and error messages
- **Runtime**: Performance improvements
- **Tooling**: IDE extensions and dev tools
- **Documentation**: Examples and guides

---

## Philosophy in Practice

### **Example: Todo Application**

```aura
component TodoApp:
  state todos = []
  state input = ""
  state filter = "all"
  
  computed filteredTodos = todos.filter(todo =>
    filter == "all" || todo.completed == (filter == "completed")
  )
  
  on addTodo => 
    todos = [...todos, { id: Date.now(), text: input, completed: false }]
    input = ""
  
  on toggleTodo(id) =>
    todos = todos.map(t => 
      t.id == id ? { ...t, completed: !t.completed } : t
    )
  
  animate addTodo:
    opacity: 0 -> 1
    translateY: -20 -> 0
    duration: 300
  
  role "application"
  label "Todo list application"
  
  main:
    h1: "My Todos"
    
    form onsubmit=addTodo:
      input 
        value=input 
        oninput=(e) => input = e.target.value
        placeholder="What needs to be done?"
        aria-label="New todo input"
      
      button type="submit": "Add"
    
    nav role="tablist":
      button 
        onclick=() => filter = "all"
        aria-selected=(filter == "all"): "All"
      button 
        onclick=() => filter = "active"
        aria-selected=(filter == "active"): "Active"
      button 
        onclick=() => filter = "completed"
        aria-selected=(filter == "completed"): "Completed"
    
    ul role="list":
      each todo in filteredTodos:
        li key=todo.id:
          input 
            type="checkbox" 
            checked=todo.completed
            onchange=() => toggleTodo(todo.id)
            aria-label="Mark as complete"
          
          span class=(todo.completed ? "completed" : ""): todo.text
```

This example demonstrates:
- ✅ Reactive state management
- ✅ Computed values
- ✅ Event handling
- ✅ Animations
- ✅ Accessibility attributes
- ✅ Semantic HTML structure
- ✅ Clean, readable syntax

---

## Conclusion

**Aura** represents a radical rethinking of UI development. By creating a dedicated language rather than a framework, we can:

1. **Enforce best practices** at the language level
2. **Optimize compilation** for the specific use case
3. **Integrate features** that are typically bolted on
4. **Validate correctness** before runtime
5. **Create better tooling** with full language awareness

This is not just another framework. This is the **future of declarative UI development**.

---

**Aura** - *Illuminate your interfaces*

Version 0.1.0 | MIT License | 2026
