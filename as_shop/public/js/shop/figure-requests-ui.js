/* AS Shop: Figure Requests UI bridge.
   Submits #ecoRequestForm to as_shop.figure_requests.submit_figure_request
   and lists the session user's requests on the account page. */
(() => {
  "use strict";

  const SUBMIT_URL = "/api/method/as_shop.figure_requests.submit_figure_request";
  const LIST_URL = "/api/method/as_shop.figure_requests.get_my_figure_requests";

  const getCookie = (name) => {
    const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : "";
  };
  const csrfToken = () =>
    (window.frappe && window.frappe.csrf_token) || getCookie("csrf_token") || "";

  async function frappePost(url, body) {
    const headers = { Accept: "application/json" };
    const csrf = csrfToken();
    if (csrf) headers["X-Frappe-CSRF-Token"] = csrf;
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers,
      body,
    });
    let payload = null;
    try { payload = await res.json(); } catch { /* non-JSON error body */ }
    if (!res.ok) {
      let msg = payload?.message || payload?.exception || "Request failed";
      try { msg = JSON.parse(msg)[0]?.message || msg; } catch { /* keep raw */ }
      throw new Error(String(msg));
    }
    return payload?.message ?? payload;
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === "class") node.className = String(v);
      else node.setAttribute(k, String(v));
    }
    node.append(...children);
    return node;
  }

  const th = (t) => el("th", { style: "text-align:left;padding:8px;border-bottom:1px solid #2a332e" }, [t]);
  const td = (t) => el("td", { style: "padding:8px;border-bottom:1px solid #202824" }, [String(t ?? "")]);

  function requestsTable(requests) {
    const rows = requests.map((r) =>
      el("tr", {}, [td(r.name), td(r.request_type), td(r.status), td(r.creation)]));
    return el("table", { style: "width:100%;border-collapse:collapse" }, [
      el("thead", {}, [el("tr", {}, [th("ID"), th("Type"), th("Status"), th("Created")])]),
      el("tbody", {}, rows),
    ]);
  }
  async function loadMyRequests(mount, statusEl) {
    statusEl.textContent = "Loading your requests…";
    try {
      const data = await frappePost(LIST_URL, new URLSearchParams());
      const requests = data?.requests || [];
      mount.replaceChildren(
        el("h3", { style: "margin:16px 0 8px" }, ["My Figure Requests"]),
        requests.length ? requestsTable(requests)
          : el("p", { class: "muted", style: "margin:8px 0" }, ["No requests yet."]),
      );
      statusEl.textContent = "";
    } catch (e) {
      statusEl.textContent = "Could not load your requests.";
      mount.replaceChildren(el("p", { class: "muted" }, [String(e.message || e)]));
    }
  }

  /* Account page: inject "My Figure Requests" card after #accountStatus. */
  function bindAccountRequests() {
    const status = document.querySelector("#accountStatus");
    if (!status || document.querySelector("#asShopMyRequests")) return;
    const mount = el("section", { id: "asShopMyRequests", class: "account-card", style: "margin-top:16px" });
    status.parentElement?.append(mount);
    loadMyRequests(mount, status);
  }

  /* Request page: prefill ?type= / ?design= from the hash query. */
  function applyQuery(form) {
    const q = (location.hash || "").indexOf("?");
    if (q === -1) return;
    const qs = new URLSearchParams(location.hash.slice(q + 1));
    const type = qs.get("type"), design = qs.get("design");
    if (type && form.elements.type) form.elements.type.value = type;
    if (design && form.elements.design) form.elements.design.value = design;
  }

  /* Request page: real submission with CSRF + reference image upload. */
  function bindRequestForm() {
    const form = document.querySelector("#ecoRequestForm");
    if (!form || form.dataset.asShopBound === "1") return;
    form.dataset.asShopBound = "1";

    const msg = document.querySelector("#ecoRequestMessage");
    const button = form.querySelector('button[type="submit"]');
    const fileInput = document.querySelector("#ecoReference");
    applyQuery(form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (msg) msg.textContent = "";
      if (button) button.disabled = true;
      try {
        const fd = new FormData();
        fd.append("type", form.elements.type?.value || "");
        fd.append("name", form.elements.name?.value || "");
        fd.append("contact", form.elements.contact?.value || "");
        fd.append("details", form.elements.details?.value || "");
        if (form.elements.design?.value) fd.append("design", form.elements.design.value);
        if (form.elements.size?.value) fd.append("size", form.elements.size.value);
        if (form.elements.quantity?.value) fd.append("quantity", form.elements.quantity.value);
        const file = fileInput?.files?.[0];
        if (file) fd.append("reference_image", file, file.name);

        const data = await frappePost(SUBMIT_URL, fd);
        if (msg) msg.textContent = String(data?.message || "Saved.");
        location.hash = "#/account";
      } catch (err) {
        if (msg) msg.textContent = String(err?.message || err);
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  const bindAll = () => { bindRequestForm(); bindAccountRequests(); };

  document.addEventListener("DOMContentLoaded", bindAll);
  window.addEventListener("hashchange", () => setTimeout(bindAll, 50));
  /* SPA re-renders may not fire hashchange; a light retry keeps bindings fresh. */
  setInterval(bindAll, 1000);
})();
