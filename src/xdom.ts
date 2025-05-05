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
export type CreateElementChildren<T extends keyof HTMLElementTagMap> = undefined | Array<CustomHTMLElement<T> | false | undefined | string | Signal>;

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
      } else if (el === false || el == null) {
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
    // These key have to be directly assigned to element instead of element.setAttribute
    // element['textContent'] = value;
    // instead of
    // element.setAttribute('textContent', value)
    const propertyKeys: string[] = [
      // Text and content properties
      "textContent",
      "innerText",
      "innerHTML",
      "outerHTML",

      // Form element properties
      "value",
      "checked",
      "selected",
      "disabled",
      "readOnly",
      "maxLength",
      "selectedIndex",

      // Style properties
      "className",
      "classList",

      // Media and link properties
      "src",
      "href",
      "alt",

      // Special properties
      "htmlFor",
      "tabIndex",
      "scrollTop",
      "scrollLeft",

      // Additional form properties
      "min",
      "max",
      "step",
      "defaultValue",
      "defaultChecked",

      // Select element properties
      "options",
      "multiple",
      "size",

      // Table properties
      "rows",
      "cells",
      "rowSpan",
      "colSpan",

      // Hidden state properties
      "hidden",
    ];

    if (propertyKeys.includes(KEY)) {
      element[KEY] = value;
      return;
    }

    // Almost all attribute keys are lowercase, like maxlength, gradientunits, etc.
    const key = KEY.toLowerCase();
    const isEventHandlerProperty = (el: HTMLElement, p: string): p is keyof Omit<GlobalEventHandlers, "addEventListener" | "removeEventListener"> => {
      return typeof p === "string" && p.startsWith("on") && p in el;
    };

    // Handle onclick, onmouseover, onload, etc.
    if (isEventHandlerProperty(element, key) && typeof value === "function") {
      // Typescript strictly controls what events can be assigned to which
      // elements, which is probably a good thing for being thorough, but
      // in reality you can call 'addEventListener' with any string, and
      // and handler type, as the construction of custom events is allowed.
      //
      // In our case, we're not actually using more than the basics, onclick,
      // onkeydown, onfocus etc.. which are applicable almost anywhere.
      //
      // The reason why we don't want to write the correct verification code
      // is that the amount of variants that typescript has to parse blows
      // up the memory in V8 and crashes the process. So at this stage we
      // will just rely on typechecking from the caller and allow it through
      // at this point. If it ever becomes an issue for some reason, we can
      // revisit later. Ideally we would list out each event properly rather
      // than trying to get typescript to infer everything correctly. This would
      // be many lines of repetitive code but it would preserve typechecking
      // and stop the VM from blowing up
      //
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element[key] = value as (...args: any[]) => any;
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
