/**
 * AS Shop - Figure Requests Client Integration
 * Part 1: State Store & Field Restoration
 */

(function () {
  "use strict";

  window.__AS_SHOP_FORM_STATE__ = window.__AS_SHOP_FORM_STATE__ || {
    name: "",
    contact: "",
    size: "Not sure yet",
    quantity: "1",
    details: "",
    file: null,
    fileDataUrl: "",
    fileName: ""
  };

  const state = window.__AS_SHOP_FORM_STATE__;

  function getCsrfToken() {
    if (window.frappe && window.frappe.csrf_token && window.frappe.csrf_token !== "{{ csrf_token }}") {
      return window.frappe.csrf_token;
    }
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrf_token="));
    return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
  }

  function getQueryParam(key) {
    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");
    if (qIndex === -1) return null;
    const params = new URLSearchParams(hash.substring(qIndex));
    return params.get(key);
  }

  function applyPresetParams() {
    const form = document.querySelector("#ecoRequestForm");
    if (!form) return;

    const typeParam = getQueryParam("type");
    const designParam = getQueryParam("design");

    if (typeParam) {
      const typeRadio = form.querySelector(`input[name="ecoType"][value="${typeParam}"]`);
      if (typeRadio && !typeRadio.checked) {
        typeRadio.checked = true;
        typeRadio.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    if (designParam) {
      const designInput = form.querySelector("#ecoDesign");
      if (designInput && !designInput.value) {
        designInput.value = designParam;
      }
    }
  }

  function restoreFormState(form) {
    if (!form) return;
    const nameInput = form.querySelector("#ecoName");
    const contactInput = form.querySelector("#ecoContact");
    const sizeInput = form.querySelector("#ecoSize");
    const qtyInput = form.querySelector("#ecoQuantity");
    const detailsInput = form.querySelector("#ecoDetails");
    const preview = form.querySelector("#ecoReferencePreview") || document.querySelector("#ecoReferencePreview");
    const note = form.querySelector("#ecoFileNote") || document.querySelector("#ecoFileNote");

    if (nameInput && state.name && !nameInput.value) nameInput.value = state.name;
    if (contactInput && state.contact && !contactInput.value) contactInput.value = state.contact;
    if (sizeInput && state.size && sizeInput.value !== state.size) sizeInput.value = state.size;
    if (qtyInput && state.quantity && (!qtyInput.value || qtyInput.value === "1")) qtyInput.value = state.quantity;
    if (detailsInput && state.details && !detailsInput.value) detailsInput.value = state.details;

    if (preview && state.fileDataUrl) {
      preview.src = state.fileDataUrl;
      preview.hidden = false;
    }
    if (note && state.fileName) {
      note.textContent = `Attached: ${state.fileName}`;
    }
  }
  function initForm() {
    const form = document.querySelector("#ecoRequestForm");
    if (!form || form.dataset.asShopInit === "1") return;
    form.dataset.asShopInit = "1";

    applyPresetParams();
    restoreFormState(form);

    const inputs = form.querySelectorAll("input, textarea, select");
    inputs.forEach((inp) => {
      inp.addEventListener("input", () => {
        if (inp.id === "ecoName") state.name = inp.value;
        if (inp.id === "ecoContact") state.contact = inp.value;
        if (inp.id === "ecoSize") state.size = inp.value;
        if (inp.id === "ecoQuantity") state.quantity = inp.value;
        if (inp.id === "ecoDetails") state.details = inp.value;
      });
      inp.addEventListener("change", () => {
        if (inp.id === "ecoName") state.name = inp.value;
        if (inp.id === "ecoContact") state.contact = inp.value;
        if (inp.id === "ecoSize") state.size = inp.value;
        if (inp.id === "ecoQuantity") state.quantity = inp.value;
        if (inp.id === "ecoDetails") state.details = inp.value;
      });
    });

    const fileInput = document.querySelector("#ecoReference");
    if (fileInput && !fileInput.dataset.asShopBound) {
      fileInput.dataset.asShopBound = "1";
      fileInput.addEventListener(
        "change",
        function () {
          const file = fileInput.files && fileInput.files[0];
          if (!file) return;

          state.file = file;
          state.fileName = file.name;

          const preview = document.querySelector("#ecoReferencePreview");
          const note = document.querySelector("#ecoFileNote");

          const reader = new FileReader();
          reader.onload = function (evt) {
            state.fileDataUrl = evt.target.result;
            if (preview) {
              preview.src = state.fileDataUrl;
              preview.hidden = false;
            }
          };
          reader.readAsDataURL(file);

          if (note) {
            const kb = (file.size / 1024).toFixed(1);
            note.textContent = `Attached: ${file.name} (${kb} KB)`;
          }

          setTimeout(() => {
            const freshForm = document.querySelector("#ecoRequestForm");
            restoreFormState(freshForm);
          }, 30);
          setTimeout(() => {
            const freshForm = document.querySelector("#ecoRequestForm");
            restoreFormState(freshForm);
          }, 150);
        },
        true
      );
    }
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Submitting...";
      }

      try {
        const typeEl = form.querySelector('input[name="ecoType"]:checked');
        const reqType = typeEl ? typeEl.value : (getQueryParam("type") || "pet");
        const designVal = (form.querySelector("#ecoDesign")?.value || getQueryParam("design") || "").trim();
        const nameVal = (form.querySelector("#ecoName")?.value || state.name || "").trim();
        const contactVal = (form.querySelector("#ecoContact")?.value || state.contact || "").trim();
        const sizeVal = (form.querySelector("#ecoSize")?.value || state.size || "Not sure yet").trim();
        const qtyVal = parseInt(form.querySelector("#ecoQuantity")?.value || state.quantity || "1", 10);
        const detailsVal = (form.querySelector("#ecoDetails")?.value || state.details || "").trim();

        const fileInputEl = document.querySelector("#ecoReference");
        const activeFile = (fileInputEl && fileInputEl.files && fileInputEl.files[0]) || state.file;

        const fd = new FormData();
        fd.append("type", reqType);
        fd.append("design", designVal);
        fd.append("name", nameVal);
        fd.append("contact", contactVal);
        fd.append("size", sizeVal);
        fd.append("quantity", qtyVal);
        fd.append("details", detailsVal);
        fd.append("source_page", window.location.hash || "shop-request-form");

        if (activeFile) {
          fd.append("reference_image", activeFile, activeFile.name);
        }

        const headers = {};
        const csrf = getCsrfToken();
        if (csrf) headers["X-Frappe-CSRF-Token"] = csrf;

        const res = await fetch("/api/method/as_shop.figure_requests.submit_figure_request", {
          method: "POST",
          headers: headers,
          body: fd,
        });

        const data = await res.json();

        if (res.ok && data.message && data.message.ok) {
          const reqName = data.message.name;
          alert(`Success! Your request (${reqName}) has been submitted.`);
          state.name = "";
          state.contact = "";
          state.details = "";
          state.file = null;
          state.fileDataUrl = "";
          state.fileName = "";
          form.reset();
          window.location.hash = "#/account";
        } else {
          const err = (data._server_messages && JSON.parse(data._server_messages)[0]) || data.message || "Failed to submit";
          const msg = typeof err === "object" ? err.message : err;
          alert(`Error: ${msg || "Submission failed"}`);
        }
      } catch (err) {
        console.error("Submission failed:", err);
        alert("An error occurred while submitting. Please try again.");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }
    });
  }
  async function loadMyRequests() {
    const container = document.querySelector("#asShopMyRequests");
    if (!container) return;

    container.innerHTML = '<p class="micro">Loading your figure requests...</p>';

    try {
      const res = await fetch("/api/method/as_shop.figure_requests.get_my_figure_requests");
      const data = await res.json();
      const list = (data.message && data.message.requests) || [];

      if (!list.length) {
        container.innerHTML = '<p class="micro">No figure requests submitted yet.</p>';
        return;
      }

      let html = '<div class="as-shop-requests-table" style="overflow-x:auto; margin-top:1rem;">';
      html += '<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">';
      html += '<thead><tr style="border-bottom:1px solid #ccc; text-align:left;">';
      html += '<th style="padding:8px;">ID</th><th style="padding:8px;">Type</th><th style="padding:8px;">Status</th><th style="padding:8px;">Size</th><th style="padding:8px;">Date</th>';
      html += '</tr></thead><tbody>';

      list.forEach((r) => {
        const dateStr = r.creation ? r.creation.split(" ")[0] : "";
        html += `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px; font-weight:bold;">${r.name}</td>
          <td style="padding:8px; text-transform:capitalize;">${r.request_type}</td>
          <td style="padding:8px;"><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
          <td style="padding:8px;">${r.preferred_size || "-"}</td>
          <td style="padding:8px;">${dateStr}</td>
        </tr>`;
      });

      html += '</tbody></table></div>';
      container.innerHTML = html;
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p class="micro" style="color:red;">Error loading requests.</p>';
    }
  }

  function handleRoute() {
    const hash = window.location.hash || "";
    if (hash.startsWith("#/shop/request")) {
      setTimeout(initForm, 60);
      setTimeout(initForm, 300);
    } else if (hash.startsWith("#/account")) {
      setTimeout(loadMyRequests, 100);
    }
  }

  window.addEventListener("hashchange", handleRoute);

  const observer = new MutationObserver(() => {
    const form = document.querySelector("#ecoRequestForm");
    if (form && form.dataset.asShopInit !== "1") {
      initForm();
    } else if (form) {
      restoreFormState(form);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleRoute);
  } else {
    handleRoute();
  }
})();
