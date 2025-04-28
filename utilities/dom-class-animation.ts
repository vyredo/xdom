import { sleep } from "./sleep";

export function showAnimation(elem: HTMLElement, delay = 100) {
  // css animation only work if the element is ready then we add class `show`
  // delay until element is ready
  setTimeout(() => {
    if (elem.classList.contains("hide") || !elem.classList.contains("show")) {
      elem.classList.remove("hide");
      elem.classList.add("show");
    }
  }, delay);
}

export async function hideAnimation(elem: HTMLElement, time: number) {
  elem?.classList.add("hide");
  elem?.classList.remove("show");

  await sleep(time);
  elem?.classList.remove("hide");
}
