/** URL-only integration between independent websites.
 * Link metadata comes from the main portal's public read-only directory API.
 * A local fallback keeps this app usable if the portal is temporarily offline.
 * The existing #/... router continues to own navigation inside this website.
 */
(() => {
  "use strict";
  const config = window.SHN_INTEGRATION;
  const identity = config.app_id;

  /** Keep legacy shop links on AS Shop and industrial links on AS Industries. */
  function destination(site, route) {
    const path = route.split("?")[0];
    if (site === "as" && /^\/(shop|nixa)(\/|$)/.test(path)) return "shop";
    // Cart, account and receipt state belong to the website that created them.
    if (site === "shop" && path !== "/" && !/^\/(shop|nixa|partners|account|contact|consultation|about|cart|quotes|request-sent)(\/|$)/.test(path)) return "as";
    return site;
  }

  /** Preserve language and the section's own route when crossing websites. */
  function targetURL(site, route = "/") {
    const url = new URL(config.app_urls[site], location.origin);
    url.searchParams.set("lang", window.SITE_LANGUAGE || document.documentElement.lang || "en");
    if (site !== "panel") url.hash = route.startsWith("/") ? route : "/";
    return url.href;
  }

  function legacyTarget(raw) {
    let url;
    try { url = new URL(raw, document.baseURI); } catch { return null; }
    let target = /SHN-Connected\.html|Company-Main-Panel\.html/i.test(url.pathname) ? "panel"
      : /SHAHRNIAZ-Redesigned-v14\.html|Shahr-Niaz\.html/i.test(url.pathname) ? "shahrniaz"
      : /AS-Shop\.html/i.test(url.pathname) ? "shop"
      : /AS-Industries(?:-Offline-v8(?:%20| )?(?:\(1\))?)?\.html/i.test(url.pathname) ? "as" : null;
    if (!target) return null;
    let route = (url.hash || "#/").slice(1);
    if (target === "shahrniaz" && route === "/work") route = "/building";
    if (target === "shahrniaz" && route === "/partners/arvand") route = "/partners";
    return { site: destination(target, route), route };
  }

  /** Convert archive-era filenames and cross-section hashes to normal URLs. */
  function refreshLinks() {
    document.querySelectorAll("a[href]").forEach(link => {
      const original = link.dataset.shnOriginalHref || link.getAttribute("href");
      let target = legacyTarget(original);
      if (original.startsWith("#/")) {
        const route = original.slice(1);
        const site = destination(identity, route);
        if (site !== identity) target = { site, route };
      }
      if (!target) return;
      link.dataset.shnOriginalHref = original;
      const href = target.site === identity ? "#" + target.route : targetURL(target.site, target.route);
      if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    });
    const actions = document.querySelector(".header-actions,.header-controls");
    if (actions) {
      let link = document.getElementById("company-panel-link");
      if (!link) {
        link = document.createElement("a");
        link.id = "company-panel-link";
        link.className = "account-link";
        actions.prepend(link);
      }
      const href = targetURL("panel");
      if (link.href !== href) link.href = href;
      const label = window.SITE_LANGUAGE === "fa" ? "انتخاب بخش" : "Choose section";
      if (link.textContent !== label) link.textContent = label;
    }
  }

  /** Public helpers also let the portal build real anchor URLs. */
  window.SHN_NAVIGATION = { targetURL, destination, refreshLinks };
  refreshLinks();
  const observer = new MutationObserver(refreshLinks);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("change", event => {
    if (event.target.id === "site-language") refreshLinks();
  });
  function followRouteOwner() {
    const route = (location.hash || "#/").slice(1);
    const target = destination(identity, route);
    if (target !== identity) location.assign(targetURL(target, route));
  }
  window.addEventListener("hashchange", followRouteOwner);
  followRouteOwner();

  // Only public metadata is requested; cookies are never sent across sites.
  if (typeof fetch === "function") {
    fetch(config.directory_url, { credentials: "omit", mode: "cors", headers: { Accept: "application/json" } })
      .then(response => { if (!response.ok) throw new Error("Directory unavailable"); return response.json(); })
      .then(payload => {
        const directory = payload.message || payload;
        for (const entry of directory.applications || []) {
          if (!Object.hasOwn(config.app_urls, entry.id)) continue;
          const url = new URL(entry.url, location.origin);
          if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) config.app_urls[entry.id] = url.href;
        }
        if (directory.portal_url) {
          const url = new URL(directory.portal_url, location.origin);
          if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) config.app_urls.panel = url.href;
        }
        refreshLinks();
        document.dispatchEvent(new CustomEvent("shn:directory-ready"));
      })
      .catch(() => { /* Keep the independently configured fallback URLs. */ });
  }
})();
