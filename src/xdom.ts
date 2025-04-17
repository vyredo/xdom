import { Signal } from "./signal";
import { SignalToElement } from "./signal-to-element";
import { HTMLElementTagMap } from "./types";
export type HTMLElementEventHandlerKeys = Extract<keyof HTMLElement, `on${string}`>;

// Enable typescript to detect event-based attributes and suggest the correct type
// i.e., div({ onclick: value }). Value will be type-checked as (e: MouseEvent) => void
export type ElementEventHandlers = {
  [K in keyof GlobalEventHandlersEventMap as `on${K}`]?: (this: Element, ev: GlobalEventHandlersEventMap[K]) => any;
};

export type CreateElementDetails<T extends keyof HTMLElementTagMap> = Partial<HTMLElementTagMap[T]> & ElementEventHandlers;

export type CreateElementChildren<T extends keyof HTMLElementTagMap> =
  | HTMLElementTagMap[T]
  | string
  | Signal
  | false
  | undefined
  | (HTMLElementTagMap[T] | false | undefined | string | Signal)[];

export interface XDOMOverload<T extends keyof HTMLElementTagMap> {
  (children?: CreateElementChildren<T>): HTMLElementTagMap[T];
  (details?: CreateElementDetails<T>, children?: CreateElementChildren<T>): HTMLElementTagMap[T];
}

export function createDomElement<T extends keyof HTMLElementTagMap>(tagName: T, children?: CreateElementChildren<T>): HTMLElementTagMap[T];

export function createDomElement<T extends keyof HTMLElementTagMap>(tagName: T, details?: CreateElementDetails<T>, children?: CreateElementChildren<T>): HTMLElementTagMap[T];
export function createDomElement<T extends keyof HTMLElementTagMap>(
  tagName: T,
  details?: CreateElementDetails<T> | CreateElementChildren<T>,
  children?: CreateElementChildren<T>
): HTMLElementTagMap[T] {
  const element = document.createElement(tagName) as HTMLElementTagMap[T];

  if (!details) {
    return element;
  }

  if (Array.isArray(details)) {
    details.forEach((el) => {
      if (typeof el === "string") {
        element.appendChild(document.createTextNode(el));
      } else if (el instanceof Signal) {
        SignalToElement.renderAndSubscribe(element, el);
      } else if (el === false || el == null) {
        return;
      } else {
        element.appendChild(el);
      }
    });
    return element;
  } else if (typeof details === "string") {
    element.innerHTML = details;
  } else if (details instanceof Signal) {
    SignalToElement.renderAndSubscribe(element, details);
  } else if (details instanceof HTMLElement) {
    element.appendChild(details);
  } else {
    if (details.className) {
      element.className = details.className;
    }

    if (details.style) {
      Object.assign(element.style, details.style);
    }

    Object.entries(details).forEach(([KEY, value]) => {
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
  }

  if (children) {
    if (Array.isArray(children)) {
      children.forEach((el) => {
        if (typeof el === "string") {
          element.appendChild(document.createTextNode(el));
        } else if (el instanceof Signal) {
          SignalToElement.renderAndSubscribe(element, el);
        } else if (el === false || el == null) {
          return;
        } else {
          element.appendChild(el);
        }
      });
    } else if (typeof children === "string") {
      element.innerHTML = children;
    } else if (children instanceof Signal) {
      SignalToElement.renderAndSubscribe(element, children);
    } else {
      element.appendChild(children);
    }
  }

  return element;
}

export const createDomElementArgumentHandler =
  <T extends keyof HTMLElementTagMap>(s: T): XDOMOverload<T> =>
  (detailsOrChildren?: CreateElementDetails<T> | CreateElementChildren<T>, children?: CreateElementChildren<T>): HTMLElementTagMap[T] => {
    if (!detailsOrChildren) {
      return createDomElement(s);
    }

    if (typeof detailsOrChildren === "string") {
      return createDomElement(s, detailsOrChildren);
    }

    if (Array.isArray(detailsOrChildren) || detailsOrChildren instanceof Element || detailsOrChildren instanceof Signal) {
      return createDomElement(s, detailsOrChildren);
    }

    return createDomElement(s, detailsOrChildren, children);
  };
