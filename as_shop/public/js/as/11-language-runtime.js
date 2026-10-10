/* مسئولیت این فایل: اعمال ترجمه روی متن‌ها و حفظ مقدار فیلدها هنگام تغییر زبان. */
/**
 * SHN / as / language-runtime
 * Extracted from the original inline script #11.
 * Load order is defined by pages/index.html. See docs/CODE_MAP.fa.md.
 */
(function () {
  "use strict";
  const originals = new WeakMap(),
    originalAttrs = new WeakMap();
  let running = false;
  const compact = (s) => s.replace(/\s+/g, " ").trim();
  const dict = window.SITE_FA;
  const lookup = (s) => {
    const k = compact(s);
    return dict[k] || dict[s] || null;
  };
  /** translateText: language-runtime feature. Keep related handlers in this module. */
  function translateText(s) {
    const v = lookup(s);
    if (v) return s.match(/^\s*/)[0] + v + s.match(/\s*$/)[0];
    let m;
    if ((m = s.match(/^Complete (.+) 3D printed keychain$/)))
      return "جاکلیدی کامل " + (dict[m[1]] || m[1]);
    if ((m = s.match(/^(\d+) of (\d+): (.+)$/)))
      return m[1] + " از " + m[2] + ": " + (dict[m[3]] || m[3]);
    if ((m = s.match(/^Show (.+)$/))) return "نمایش " + (dict[m[1]] || m[1]);
    if ((m = s.match(/^Basket, (\d+) keychains$/))) return "سبد، " + m[1] + " جاکلیدی";
    if ((m = s.match(/^(.+) added$/))) return (dict[m[1]] || m[1]) + " به سبد اضافه شد";
    if ((m = s.match(/^(\d+) pieces? · (.+)$/)))
      return m[1] + " عدد · " + m[2].replace("Toman", "تومان");
    if ((m = s.match(/^(\d+) designs$/))) return m[1] + " طرح";
    if ((m = s.match(/^Your basket: (\d+) pieces ↗$/))) return "سبد شما: " + m[1] + " عدد ↗";
    if ((m = s.match(/^(\d+) keychains? selected$/))) return m[1] + " جاکلیدی انتخاب‌شده";
    if ((m = s.match(/^(\d+) keychains, any combination$/))) return m[1] + " جاکلیدی با هر ترکیبی";
    if ((m = s.match(/^(Dog|Cat|Character) · 3D printed with metal key ring$/)))
      return (dict[m[1]] || m[1]) + " · چاپ سه‌بعدی با حلقهٔ فلزی";
    if (/^[\d۰-۹,٬.\s]+ Toman$/.test(s)) return s.replace("Toman", "تومان");
    if ((m = s.match(/^Add (.+) to basket$/))) return "افزودن " + (dict[m[1]] || m[1]) + " به سبد";
    if ((m = s.match(/^Quantity of (.+)$/))) return "تعداد " + (dict[m[1]] || m[1]);
    return s;
  }
  /** localize: language-runtime feature. Keep related handlers in this module. */
  function localize() {
    if (running) return;
    running = true;
    observer?.disconnect();
    try {
      for (const [en, value] of Object.entries(window.SITE_FA || {})) {
        if (typeof value === "string") window.SITE_EN[value] = en;
      }
      const fa = window.SITE_LANGUAGE === "fa";
      document.documentElement.lang = fa ? "fa" : "en";
      document.documentElement.dir = "ltr";
      const area = document.querySelector(".header-actions,.header-controls");
      if (area && !document.getElementById("site-language")) {
        const picker = document.createElement("select");
        picker.id = "site-language";
        picker.className = "language-picker";
        picker.setAttribute("aria-label", fa ? "زبان" : "Language");
        picker.innerHTML = '<option value="en">English</option><option value="fa">فارسی</option>';
        area.prepend(picker);
        picker.addEventListener("change", () => {
          const val = picker.value;
          try {
            localStorage.setItem("shn-language", val);
          } catch {}
          try {
            const url = new URL(location.href);
            url.searchParams.set("lang", val);
            history.replaceState(null, "", url);
          } catch {}
          const fields = [...document.querySelectorAll("input,textarea,select")]
            .filter((e) => e.id !== "site-language")
            .map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              value: e.value,
              checked: e.checked,
              files: e.files,
            }));
          const y = window.scrollY;
          window.setSiteLanguage(val);
          localize();
          for (const f of fields) {
            const e = f.id
              ? document.getElementById(f.id)
              : [...document.querySelectorAll("[name]")].find(
                  (e) =>
                    e.name === f.name &&
                    ((e.type !== "radio" && e.type !== "checkbox") || e.value === f.value),
                );
            if (!e) continue;
            try {
              if (f.type === "file") e.files = f.files;
              else {
                e.value = f.value;
                if (f.type === "radio" || f.type === "checkbox") e.checked = f.checked;
              }
            } catch {}
          }
          window.scrollTo({ top: y, behavior: "instant" });
        });
      }
      const picker = document.getElementById("site-language");
      if (picker) {
        picker.value = fa ? "fa" : "en";
        picker.setAttribute("aria-label", fa ? "زبان" : "Language");
        picker.querySelector("[value=en]").textContent = fa ? "انگلیسی" : "English";
        picker.querySelector("[value=fa]").textContent = fa ? "فارسی" : "Persian";
      }
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.parentElement?.closest(
            "script,style,svg,canvas,#site-language,[contenteditable=true]",
          ) || !n.nodeValue.trim()
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const n of nodes) {
        let record = originals.get(n);
        if (!record) {
          record = { source: n.nodeValue, last: n.nodeValue };
          originals.set(n, record);
        } else if (n.nodeValue !== record.last) {
          record.source = n.nodeValue;
        }
        let value = fa
          ? translateText(record.source)
          : window.SITE_EN[compact(record.source)] || record.source;
        if (n.nodeValue !== value) n.nodeValue = value;
        record.last = value;
        if (
          fa &&
          /[\u0600-\u06ff]/.test(value) &&
          !n.parentElement.closest("option,title,textarea,.localized-run")
        ) {
          const span = document.createElement("bdi");
          span.className = "localized-run";
          span.dir = "rtl";
          n.replaceWith(span);
          span.append(n);
        }
      }
      document.querySelectorAll(".localized-run").forEach((span) => {
        if (!fa) span.replaceWith(...span.childNodes);
      });
      document.querySelectorAll("[placeholder],[aria-label],img[alt]").forEach((el) => {
        if (el.id === "site-language") return;
        let attrs = originalAttrs.get(el) || {};
        for (const name of ["placeholder", "aria-label", "alt"]) {
          if (!el.hasAttribute(name)) continue;
          const val = el.getAttribute(name);
          let rec = attrs[name];
          if (!rec || val !== rec.last) rec = attrs[name] = { source: val, last: val };
          const next = fa ? translateText(rec.source) : rec.source;
          if (val !== next) el.setAttribute(name, next);
          rec.last = next;
        }
        originalAttrs.set(el, attrs);
      });
      document.querySelectorAll("a[href]").forEach((a) => {
        const h = a.getAttribute("href");
        if (!/^((SHAHRNIAZ-Redesigned-v14|AS-Industries-Offline-v8)\.html)/.test(h)) return;
        const [base, hash] = h.split("#");
        a.setAttribute(
          "href",
          base.split("?")[0] + "?lang=" + (fa ? "fa" : "en") + (hash ? "#" + hash : ""),
        );
      });
    } finally {
      running = false;
      observer?.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["placeholder", "aria-label", "alt"],
      });
    }
  }
  let observer = new MutationObserver(() => localize());
  localize();
  window.refreshLocalization = localize;
})();
