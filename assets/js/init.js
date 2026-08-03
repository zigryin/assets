(() => {
  "use strict";
  const A = "z", L = "zl", S = "script";
  const aS = (el) => {
    const s = document.createElement(S);
    for (const attr of el.attributes) {
      if (attr.name !== A && attr.name !== L) {
        s.setAttribute(attr.name, attr.value);
      }
    }
    s.text = el.text;
    el.replaceWith(s);
  };
  const pS = (l) => {
    const s = l ? `script[${A}][${L}]` : `script[${A}]:not([${L}])`;
    document.querySelectorAll(s).forEach(aS);
  };
  // Run initial scripts as soon as DOM is interactive
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => pS(false));
  } else {
    pS(false);
  }
  // Defer lazy scripts & Service Worker registration to load event
  window.addEventListener("load", () => {
    pS(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  });
  window.ZZ = {
    run: () => pS(false),
    lazy: () => pS(true)
  };
})();