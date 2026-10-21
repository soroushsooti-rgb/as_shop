(function () {
  "use strict";

  window.__AS_SHOP_FORM_STATE__ = window.__AS_SHOP_FORM_STATE__ || {
    type: "", design: "", name: "", contact: "", size: "Not sure yet",
    quantity: "1", details: "", file: null,
    filePreviewUrl: "", fileName: ""
  };
  const state = window.__AS_SHOP_FORM_STATE__;

  function sharedAccount(action, formData, onPending) {
    const accountURL = new URL(window.SHN_INTEGRATION.app_urls.as, location.origin);
    const id = crypto.randomUUID();
    // A top-level account window retains its own SameSite session across independent hosts.
    const accountWindow = window.open(new URL("/as-figure-bridge", accountURL).href,
      "as-figure-account", "width=520,height=400");
    if (!accountWindow) return Promise.reject(new Error("Allow the account window, then send the form again. Your form and photo are kept."));
    return new Promise((resolve, reject) => {
      let sent = false;
      const cleanup = () => { clearTimeout(timer); clearInterval(closedTimer); window.removeEventListener("message", receive); };
      const receive = event => {
        if (event.origin !== accountURL.origin || event.source !== accountWindow) return;
        if (event.data?.kind === "as-figure-ready" && !sent) {
          sent = true;
          // Transfer image bytes, rather than a filesystem-backed File between origins.
          Promise.all([...formData.entries()].map(async ([key,value]) =>
            [key, value instanceof File ? {filename:value.name,mime:value.type,bytes:await value.arrayBuffer()} : value]
          )).then(fields => accountWindow.postMessage({kind:"as-figure-request",id,action,fields},accountURL.origin))
            .catch(error => { cleanup(); accountWindow.close(); reject(error); });
        }
        if (event.data?.kind === "as-figure-pending" && event.data.id === id) onPending?.(event.data.message);
        if (event.data?.kind !== "as-figure-result" || event.data.id !== id) return;
        cleanup();
        if (event.data.error) reject(new Error(event.data.error));
        else { accountWindow.close(); resolve(event.data.result); }
      };
      const timer = setTimeout(() => { cleanup(); accountWindow.close(); reject(new Error("Account connection timed out. Your form and photo are kept; please retry.")); },300000);
      const closedTimer = setInterval(() => {
        if (accountWindow.closed) { cleanup(); reject(new Error("Account window closed. Your form and photo are kept; send again to retry.")); }
      },500);
      window.addEventListener("message",receive);
    });
  }

  function getQueryParam(key) {
    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");
    if (qIndex === -1) return null;
    return new URLSearchParams(hash.substring(qIndex)).get(key);
  }

  function captureFormState(form) {
    if (!form) return;
    const typeEl = form.querySelector('input[name="ecoType"]:checked');
    state.type = typeEl?.value || form.querySelector('[name="type"]')?.value || state.type || getQueryParam("type") || "";
    state.fields = {};
    for (const el of form.elements) {
      if (!el.name || el.type === "file" || ["submit", "button"].includes(el.type)) continue;
      state.fields[el.name] = ["checkbox", "radio"].includes(el.type) ? el.checked : el.value;
    }
    state.design = form.querySelector("#ecoDesign")?.value ?? state.design ?? "";
    state.name = form.querySelector("#ecoName")?.value || "";
    state.contact = form.querySelector("#ecoContact")?.value || "";
    state.size = form.querySelector("#ecoSize")?.value || "Not sure yet";
    state.quantity = form.querySelector("#ecoQuantity")?.value || "1";
    state.details = form.querySelector("#ecoDetails")?.value || "";
  }

  function restoreFormState(form) {
    if (!form) return;
    for (const el of form.elements) {
      if (!el.name || !state.fields || !(el.name in state.fields)) continue;
      if (["checkbox", "radio"].includes(el.type)) el.checked = state.fields[el.name];
      else if (el.type !== "file") el.value = state.fields[el.name];
    }
    const type = form.querySelector('[name="type"]');
    if (type && state.type) type.value = state.type;
    const fileInput = form.querySelector("#ecoReference");
    if (state.file && fileInput && !fileInput.files?.length) {
      const transfer = new DataTransfer();
      transfer.items.add(state.file);
      fileInput.files = transfer.files;
    }
    if (state.type) {
      const typeEl = form.querySelector(`input[name="ecoType"][value="${CSS.escape(state.type)}"]`);
      if (typeEl) typeEl.checked = true;
    }
    const values = {
      ecoDesign: state.design, ecoName: state.name, ecoContact: state.contact,
      ecoSize: state.size, ecoQuantity: state.quantity, ecoDetails: state.details
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = form.querySelector(`#${id}`);
      if (el && value !== undefined) el.value = value;
    });
  }

  function initForm() {
    let form = document.querySelector("#ecoRequestForm");
    if (!form || form.dataset.asShopBound === "1") return;
    // Remove offline preview handlers before owning file and submit events.
    const clean = form.cloneNode(true);
    form.replaceWith(clean);
    form = clean;
    form.dataset.asShopBound = "1";

    const ids = {name:"ecoName",contact:"ecoContact",design:"ecoDesign",size:"ecoSize",
      quantity:"ecoQuantity",details:"ecoDetails"};
    for (const [name,id] of Object.entries(ids)) {
      const field = form.querySelector('[name="' + name + '"]');
      if (field && !field.id) field.id = id;
    }
    const upload = form.querySelector("#ecoReference");
    if (upload) upload.accept = "image/jpeg,image/png,image/webp";
    const details = form.querySelector("#ecoDetails");
    if (details) details.required = true;
    form.querySelectorAll("p.micro").forEach(p => {
      if (/offline|local preview|does not submit|stays on this device/i.test(p.textContent)) p.remove();
    });
    const send = form.querySelector('[type="submit"]');
    if (send) send.textContent = document.documentElement.lang === "fa" ? "ارسال درخواست" : "Send request";
    const status = document.createElement("p");
    status.dataset.figureStatus = "1";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.append(status);
    const typeParam = getQueryParam("type");
    if (typeParam && !state.type) state.type = typeParam;
    const designParam = getQueryParam("design");
    if (designParam && !state.design) state.design = designParam;
    restoreFormState(form);

    if (state.filePreviewUrl) {
      const p = form.querySelector("#ecoReferencePreview") || document.querySelector("#ecoReferencePreview");
      if (p) { p.src = state.filePreviewUrl; p.hidden = false; }
    }
    if (state.fileName) {
      const n = form.querySelector("#ecoFileNote") || document.querySelector("#ecoFileNote");
      if (n) n.textContent = `Attached: ${state.fileName}`;
    }
    form.addEventListener("input", (event) => { if (event.target.type !== "file") captureFormState(form); }, true);

    form.addEventListener("change", (e) => {
      captureFormState(form);
      const el = e.target;
      if (el.id === "ecoReference") {
        el.setCustomValidity("");
        e.stopImmediatePropagation();
        const file = el.files && el.files[0];
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
          el.value = "";
          el.setCustomValidity("Choose a JPEG, PNG or WebP image up to 5 MB.");
          el.reportValidity();
          return;
        }
        el.setCustomValidity("");
        state.file = file;
        state.fileName = file.name;
        if (state.filePreviewUrl) URL.revokeObjectURL(state.filePreviewUrl);
        state.filePreviewUrl = URL.createObjectURL(file);

        const p = form.querySelector("#ecoReferencePreview") || document.querySelector("#ecoReferencePreview");
        const n = form.querySelector("#ecoFileNote") || document.querySelector("#ecoFileNote");
        if (p) { p.src = state.filePreviewUrl; p.hidden = false; }
        if (n) n.textContent = `Attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        const stage = document.querySelector("#ecoLivePhoto");
        if (stage) {
          const image = document.createElement("img");
          image.src = state.filePreviewUrl;
          image.alt = "Your reference photo";
          stage.replaceChildren(image);
        }
        setTimeout(() => restoreFormState(document.querySelector("#ecoRequestForm")), 0);
        setTimeout(() => restoreFormState(document.querySelector("#ecoRequestForm")), 100);
      }
    }, true);
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (form.dataset.submitting === "1") return;
      captureFormState(form);
      if (!form.reportValidity()) return;
      form.dataset.submitting = "1";

      const btn = form.querySelector('button[type="submit"]');
      const origText = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Submitting..."; }

      status.textContent = "Submitting your request…";
      try {
        const typeEl = form.querySelector('input[name="ecoType"]:checked');
        const reqType = typeEl?.value || form.querySelector('[name="type"]')?.value || getQueryParam("type") || "pet";
        const activeFile = state.file || (form.querySelector("#ecoReference")?.files?.[0]);

        const fd = new FormData();
        fd.append("type", reqType);
        fd.append("design", (form.querySelector("#ecoDesign")?.value || getQueryParam("design") || "").trim());
        fd.append("name", (form.querySelector("#ecoName")?.value || state.name || "").trim());
        fd.append("contact", (form.querySelector("#ecoContact")?.value || state.contact || "").trim());
        fd.append("size", (form.querySelector("#ecoSize")?.value || state.size || "Not sure yet").trim());
        fd.append("quantity", parseInt(form.querySelector("#ecoQuantity")?.value || state.quantity || "1", 10));
        const extra = [...form.elements].filter(el => ["breed","petName"].includes(el.name) && el.value)
          .map(el => el.name + ": " + el.value);
        fd.append("details", [...extra, (form.querySelector("#ecoDetails")?.value || state.details || "").trim()].join("\n"));
        fd.append("source_page", window.location.hash || "shop-request-form");
        if (activeFile) fd.append("reference_image", activeFile, activeFile.name);
        const result = await sharedAccount("submit", fd, message => { status.textContent = message; });
        if (!result?.ok || !result.name) throw new Error("The server did not confirm a saved request. Your form and photo are kept.");
        status.textContent = (document.documentElement.lang === "fa" ? "درخواست ثبت شد. شماره پیگیری: " : "Request saved. Reference: ") + result.name + " ";
        const orders = new URL(window.SHN_INTEGRATION.app_urls.as, location.origin);
        orders.searchParams.set("lang", document.documentElement.lang || "en");
        orders.hash = "/orders?figure=" + encodeURIComponent(result.name);
        const link = document.createElement("a");
        link.href = orders.href;
        link.className = "button primary";
        link.textContent = document.documentElement.lang === "fa" ? "مشاهده در سفارش‌های من" : "View in My Orders";
        status.append(link);
        state.fields = {}; state.type = ""; state.design = ""; state.name = ""; state.contact = "";
        state.size = "Not sure yet"; state.quantity = "1"; state.details = ""; state.file = null;
        if (state.filePreviewUrl) URL.revokeObjectURL(state.filePreviewUrl);
        state.filePreviewUrl = ""; state.fileName = "";
        form.reset();
        const preview = form.querySelector("#ecoReferencePreview");
        if (preview) { preview.removeAttribute("src"); preview.hidden = true; }
        const note = form.querySelector("#ecoFileNote");
        if (note) note.textContent = "";
        document.querySelector("#ecoLivePhoto img")?.remove();
      } catch (err) {
        console.error("Submission failed:", err);
        status.textContent = err.message || "An error occurred while submitting. Your form and photo are kept.";
      } finally {
        delete form.dataset.submitting;
        if (btn) { btn.disabled = false; btn.textContent = origText; }
      }
    }, true);
  }

  function handleRoute() {
    if ((window.location.hash || "").startsWith("#/shop/request")) {
      setTimeout(initForm, 100);
      setTimeout(initForm, 400);
    }

  }

  window.addEventListener("hashchange", handleRoute);
  new MutationObserver(() => {
    const f = document.querySelector("#ecoRequestForm");
    if (f && f.dataset.asShopBound !== "1") initForm();

  }).observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleRoute);
  } else {
    handleRoute();
  }
})();
