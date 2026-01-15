# Aura Language Syntax Reference

Complete syntax specification for the Aura declarative UI language.

## Table of Contents

1. [Components](#components)
2. [State Management](#state-management)
3. [Computed Values](#computed-values)
4. [Effects](#effects)
5. [Event Handlers](#event-handlers)
6. [Animations](#animations)
7. [Elements](#elements)
8. [Conditional Rendering](#conditional-rendering)
9. [List Rendering](#list-rendering)
10. [Accessibility](#accessibility)
11. [Expressions](#expressions)

---

## Components

### Basic Component

```aura
component ComponentName:
  # Component body
```

### Component with Props

```aura
component Button:
  # Props are automatically inferred from usage
  # Access via props.propName in expressions
```

---

## State Management

### State Declaration

```aura
state variableName = initialValue
```

### Examples

```aura
state count = 0
state isOpen = false
state items = []
state user = { name: "Alice", age: 30 }
state text = "Hello"
```

### State Updates

```aura
on click => count = count + 1
on toggle => isOpen = !isOpen
on add => items = [...items, newItem]
```

---

## Computed Values

### Computed Declaration

```aura
computed name = expression
```

### Examples

```aura
computed doubled = count * 2
computed fullName = firstName + " " + lastName
computed total = items.reduce((sum, item) => sum + item.price, 0)
computed isValid = email.includes("@") && password.length >= 8
```

### Automatic Dependency Tracking

Dependencies are automatically tracked from the expression:

```aura
state firstName = "John"
state lastName = "Doe"
computed fullName = firstName + " " + lastName
# Automatically depends on firstName and lastName
```

---

## Effects

### Effect Declaration

```aura
effect (dependencies) => body
```

### Examples

```aura
effect (count) => console.log("Count:", count)

effect (userId) =>
  fetchUserData(userId)

effect () =>
  const timer = setInterval(tick, 1000)
  return () => clearInterval(timer)
```

### Cleanup

Return a function from an effect for cleanup:

```aura
effect () =>
  const subscription = subscribe()
  return () => subscription.unsubscribe()
```

---

## Event Handlers

### Handler Declaration

```aura
on eventName => expression
on eventName(params) => expression
```

### Examples

```aura
on click => count = count + 1
on submit => handleSubmit()
on change(value) => updateValue(value)
on keydown.enter => search()
on focus => isActive = true
on blur => isActive = false
```

### Event Modifiers

```aura
on click.prevent => # preventDefault()
on submit.stop => # stopPropagation()
on keydown.enter => # Only on Enter key
on keydown.escape => # Only on Escape key
```

---

## Animations

### Animation Declaration

```aura
animate trigger:
  property: value
  duration: milliseconds
  easing: easingFunction
```

### Examples

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

animate exit:
  opacity: 1 -> 0
  translateY: 0 -> 20
  duration: 200
```

### Easing Functions

- `linear`
- `ease-in`
- `ease-out`
- `ease-in-out`
- `ease-in-cubic`
- `ease-out-cubic`
- `ease-in-out-cubic`
- `ease-in-quart`
- `ease-out-quart`
- `ease-in-out-quart`
- `spring`
- `bounce`

### Stagger

```aura
animate stagger:
  opacity: 0 -> 1
  stagger: 50
```

---

## Elements

### Element Syntax

```aura
tagName attributes: content
```

### Self-Closing Elements

```aura
input type="text" value=value
img src="image.jpg" alt="Description"
```

### Nested Elements

```aura
div:
  h1: "Title"
  p: "Paragraph"
```

### Attributes

```aura
div class="container" id="main":
  # content

button onclick=handleClick disabled=isDisabled: "Click"

input 
  type="text" 
  value=text
  oninput=(e) => text = e.target.value
```

### Dynamic Attributes

```aura
div class=(isActive ? "active" : "inactive")
button disabled=(!isValid)
input aria-invalid=(hasError ? "true" : "false")
```

### Text Interpolation

```aura
p: "Count: {count}"
h1: "Hello, {name}!"
span: "Total: ${total.toFixed(2)}"
```

---

## Conditional Rendering

### When Statement

```aura
when condition:
  # elements to render
```

### Examples

```aura
when isLoggedIn:
  div: "Welcome back!"

when error:
  p class="error": error.message

when loading:
  div: "Loading..."
when !loading && data:
  div: data.content
```

### Nested Conditions

```aura
when isLoggedIn:
  when isAdmin:
    button: "Admin Panel"
  when !isAdmin:
    p: "Regular User"
```

---

## List Rendering

### Each Statement

```aura
each item in iterable:
  # elements to render
```

### Examples

```aura
each item in items:
  li: item.name

each user, index in users:
  div: "{index + 1}. {user.name}"

each todo in todos:
  li key=todo.id:
    span: todo.text
```

### Key Attribute

Always provide a key for list items:

```aura
each item in items:
  div key=item.id: item.content
```

---

## Accessibility

### Role Declaration

```aura
role "roleName"
```

### Label Declaration

```aura
label "Accessible label"
```

### Description Declaration

```aura
describe "Detailed description"
```

### Examples

```aura
component Dialog:
  role "dialog"
  label "Confirmation dialog"
  describe "Please confirm your action"
  
  on escape => close()

component Button:
  role "button"
  label "Submit form"
```

### ARIA Attributes

```aura
button 
  aria-label="Close dialog"
  aria-pressed=(isPressed ? "true" : "false")
  aria-expanded=(isOpen ? "true" : "false"): "Toggle"

input 
  aria-invalid=(hasError ? "true" : "false")
  aria-describedby="error-message"
```

---

## Expressions

### Literals

```aura
42              # Number
3.14            # Float
"text"          # String
true            # Boolean
false           # Boolean
```

### Operators

#### Arithmetic

```aura
a + b           # Addition
a - b           # Subtraction
a * b           # Multiplication
a / b           # Division
```

#### Comparison

```aura
a == b          # Equality
a != b          # Inequality
a < b           # Less than
a > b           # Greater than
a <= b          # Less than or equal
a >= b          # Greater than or equal
```

#### Logical

```aura
a && b          # Logical AND
a || b          # Logical OR
!a              # Logical NOT
```

#### Ternary

```aura
condition ? valueIfTrue : valueIfFalse
```

### Member Access

```aura
object.property
object[key]
array[index]
```

### Function Calls

```aura
functionName()
functionName(arg1, arg2)
object.method(args)
```

### Arrays

```aura
[]
[1, 2, 3]
[...existingArray, newItem]
array.map(item => item * 2)
array.filter(item => item > 0)
```

### Objects

```aura
{}
{ key: value }
{ ...existingObject, newKey: newValue }
```

### Arrow Functions

```aura
() => expression
(param) => expression
(param1, param2) => expression
```

---

## Comments

```aura
# Single line comment

# Multi-line comments
# are multiple single-line
# comments
```

---

## Indentation

Aura uses indentation to define scope (like Python):

```aura
component Example:
  state value = 0
  
  on click =>
    value = value + 1
  
  div:
    h1: "Title"
    p: "Content"
```

- Use 2 spaces for indentation
- Consistent indentation is required
- Mixing tabs and spaces is an error

---

## Complete Example

```aura
component TodoApp:
  state todos = []
  state input = ""
  state filter = "all"
  
  computed filteredTodos = todos.filter(t =>
    filter == "all" || t.status == filter
  )
  
  computed activeCount = todos.filter(t => !t.completed).length
  
  on addTodo =>
    if input.trim():
      todos = [...todos, {
        id: Date.now(),
        text: input,
        completed: false
      }]
      input = ""
  
  on toggleTodo(id) =>
    todos = todos.map(t =>
      t.id == id ? { ...t, completed: !t.completed } : t
    )
  
  on deleteTodo(id) =>
    todos = todos.filter(t => t.id != id)
  
  effect (todos) =>
    localStorage.setItem("todos", JSON.stringify(todos))
  
  animate addTodo:
    opacity: 0 -> 1
    translateY: -20 -> 0
    duration: 300
    easing: spring
  
  role "application"
  label "Todo list application"
  
  main:
    h1: "My Todos"
    
    form onsubmit=addTodo:
      input 
        value=input
        oninput=(e) => input = e.target.value
        placeholder="Add a todo"
        aria-label="New todo input"
      
      button type="submit": "Add"
    
    nav:
      button onclick=() => filter = "all": "All"
      button onclick=() => filter = "active": "Active"
      button onclick=() => filter = "completed": "Completed"
    
    ul:
      each todo in filteredTodos:
        li key=todo.id:
          input 
            type="checkbox"
            checked=todo.completed
            onchange=() => toggleTodo(todo.id)
          
          span: todo.text
          
          button onclick=() => deleteTodo(todo.id): "Delete"
    
    footer:
      p: "{activeCount} items left"
```

---

## Best Practices

1. **Use descriptive names** for states and computed values
2. **Keep components small** and focused
3. **Provide accessibility attributes** for all interactive elements
4. **Use keys** in list rendering
5. **Validate forms** with computed values
6. **Clean up effects** with return functions
7. **Use animations sparingly** for better UX
8. **Follow semantic HTML** structure
9. **Test keyboard navigation**
10. **Respect user preferences** (reduced motion, etc.)

---

## Error Handling

The compiler will catch:

- Syntax errors
- Undefined variables
- Missing accessibility attributes
- Invalid HTML structure
- Type mismatches (in strict mode)

Example error:

```
Error at line 10, column 5:
  Undefined variable 'count'
  Did you mean 'counter'?
```

---

This syntax reference covers the complete Aura language specification. For more examples, see the `/examples` directory.
