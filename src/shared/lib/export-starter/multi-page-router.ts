/**
 * Multi-page hash navigatsiyasi — bitta manba: preview (inline) va ZIP (`js/router.js`).
 */
export function buildMultiPageRouterScriptSource(defaultSlug: string): string {
  const slugLiteral = JSON.stringify(defaultSlug);
  return `/* Auto-generated static router — hash-based sections */
(function () {
  "use strict";
  var defaultSlug = ${slugLiteral};
  function show(slug) {
    var s = slug || defaultSlug;
    document.querySelectorAll(".mp-page").forEach(function (el) {
      el.classList.toggle("mp-page--active", el.getAttribute("data-page") === s);
    });
    document.querySelectorAll(".mp-nav-link").forEach(function (a) {
      a.classList.toggle("mp-nav-link--active", a.getAttribute("data-nav") === s);
    });
  }
  function fromHash() {
    var h = (location.hash || "").replace(/^#/, "").split("/")[0];
    show(h || defaultSlug);
  }
  window.addEventListener("hashchange", fromHash);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fromHash);
  } else {
    fromHash();
  }
})();
`;
}
