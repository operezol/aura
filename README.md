# Aura Language

**A declarative UI language with compiler, reactive runtime, and native animation engine**

Aura is not a framework - it's a complete language designed specifically for building semantic, accessible, and performant user interfaces.

## Features

- 🎯 **Declarative Syntax**: Clean, readable, Python-like syntax
- ⚡ **Fine-Grained Reactivity**: Signal-based reactive system with automatic dependency tracking
- 🎨 **Native Animation Engine**: FLIP-based animations with custom easing functions
- ♿ **Accessibility First**: Automatic ARIA attributes and semantic validation
- 🔧 **Complete Tooling**: CLI, linter, formatter, and dev server
- 📦 **Zero Dependencies**: Minimal runtime footprint (~15KB gzipped)
- 🚀 **Compile-Time Optimization**: Multi-stage compilation with semantic analysis

## Installation

```bash
npm install -g aura-lang
```

## Quick Start

### Create a new project

```bash
aura init my-app
cd my-app
npm install
npm run dev
```

### Your first component

Create `Counter.aura`:

```aura
component Counter:
  state count = 0
  
  on click => count = count + 1
  
  animate click:
    scale: 1.1
    duration: 200
  
  role "application"
  label "Counter application"
  
  div:
    h1: "Counter"
    button onclick=handleClick: "Count: {count}"
    p: "Double: {count * 2}"
```

### Compile and run

```bash
aura compile Counter.aura
```

This generates optimized JavaScript that you can use in any web application.

## Language Syntax

### Components

```aura
component MyComponent:
  state value = 0
  computed doubled = value * 2
  
  div: "Value: {value}"
```

### State Management

```aura
state count = 0
state items = []
state user = { name: "Alice", age: 30 }
```

### Computed Values

```aura
computed total = items.reduce((sum, item) => sum + item.price, 0)
computed isValid = email.includes("@") && password.length >= 8
```

### Effects

```aura
effect (userId) =>
  fetchUserData(userId)

effect () =>
  const timer = setInterval(tick, 1000)
  return () => clearInterval(timer)
```

### Event Handlers

```aura
on click => count = count + 1
on submit => handleSubmit()
on keydown.enter => search()
on focus => isActive = true
```

### Animations

```aura
animate hover:
  opacity: 1
  translateY: -4px
  duration: 200
  easing: ease-out

animate enter:
  opacity: 0 -> 1
  scale: 0.8 -> 1
  duration: 300
  easing: spring
```

### Conditional Rendering

```aura
when isLoggedIn:
  div: "Welcome back!"

when error:
  p class="error": error.message
```

### List Rendering

```aura
each item in items:
  li key=item.id: item.name

each user, index in users:
  div: "{index + 1}. {user.name}"
```

### Accessibility

```aura
component Dialog:
  role "dialog"
  label "Confirmation dialog"
  describe "Please confirm your action"
  
  on escape => close()
```

## CLI Commands

### Compile

```bash
aura compile input.aura --output output.js
aura compile input.aura --strict --minify
aura compile input.aura --explain
```

### Development Server

```bash
aura dev
aura dev --port 8080
aura dev --strict
```

### Build for Production

```bash
aura build
aura build --input src --output dist
```

### Lint

```bash
aura lint
aura lint src/
aura lint MyComponent.aura
```

### Format

```bash
aura format
aura format --fix
aura format src/
```

## Runtime API

### Signals

```javascript
import { createSignal, createComputed, createEffect } from '@aura/runtime';

const [count, setCount] = createSignal(0);
const doubled = createComputed(() => count() * 2);

createEffect(() => {
  console.log('Count:', count());
});

setCount(5);
```

### Components

```javascript
import { createComponent, createElement } from '@aura/runtime';

const Button = createComponent({
  name: 'Button',
  setup(props) {
    const [pressed, setPressed] = createSignal(false);
    return { pressed, setPressed };
  },
  render(ctx) {
    return createElement('button', { 
      onclick: () => ctx.setPressed(!ctx.pressed()) 
    }, ['Click me']);
  }
});
```

### Animations

```javascript
import { createAnimationController, transition } from '@aura/runtime';

const controller = createAnimationController();

controller.animate(element, {
  properties: { opacity: 1, translateY: 0 },
  duration: 300,
  easing: 'ease-out'
});

transition(element, 
  { opacity: 0 }, 
  { opacity: 1 }, 
  300
);
```

### Accessibility

```javascript
import { createAccessibilityManager } from '@aura/runtime';

const a11y = createAccessibilityManager();

a11y.registerFocusable(element, 1);
a11y.registerShortcut('Enter', handleSubmit, [], 'Submit form');
a11y.announce('Item added to cart', 'polite');
a11y.trapFocus(dialogElement);
```

## Architecture

### Compilation Pipeline

```
Source (.aura) → Lexer → Parser → Semantic Analyzer → Code Generator → JavaScript
```

