// import resetStyle from "./common-styles/reset.string.css";
// import variablesStyle from "./common-styles/variables.string.css";
// import buttonStyle from "./common-styles/button.string.css";

// Helper functions to abstract creation of shadow component
export class ShadowDOM {
  static createHostAndMount = async (name: string, styles: string[], shadowRootinit: Omit<ShadowRootInit, "mode"> = {}) => {
    if (window.top !== window.self) return;

    if (document.readyState === "loading") {
      await new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", () => resolve(true));
      });
    }

    // in content script we cannot define custom elements, `customElements.define()` will crash
    // a work around is to create `div` and only change the tagName like below
    const element = document.createElement(name, { is: "div" });
    element.attachShadow({ ...shadowRootinit, mode: "open" });

    const stylesheet = new CSSStyleSheet();
    // const defaultStyles = [resetStyle, variablesStyle, buttonStyle];
    const elementStyles = styles;
    const styleAsString = [...elementStyles].join("\n");
    stylesheet.replaceSync(styleAsString);

    if (!element.shadowRoot) {
      console.error("Shadow root attachment failed");
      return;
    }

    element.classList.add("dark");

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1827104
    const style = document.createElement("style");
    style.textContent = styleAsString;
    element.shadowRoot.appendChild(style);

    document.body.appendChild(element);

    // cast type so that shadowRoot is always defined at this stage
    return element as HTMLElement & { shadowRoot: ShadowRoot };
  };

  // return host of shadow root from any element
  static getHostFromElement = (el: EventTarget | HTMLElement) => {
    if (el instanceof HTMLElement) {
      const root = el.getRootNode();
      if ("host" in root && root.host instanceof HTMLElement) {
        return root.host;
      }
    }
  };
}
