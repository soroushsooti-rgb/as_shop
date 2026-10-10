/* مسئولیت این فایل: تشخیص زبان اولیه و معرفی فرهنگ ترجمه‌ها. */
/**
 * SHN / as / language-init
 * Extracted from the original inline script #2.
 * Load order is defined by pages/index.html. See docs/CODE_MAP.fa.md.
 */
window.SITE_LANGUAGE =
  window.CONNECTED_LANGUAGE ||
  (() => {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "fa" || q === "en") return q;
    try {
      return localStorage.getItem("shn-language") === "fa" ? "fa" : "en";
    } catch {
      return "en";
    }
  })();
window.SITE_EN = window.SHN_DATA.get("as/02-language-init/SITE_EN-1");
window.SITE_FA = window.SHN_DATA.get("as/02-language-init/SITE_FA-2");
window.siteTranslate = (en, fa) =>
  window.SITE_LANGUAGE === "fa"
    ? window.SITE_FA[en] || (/[\u0600-\u06ff]/.test(fa || "") ? fa : en)
    : en;