### Runtime Components

- **Signal System**: Fine-grained reactivity with automatic dependency tracking
- **Reconciler**: Efficient DOM updates without virtual DOM
- **Animation Controller**: FLIP-based animation engine
- **Accessibility Manager**: Automatic focus and ARIA management

## Examples

### Todo Application

```aura
component TodoApp:
  state todos = []
  state input = ""
  
  computed activeTodos = todos.filter(t => !t.completed)
  computed completedTodos = todos.filter(t => t.completed)
  
  on addTodo =>
    todos = [...todos, { id: Date.now(), text: input, completed: false }]
    input = ""
  
  on toggleTodo(id) =>
    todos = todos.map(t => t.id == id ? { ...t, completed: !t.completed } : t)
  
  on deleteTodo(id) =>
    todos = todos.filter(t => t.id != id)
  
  animate addTodo:
    opacity: 0 -> 1
    translateY: -20 -> 0
  
  role "application"
  label "Todo list"
  
  main:
    h1: "My Todos"
    
    form onsubmit=addTodo:
      input 
        value=input 
        oninput=(e) => input = e.target.value
        placeholder="What needs to be done?"
      button type="submit": "Add"
    
    section:
      h2: "Active ({activeTodos.length})"
      ul:
        each todo in activeTodos:
          li key=todo.id:
            input 
              type="checkbox"
              onchange=() => toggleTodo(todo.id)
            span: todo.text
            button onclick=() => deleteTodo(todo.id): "Delete"
    
    section:
      h2: "Completed ({completedTodos.length})"
      ul:
        each todo in completedTodos:
          li key=todo.id:
            input 
              type="checkbox"
              checked=true
              onchange=() => toggleTodo(todo.id)
            span class="completed": todo.text
            button onclick=() => deleteTodo(todo.id): "Delete"
```

### Form with Validation

```aura
component LoginForm:
  state email = ""
  state password = ""
  state errors = {}
  
  computed isValid = email.includes("@") && password.length >= 8
  
  on validate =>
    errors = {}
    if !email.includes("@"):
      errors.email = "Invalid email"
    if password.length < 8:
      errors.password = "Password too short"
  
  on submit =>
    validate()
    if isValid:
      login(email, password)
  
  role "form"
  label "Login form"
  
  form onsubmit=submit:
    div:
      label for="email": "Email"
      input 
        id="email"
        type="email"
        value=email
        oninput=(e) => email = e.target.value
        aria-invalid=(errors.email ? "true" : "false")
      
      when errors.email:
        p class="error" role="alert": errors.email
    
    div:
      label for="password": "Password"
      input 
        id="password"
        type="password"
        value=password
        oninput=(e) => password = e.target.value
        aria-invalid=(errors.password ? "true" : "false")
      
      when errors.password:
        p class="error" role="alert": errors.password
    
    button type="submit" disabled=(!isValid): "Login"
```

### Animated Modal

```aura
component Modal:
  state isOpen = false
  
  on open => isOpen = true
  on close => isOpen = false
  on escape => close()
  
  animate open:
    opacity: 0 -> 1
    scale: 0.9 -> 1
    duration: 300
    easing: spring
  
  animate close:
    opacity: 1 -> 0
    scale: 1 -> 0.9
    duration: 200
  
  role "dialog"
  label "Modal dialog"
  
  when isOpen:
    div class="modal-backdrop" onclick=close:
      div class="modal-content" onclick=(e) => e.stopPropagation():
        button 
          class="close-button"
          onclick=close
          aria-label="Close dialog": "×"
        
        slot
```

## Performance

Aura is designed for performance:

- **No Virtual DOM**: Direct DOM manipulation with surgical updates
- **Fine-Grained Reactivity**: Only affected components re-render
- **Compile-Time Optimization**: Dead code elimination and static analysis
- **Lazy Evaluation**: Computed values only recalculate when dependencies change
- **Efficient Animations**: FLIP technique prevents layout thrashing

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Targets ES2022+ for optimal performance.

## TypeScript Support

Aura generates TypeScript-compatible code. Type definitions are included:

```typescript
import type { Signal, Computed, Component } from '@aura/runtime';
```

## Contributing

Contributions are welcome! Please read the [MANIFESTO.md](./MANIFESTO.md) for design philosophy and principles.

### Development Setup

```bash
git clone https://github.com/yourusername/aura-lang.git
cd aura-lang
npm install
npm run build
npm run test
```

## License

MIT License - see [LICENSE](./LICENSE) for details

## Acknowledgments

Inspired by:
- **Svelte**: Compile-time optimization
- **Solid**: Fine-grained reactivity
- **Vue**: Developer experience
- **React**: Component model
- **Framer Motion**: Animation philosophy

But designed from scratch with a unique vision.

---

**Aura** - Illuminate your interfaces

[Documentation](./docs) | [Examples](./examples) | [Manifesto](./MANIFESTO.md)
