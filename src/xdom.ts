import { Signal } from "./signal";
import { SignalToElement } from "./signal-to-element";
import { HTMLElementTagMap } from "./types";

// Enable typescript to detect event-based attributes and suggest the correct type
// i.e., div({ onclick: value }). Value will be type-checked as (e: MouseEvent) => void
export type ElementEventHandlers = {
  [K in keyof GlobalEventHandlersEventMap as `on${K}`]?: (this: Element, ev: GlobalEventHandlersEventMap[K]) => any;
};

export type CustomHTMLElement<T extends keyof HTMLElementTagMap> = Omit<HTMLElementTagMap[T], "style" | "value"> & {
  style?: Partial<CSSStyleDeclaration>;
  key?: string | Signal<string>;
  "data-key"?: string | Signal<string>;
  value?: string | number | Signal<string> | Signal<number>;
};

export type CreateElementAttribute<T extends keyof HTMLElementTagMap> = ElementEventHandlers & Partial<CustomHTMLElement<T>> & { [key: string]: unknown };

/**
 * Now Children must be an array (like Signal[], string[], HTMLElement[]) or undefined.
 * This constraint will optimize inferrence time because both CreateElementAttribute, Signal, HTMLElementTag are object types.
 * Typescript will need longer time to provide type intellisense while inferring between those three.
 */
export type CreateElementChildren<T extends keyof HTMLElementTagMap> = undefined | Array<CustomHTMLElement<T> | undefined | string | Signal>;

export function createDomElement<T extends keyof HTMLElementTagMap, K extends keyof HTMLElementTagMap>(
  tagName: T,
  attributeOrChildren?: CreateElementAttribute<T>,
  childrenParameter?: CreateElementChildren<K>
): HTMLElementTagMap[T] {
  const element = document.createElement(tagName) as HTMLElementTagMap[T];

  if (!attributeOrChildren) {
    return element;
  }

  let attribute: CreateElementAttribute<T> | undefined = attributeOrChildren;
  let children: CreateElementChildren<K> | undefined = childrenParameter;
  // if first parameter an array, assigned to children and empty attribute
  // type check will prevent both parameters to be an array
  if (Array.isArray(attributeOrChildren)) {
    children = attributeOrChildren;
    attribute = undefined;
  }

  if (children) {
    children.forEach((el) => {
      if (typeof el === "string") {
        element.appendChild(document.createTextNode(el));
      } else if (el instanceof Signal) {
        SignalToElement.renderAndSubscribe(element, el);
      } else if (el == null) {
        return;
      } else {
        element.appendChild(el as Node);
      }
    });
  }

  if (!attribute) return element;
  if (attribute.style) {
    // only update property that's specified in attribute.style
    Object.assign(element.style, attribute.style);
  }

  Object.entries(attribute).forEach(([KEY, value]) => {
    const directAssignedKeys = new Set([
      "textContent",
      "innerText",
      "innerHTML",
      "outerHTML",
      "value",
      "checked",
      "selected",
      "disabled",
      "readOnly",
      "maxLength",
      "selectedIndex",
      "className",
      "classList",
      "src",
      "href",
      "alt",
      "htmlFor",
      "tabIndex",
      "scrollTop",
      "scrollLeft",
      "min",
      "max",
      "step",
      "defaultValue",
      "defaultChecked",
      "options",
      "multiple",
      "size",
      "rows",
      "cells",
      "rowSpan",
      "colSpan",
      "hidden",
    ]);

    if (directAssignedKeys.has(KEY)) {
      element[KEY] = value;
      return;
    }

    // Almost all attribute keys are lowercase, like maxlength, gradientunits, etc.
    const key = KEY.toLowerCase();
    const isEventHandlerProperty = (el: HTMLElement, p: string): p is keyof Omit<GlobalEventHandlers, "addEventListener" | "removeEventListener"> => {
      return typeof p === "string" && p.startsWith("on") && p in el;
    };

    if (isEventHandlerProperty(element, key) && typeof value === "function") {
      element[key] = value as (...args: any[]) => any;
      return;
    }

    if (typeof value === "boolean") {
      value ? element.setAttribute(key, "") : element.removeAttribute(key);
      return;
    }

    // Handle data attributes
    if (key.startsWith("data-")) {
      element.setAttribute(key, String(value));
      return;
    }
    // Generic string or number
    if (typeof value === "string" || typeof value === "number") {
      element.setAttribute(key, value.toString());
      return;
    }
    // Case where signal is passed to attribute
    if (value instanceof Signal) {
      SignalToElement.subscribeAttribute(element, key, value);
    }
  });

  return element;
}
