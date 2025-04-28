import { Signal } from "./signal";
import { SignalsToDoms } from "./signal-to-dom";

const mapIdToWeakRef = new Map<string, WeakRef<Element>>();

/**
 * integrate Signal with Dom to make DOM reactive
 */
export class SignalToElement {
  // handle case when Signal is pass as child of element
  static renderAndSubscribe = (element: HTMLElement, signal: Signal) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("this is not custom element " + element);
    }

    let oldNode: Element | undefined;
    // weak reference to allow element to be GC and not bound by signal.subscribe()
    const elementRef = new WeakRef(element);
    const unsubscribe = signal.subscribe((newValue) => {
      const weakElement = elementRef.deref();

      // element already GC
      if (!weakElement) {
        oldNode = undefined;
        return unsubscribe();
      }

      if (newValue instanceof Element) {
        weakElement.appendChild(newValue);
        return;
      }

      if (Array.isArray(newValue) && newValue[0] instanceof Element) {
        newValue.forEach((el) => {
          // Check if item is to be removed
          if (el instanceof HTMLElement && el.getAttribute("data-to-unmount")) {
            el.remove();
            return;
          }

          // Check if each new element has a data-key
          const dataKey = el.getAttribute("data-key");
          if (el instanceof HTMLElement && el && !dataKey) {
            weakElement.innerHTML = "";
            throw new Error(`element does not contain data-key, use function ${SignalsToDoms.name} if you want to 
              convert array of signal to elements
              `);
          }

          const oldElement = mapIdToWeakRef.get(dataKey)?.deref();
          if (!oldElement) {
            weakElement.append(el);
            mapIdToWeakRef.set(dataKey, new WeakRef(el));
            return;
          }

          // compare oldElement and new element, if different update it
          // following React, if key are the same but some attribute is difference.
          // we will just some of HTML attribute
          const newAttributes = findAttributeDifference(oldElement, el);
          if (newAttributes.length > 0) {
            newAttributes.forEach(({ attribute, value }) => {
              if (attribute === "style.cssText") {
                el.style.cssText = value;
                return;
              }
              el[attribute] = value;
            });
          }
        });
        return;
      }

      if (signal.value instanceof Element && oldNode) {
        weakElement.replaceChild(newValue, oldNode);
        oldNode = newValue;
        return;
      }

      weakElement.textContent = signal.value != null ? String(signal.value) : "";
    });
  };

  // handle case when Signal is pass to attribute
  // if the attribute is `value`, this function will try to listen to 'input' event
  static subscribeAttribute = (element: HTMLElement, attributeName: string, signal: Signal) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("this is not custome element " + element);
    }

    const updateAttribute = (v: string, el: HTMLElement | undefined) => {
      if (v != null) {
        el?.setAttribute(attributeName, String(v));
      } else {
        el?.removeAttribute(attributeName);
      }
    };

    // run once initially
    updateAttribute(signal.value, element);

    // weak reference to allow element to be GC and not bound by signal.subscribe()
    const elementRef = new WeakRef(element);
    const unsubscribe = signal.subscribe((newValue) => {
      const weakElement = elementRef.deref();

      // element already GC
      if (!weakElement) return unsubscribe();

      // update attribute value when it changes
      updateAttribute(newValue, weakElement);

      // for attribute value, we will automatically listen to input event
      if (attributeName === "value") {
        const elementHasValueAttribute = (el: HTMLElement | EventTarget | null): el is HTMLElement & { value: string } => {
          return !!el && [HTMLInputElement, HTMLSelectElement, HTMLMeterElement, HTMLProgressElement, HTMLTextAreaElement].some((ClassName) => el instanceof ClassName);
        };

        if (
          elementHasValueAttribute(weakElement) ||
          (weakElement instanceof HTMLDivElement && weakElement.contentEditable) // contenteditable
        ) {
          const inputCallback = (e: Event) => {
            if (elementHasValueAttribute(e.target)) {
              updateAttribute(String(e.target.value), weakElement);
              signal.value = String(e.target.value);
            }
          };

          weakElement.removeEventListener("input", inputCallback);
          weakElement.addEventListener("input", inputCallback);
        }
      }
    });
  };
}

function findAttributeDifference(oldEl: Element, newEl: Element) {
  const attributesToCompare = [
    "id",
    "class",
    "className",
    "src",
    "href",
    "alt",
    "title",
    "value",
    "type",
    "placeholder",
    "disabled",
    "readonly",
    "checked",
    "selected",
    "name",
    "style",
    // 'data-*',
  ];

  const result: { attribute: string; value: string | null }[] = [];

  // compare some famous attribute
  for (const attr of attributesToCompare) {
    const oldAttr = oldEl.getAttribute(attr);
    const newAttr = newEl.getAttribute(attr);

    if (oldAttr !== newAttr) {
      result.push({ attribute: attr, value: newAttr });
    }
  }

  // compare style
  const oldStyle = oldEl instanceof HTMLElement ? oldEl.style.cssText : "";
  const newStyle = newEl instanceof HTMLElement ? newEl.style.cssText : "";
  if (oldStyle !== newStyle) {
    result.push({ attribute: "style.cssText", value: newStyle });
  }

  return result;
}
