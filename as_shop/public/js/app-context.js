/** Independent page context. No parent window or iframe state is used.
 * Frappe supplies public deployment URLs in a JSON node. Static previews use
 * the app's own defaults, embedded by its build script before this file.
 */
(() => {
  "use strict";
  const node = document.getElementById("shn-integration-config");
  const supplied = node ? JSON.parse(node.textContent) : null;
  window.SHN_INTEGRATION = supplied || window.SHN_DEFAULT_INTEGRATION;
  const query = new URLSearchParams(location.search);
  window.CONNECTED_SITE = window.SHN_INTEGRATION.app_id;
  window.AS_SITE = window.CONNECTED_SITE;
  window.CONNECTED_HASH = location.hash || "#/";
  window.CONNECTED_LANGUAGE = query.get("lang") === "fa" ? "fa" : "en";
})();
