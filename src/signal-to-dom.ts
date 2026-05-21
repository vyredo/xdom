import { signal, Signal } from "./signal";
import { RNG } from "./utilities";

const getDataKey = (i: unknown | Signal<unknown>) => {
  if (i instanceof Signal) return i.value["data-key"];
  if (i instanceof Element) return i.getAttribute("data-key");
  return i instanceof Object && i && "data-key" in i && i["data-key"];
};

/**
 * XList - a minimal keyed function
 * @param newSignals Signal or Signal[], each signal must at least have property id
 *
 * Helper to apply keyed to each item, similar to array in React where
 * element need property key, notice the key below
 * ['abc','def'].map(str => <div key={str}>{str}</div>)
 */
const unwrappedSignalCache = new WeakMap<object, Signal<any>>();

function toSignal<T>(value: T): Signal<T> {
  if (value instanceof Signal) return value;
  if (typeof value === "object" && value !== null) {
    const cached = unwrappedSignalCache.get(value);
    if (cached) return cached;
    const sig = signal(value);
    unwrappedSignalCache.set(value, sig);
    return sig;
  }
  return signal(value);
}

export function SignalsToDoms<X extends Record<string, unknown> & { "data-key"?: string }>(newSignal: Signal<X[]>) {
  const handleMapFn = (cb: (item: Signal<X>, idx: number, arr: X[]) => HTMLElement & { "data-key"?: string }) => {
    const newChildrenIds: string[] = [];
    const arrayOfElements = newSignal.value.map((objOrSignal, idx) => {
      const sig = toSignal(objOrSignal);
      const item = cb(sig, idx, newSignal.value);

      if (!item || !(item instanceof Element)) {
        throw new Error(`found non HTMLElement ${item}`);
      }

      const dataKey =
        item.getAttribute("data-key") ??
        getDataKey(objOrSignal) ??
        item["data-key"] ??
        RNG(10);

      item.setAttribute("data-key", String(dataKey));
      newChildrenIds.push(dataKey);
      return item;
    });

    return arrayOfElements;
  };

  return {
    map: handleMapFn,
  };
}
