# XDOM Documentation

## Introduction

XDOM is a lightweight, declarative DOM creation library that enables seamless integration with reactive signals. It provides a simple, intuitive API for creating complex DOM structures without the overhead of a virtual DOM, while supporting reactivity through the signal system.
It can be easily mounted as shadow component.

## Basic Usage

XDOM uses a simple, functional approach to create DOM elements:

```typescript
// Import specific element functions
import { div, p, button } from "~common/dom/xdom";

// Or import everything
import * as xdom from "~common/dom/xdom";

const element = div(
  { className: "container" }, 
  [
    p(["Hello world"]), 
    button({ id: "myButton" }, ["Click me"])
  ]
);

document.body.append(element);
```

Each element function accepts two parameters:

- First parameter: Attributes object or children
- Second parameter: Children (if the first parameter is attributes)
- Children must be an array

## Creating Elements

### Simple Elements

```javascript
// Simple element with text
const paragraph = p("Hello world");

// Element with attributes and text
const button = button(
  { id: "submitBtn", className: "primary" }, 
  ["Submit"]
);
```

### Nested Elements

```javascript
const card = div({ className: "card" }, [
  div({ className: "card-header" }, [h3(["Card Title"])]),
  div({ className: "card-body" }, [p(["Card content goes here"]), button({ className: "btn" }, ["Action"])]),
]);
```

## Working with Attributes

XDOM supports all standard HTML attributes as well as inline styles:

```javascript
const styledDiv = div(
  {
    id: "uniqueId",
    className: "highlight-box",
    style: {
      color: "red",
      backgroundColor: "#f5f5f5",
      padding: "20px",
      borderRadius: "5px",
    },
    "data-custom": "value", // Custom data attributes
  },
  ["Content here"]
);
```

## Integration with Signals

XDOM works seamlessly with signals to create reactive DOM elements.

### Basic Signal Usage

```javascript
import { signal, computed } from './signal';

const count = signal(0);
const display = computed(() =&gt; `Count: ${count.value}`);

const counter = div({ className: 'counter' }, [
  p(display),
  button({
    onclick: () => count.value++
  }, ['Increment'])
]);
```

When `count.value` changes, the text inside the paragraph will automatically update.

### Reactive Attributes

Signals can be used for attributes as well:

```javascript
const isActive = signal(false);
const buttonClass = computed(() => (isActive.value ? "btn-active" : "btn-inactive"));

const toggleButton = button(
  {
    className: buttonClass,
    onclick: () => (isActive.value = !isActive.value),
  },
  ["Toggle"]
);
```

### Two-way Binding

Input elements automatically support two-way binding with signals:

```javascript
const inputValue = signal("");

const input = input({
  value: inputValue,
  placeholder: "Type something...",
});

const display = p([
  computed(() => `You typed: ${inputValue.value}`)
]);
```

## Event Handling

Event handlers are specified as attributes with the `on` prefix:

```javascript
const clickHandler = (e) => {
  console.log('Button clicked', e);
};

const button = button({
  onclick: clickHandler,
  onmouseover: () => console.log('Mouse over'),
  onmouseout: () => console.log('Mouse out')
}, ['Interactive Button']);
```

## Working with Lists

For rendering dynamic lists efficiently, use the `SignalsToDoms` helper:

```javascript
import { SignalsToDoms } from './signal-to-dom';

const items = signal([
  { 'data-key': 'item-1', text: 'First item' },
  { 'data-key': 'item-2', text: 'Second item' }
]);

const list = ul([
  computed(() =>
    SignalsToDoms(items).map((item) =>
      li(
        { 'data-key': item.value['data-key'] }, 
        [item.value.text]
      )
    )
  )
]);

// Add a new item
setTimeout(() => {
  items.value = [
    ...items.value,
    { 'data-key': 'item-3', text: 'New item' }
  ];
}, 2000);
```

The `data-key` property is essential for optimized rendering - it allows XDOM to efficiently update only the elements that change.

## Best Practices

1. **Always provide keys for list items**: Use `data-key` for list items to ensure efficient updates.
2. **Use computed signals for derived values**: When combining multiple signals, use `computed` for better performance.
3. **Separate logic from presentation**: Keep complex logic in separate functions, making your XDOM code focused on structure.
4. **Organize components logically**: Create helper functions for reusable component patterns.
5. **Leverage CSS classes instead of inline styles** when possible for better performance and maintainability.

## Performance Considerations

- XDOM directly manipulates the DOM without a virtual DOM, making it performant for direct updates
- For large lists, always use keyed rendering with `SignalsToDoms`
- Minimize deep nesting of computed signals to avoid unnecessary recalculations
- Use `batch()` when making multiple signal updates to prevent excessive re-renders

## API Reference

### Core Functions

- `div(), p(), span(), etc.`: Create HTML elements
- `createDomElement()`: Low-level function to create elements

### Signal Integration

- `SignalToElement.renderAndSubscribe()`: Renders a signal value to an element and updates it when the signal changes
- `SignalToElement.subscribeAttribute()`: Subscribes an element attribute to a signal
- `SignalsToDoms()`: Helper for efficiently rendering lists of signals

## Examples

### Todo List Application

```javascript
import { div, h1, input, button, ul, li } from '~common/dom/xdom';
import { signal, computed } from './signal';
import { SignalsToDoms } from './signal-to-dom';

// State management with signals
const newTodo = signal('');
const todos = signal([]);

// Create a unique ID for each todo
const createTodo = () =&gt; {
  if (newTodo.value.trim() === '') return;

  todos.value = [
    ...todos.value,
    {
      'data-key': `todo-${Date.now()}`,
      text: newTodo.value,
      completed: false
    }
  ];
  newTodo.value = '';
};

// Toggle completed status
const toggleTodo = (id) =&gt; {
  todos.value = todos.value.map(todo =&gt;
    todo['data-key'] === id
      ? {...todo, completed: !todo.completed}
      : todo
  );
};

// UI components
const app = div({ className: 'todo-app' }, [
  h1(['Todo List']),

  div({ className: 'add-todo' }, [
    input({
      value: newTodo,
      placeholder: 'Add a new task...',
      onkeyup: (e) => e.key === 'Enter' && createTodo()
    }),
    button({ onclick: createTodo }, ['Add'])
  ]),

  ul({ className: 'todo-list' }, [
    computed(() =>
      SignalsToDoms(todos).map((todo) =>
        li({
          'data-key': todo.value['data-key'],
          className: todo.value.completed ? 'completed' : '',
          onclick: () => toggleTodo(todo.value['data-key'])
        }, todo.value.text)
      )
    )
  ])
]);

document.body.append(app);
```
