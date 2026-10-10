/* مسئولیت این فایل: نگاشت نام‌های قبلی تصاویر AS به فایل‌های مستقل. */
/**
 * SHN / as / offline-assets
 * Extracted from the original inline script #5.
 * Load order is defined by pages/index.html. See docs/CODE_MAP.fa.md.
 */
window.AS_OFFLINE_ASSETS = window.SHN_DATA.get("as/05-offline-assets/AS_OFFLINE_ASSETS-1");
window.embedAssets = (html) =>
  html.replace(/\.\/assets\/([A-Za-z0-9_-]+\.(?:webp|png))/g, (m, n) => AS_OFFLINE_ASSETS[n] || m);
