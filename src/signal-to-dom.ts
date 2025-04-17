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
export function SignalsToDoms<X extends Record<string, unknown> & { "data-key"?: string }>(newSignal: Signal<X[]>) {
  const handleMapFn = (cb: (item: Signal<X>, idx: number, arr: X[]) => HTMLElement & { "data-key"?: string }) => {
    const newChildrenIds: string[] = [];
    const arrayOfElements = newSignal.value.map((objOrSignal, idx) => {
      const sig = objOrSignal instanceof Signal ? objOrSignal : signal(objOrSignal);
      const item = cb(sig, idx, newSignal.value);

      if (!item || !(item instanceof Element)) {
        throw new Error(`found non HTMLElement ${item}`);
      }

      let dataKey =
        item.getAttribute("data-key") ?? // use old data-key
        getDataKey(objOrSignal) ?? // or use data-key that is passed in signal
        item["data-key"]; // or property data-key
      if (!dataKey) {
        console.warn(`Warning: find a list of item that has no data-key, please include data-key to avoid rerending this item:  ${item}`);
      }
      dataKey = dataKey ?? RNG(10);

      item.setAttribute("data-key", dataKey);
      newChildrenIds.push(dataKey);
      return item;
    });

    //TODO: if newChildren.length < oldChildren this indicate that user has delete 1 of item
    //      right now, to remove it from DOMTree, developer must manually run element.remove()
    //      we might be able to detect the difference and run `element.remove()` in this function

    return arrayOfElements;
  };

  return {
    map: handleMapFn,
  };
}
