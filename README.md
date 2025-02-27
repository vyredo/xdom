# Using XDOM

XDom is a thin wrapper on top of original HTML that enables signals to work seamlessly.

## How to use XDOM

```javascript
import { div, p } from "xdom";

const element = div({ className: "div-container", style: { color: "red" } }, [p("hello world"), p({ id: "myId" }, "hello guys")]);

document.body.append(element);
```

It's quite intuitive and simple.
The element is created by calling the tag name like `div()`, or `p()`.

- For the first argument, it can be any attribute or `Children`.
- For the second argument, it can be undefined or `Children`

```typescript
type Children = string | Element | Signal | Array<string | Element | Signal>;
```

## How to use XDOM with signal

Signals can be passed to attributes or children.

### Naive Example

```javascript
import { div, p } from "xdom";
import { signal, computed } from "signal";

const count$ = signal(0);
const colorState$ = computed(() => (count.value % 2 == 0 ? "red" : "green"));

setInterval(() => {
  count.value++;
}, 1000);

const element = div({ className: "div-container", style: { color: colorState$ } }, [
  p("hello world"),
  // this P will not be reactive because we unwrap signal and pass a string
  p({ id: "myId" }, `my color is \${colorState$}`),
]);

document.body.append(element);
```

### Better Example

```javascript
import { div, p } from "xdom";
import { signal, computed } from "signal";

const count$ = signal(0);
const colorState$ = computed(() => (count.value % 2 == 0 ? "red" : "green"));

// the string will be wrapped in a computed signal
const element$ = computed(() => `my color is \${colorState$.value}`);

setInterval(() => {
  count.value++;
}, 1000);

const element = div({ className: "div-container", style: { color: colorState$ } }, [p("hello world"), p({ id: "myId" }, element$)]);

document.body.append(element);
```

That's basically it. As long as we pass a signal to the element, we handle the logic of making it reactive.

## Example for textarea, input, select

For `textarea`, `input`, and `select`, there is pre-built logic that knows when `onchange` or `oninput` is fired, and it will re-render the component that has a signal.

```javascript
import { select, textarea } from "xdom";
import { signal, computed } from "signal";

const count$ = signal(0);
const colorState$ = computed(() => (count.value % 2 == 0 ? "red" : "green"));

// the string will be wrapped in a computed signal
const element$ = computed(() => `my color is \${colorState$.value}`);

setInterval(() => {
  count.value++;
}, 1000);

const element = div({ className: "div-container", style: { color: colorState$ } }, [textarea({ value: count$ })]);

document.body.append(element);
```
