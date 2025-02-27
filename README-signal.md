# Using Signal and XDom

Signal is a reactive library primarily used by SolidJS. It's a lightweight reactivity system for UI development that doesn't rely on a virtual DOM. Instead, it uses direct DOM manipulation for performance and simplicity.

Simple UI that we can write with DOM and Signal

<video src="https://private-user-images.githubusercontent.com/155412530/373231958-a7bbeca6-87a3-4ea0-8912-2bcc50413ec4.mov?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Mjc5NTUwMDksIm5iZiI6MTcyNzk1NDcwOSwicGF0aCI6Ii8xNTU0MTI1MzAvMzczMjMxOTU4LWE3YmJlY2E2LTg3YTMtNGVhMC04OTEyLTJiY2M1MDQxM2VjNC5tb3Y_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjQxMDAzJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI0MTAwM1QxMTI1MDlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT02OWRlY2UwYTE2YTliZTIzYmIxODZhZTYzNjc3NjQ4YWIwNDhjY2RhMDVhYWRjYjZmNTg2ZjNlNzZlOGY2NzAzJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.phg52GFpEykVcx9BqS6VwZPh_kX7FNT1fsHFb-s51bY"> </video>

With Signal, it's helpful to think in terms of the publisher/subscriber (pub/sub) model. If you're used to React, you might need to adjust your thinking: instead of components re-rendering whenever state updates, Signal allows for fine-grained reactivity where only the parts of the UI that depend on changed data are updated.

## Example Signal 1

Here's a basic example using `signal` and `subscribe`:

```javascript
const count = signal(0);

count.subscribe((newCount) => {
  console.log('newCount =', newCount);
});

setInterval(() => {
  count.value += 1;
}, 1000);

// Output:
// newCount = 0
// newCount = 1
// newCount = 2
// newCount = 3
```

In this example:

- We create a signal `count` initialized to `0`.
- We subscribe to changes on `count` and log the new value whenever it changes.
- Every second, we increment `count.value` by `1`.
- The subscribed function logs the new value each time `count.value` changes.

## Example Signal 2

You can achieve the same effect using `effect`, which automatically tracks dependencies:

```javascript
const count = signal(0);

effect(() => {
  console.log('newCount =', count.value);
});

effect(() => {
  // This will not run again because it's just the signal object, not its value
  console.log('This will not run again:', count);
});

setInterval(() => {
  count.value += 1;
}, 1000);

// Output:
// newCount = 0
// newCount = 1
// newCount = 2
// newCount = 3
```

**Explanation:**

- The first `effect` accesses `count.value`, so it re-runs whenever `count.value` changes.
- The second `effect` accesses `count` (the signal object itself), not `count.value`. Since the signal object doesn't change, this `effect` runs only once.

**Note:** Always access `.value` inside `effect` to establish a reactive dependency.

## Example Signal 3

Combining two or more signals:

```javascript
const countA = signal(0);
const countB = signal(0);

effect(() => {
  console.log('Sum =', countA.value + countB.value);
});

setInterval(() => {
  countA.value += 1;
}, 1000);

// Output:
// Sum = 0
// Sum = 1
// Sum = 2
// Sum = 3
```

Here:

- We have two signals, `countA` and `countB`.
- The `effect` logs the sum of `countA.value` and `countB.value`.
- Only `countA` is incremented, so the sum increases by `1` every second.

## Example Signal 4

Using `computed` to create a derived signal:

```javascript
const countA = signal(0);
const countB = signal(0);
const sum = computed(() => countA.value + countB.value);

effect(() => {
  console.log('Sum =', sum.value);
});

setInterval(() => {
  countA.value += 1;
}, 1000);

// Output:
// Sum = 0
// Sum = 1
// Sum = 2
// Sum = 3
```

**Explanation:**

- `sum` is a computed signal that automatically updates when `countA.value` or `countB.value` changes.
- The `effect` logs `sum.value`, which reflects the current sum of `countA` and `countB`.

## Example With XDom 1

Using signals with the DOM through our in-house library `XDom` (since our company is SquareX). It resembles React but without JSX.

```javascript
const count = signal(0);
const color = computed(() => (count.value % 2 === 0 ? 'green' : 'red'));

const element = div(
  {
    style: { color: color },
  },
  [count],
);

setInterval(() => {
  count.value += 1;
}, 1000);

document.body.append(element);
```

**Explanation:**

- `count` is a signal that increments every second.
- `color` is a computed signal that changes based on whether `count.value` is even or odd.
- `element` is a `div` that displays `count` and styles its text color using the `color` signal.
- As `count.value` changes, the `div` updates both its content and text color automatically.

**Note:** `XDom` understands signals and updates the DOM when signal values change.

## Example With XDom 2

Passing an array of signals into the DOM:

```javascript
const messages = signal([]);

const element = div(
  {},
  messages.value.map((m) => div(m.value)),
);

setInterval(() => {
  messages.value.push({
    id: Date.now(),
    value: 'hello ' + Date.now(),
  });
}, 1000);

document.body.append(element);
```

**Issue:**

In this example, the messages will **not** be rendered correctly.

- We're unwrapping `messages.value` and passing it to `div`, so `XDom` doesn't know to update the DOM when `messages.value` changes.

### Correct Example

Passing the signal or using a **COMPUTED** value:

```javascript
const messages = signal([]);

const messageElements = computed(() => messages.value.map((m) => div(m.value)));

const element = div({}, messageElements);

setInterval(() => {
  messages.value.push({
    id: Date.now(),
    value: 'hello ' + Date.now(),
  });
}, 1000);

document.body.append(element);
```

**Explanation:**

- `messages` is a signal containing an array.
- `messageElements` is a computed signal that maps over `messages.value` and returns an array of `div` elements.
- Since `messageElements` is a computed signal, it updates whenever `messages.value` changes.
- `XDom` re-renders the DOM based on `messageElements`.

## Example With XDom 3

Reactive Signals with Keyed DOM Rendering

To mimic React-like behavior where items in a list are not re-rendered unless their key changes, we use the unique id property of each signal object as the key.

```javascript
import { signal } from './signal';
import { SignalsToDom } from './xdomlist';
import { SignalToElement } from './signal-to-element';

// Create a signal holding an array of message objects
const messages$ = signal([
  { id: 'msg-1', text: 'Hello World' },
  { id: 'msg-2', text: 'Reactive DOM' },
]);

const content = div({ class: 'container' }, [
  computed(() =>
    SignalsToDoms(messages$).map((item) => {
      return div(item.text);
    }),
  ),
]);
document.body.append(content);

// Dynamically update the messages
setTimeout(() => {
  messages$.value = [
    ...messages$.value,
    { id: 'msg-3', text: 'New Message Added!' },
  ];
}, 2000);

setTimeout(() => {
  messages$.value = messages$.value.filter((msg) => msg.id !== 'msg-1');
}, 4000);
```

## **Explanation:**

- messages$ is a signal holding an array of objects, each with a unique id.
- SignalsToDom ensures that DOM nodes are tracked using unique keys (id) and Nodes are not re-rendered unnecessarily unless their key changes.
- Case where animation will only play for recently added element, and avoid replay animation for older element
