/* مسئولیت این فایل: تکمیل ترجمه‌های فروشگاه و درخواست‌ها. */
/**
 * SHN / as / language-additions
 * Extracted from the original inline script #3.
 * Load order is defined by pages/index.html. See docs/CODE_MAP.fa.md.
 */
Object.assign(window.SITE_FA, {
  "Browse ready designs or send a photo of your pet. ↗":
    "طرح‌های AS Shop را ببینید یا عکس حیوان خودتان را بفرستید. ↗",
  "Create a family figurine from your photo. ↗": "فیگوری کوچک از آدم‌های عزیز زندگی شما. ↗",
  "Engineering & manufacturing": "مهندسی و ساخت",
  "ENGINEERING / FABRICATION": "مهندسی / ساخت قطعات",
  "INTELLIGENCE · SPACE · OBJECT": "طراحی · فضا · محصول",
  "Project categories": "دسته‌بندی پروژه‌ها",
  Close: "بستن",
  "Choose a slide": "انتخاب اسلاید",
  "Resume automatic slides": "ادامهٔ نمایش خودکار",
  "Precision 3D printed objects and manufacturing equipment": "قطعات چاپ سه‌بعدی و تجهیزات ساخت",
  "Precision laser cutting in an industrial workshop": "برش دقیق لیزری در کارگاه صنعتی",
  "Product design and manufacturing studio": "استودیوی طراحی و ساخت محصول",
  "Selected pet photo": "عکس انتخاب‌شدهٔ حیوان",
  "AS Industries, engineering and fabrication partner": "AS Industries، همکار مهندسی و ساخت",
  "Complete pet keychain with metal ring": "جاکلیدی کامل حیوان با حلقهٔ فلزی",
  "Brown-haired family photograph beside its cute cartoon-like 3D figurine":
    "عکس خانوادگی در کنار فیگور ساخته‌شده از روی آن",
  "Brown-haired family photograph beside a cute sculpted cartoon family figurine":
    "عکس خانوادگی در کنار فیگور ساخته‌شده از روی آن",
});
Object.assign(window.SITE_EN, {
  "طرح‌های AS Shop را ببینید یا عکس حیوان خودتان را بفرستید. ↗":
    "Browse ready designs or send a photo of your pet. ↗",
  "فیگوری کوچک از آدم‌های عزیز زندگی شما. ↗": "Create a family figurine from your photo. ↗",
  "مهندسی و ساخت": "Engineering & manufacturing",
  "مهندسی / ساخت قطعات": "ENGINEERING / FABRICATION",
  "طراحی · فضا · محصول": "INTELLIGENCE · SPACE · OBJECT",
  "دسته‌بندی پروژه‌ها": "Project categories",
  بستن: "Close",
  "انتخاب اسلاید": "Choose a slide",
  "ادامهٔ نمایش خودکار": "Resume automatic slides",
  "قطعات چاپ سه‌بعدی و تجهیزات ساخت": "Precision 3D printed objects and manufacturing equipment",
  "برش دقیق لیزری در کارگاه صنعتی": "Precision laser cutting in an industrial workshop",
  "استودیوی طراحی و ساخت محصول": "Product design and manufacturing studio",
  "عکس انتخاب‌شدهٔ حیوان": "Selected pet photo",
  "AS Industries، همکار مهندسی و ساخت": "AS Industries, engineering and fabrication partner",
  "جاکلیدی کامل حیوان با حلقهٔ فلزی": "Complete pet keychain with metal ring",
  "عکس خانوادگی در کنار فیگور ساخته‌شده از روی آن":
    "Brown-haired family photograph beside a cute sculpted cartoon family figurine",
}); /* Register both versions whenever a component supplies a bilingual text pair. */
window.siteTranslate = function (en, fa) {
  if (typeof en !== "string") return en;
  if (typeof fa === "string" && /[\u0600-\u06ff]/.test(fa)) {
    if (!window.SITE_FA[en]) window.SITE_FA[en] = fa;
    window.SITE_EN[fa] = en;
  }
  const reverse = window.SITE_EN[en];
  return window.SITE_LANGUAGE === "fa"
    ? window.SITE_FA[en] || (/[\u0600-\u06ff]/.test(fa || "") ? fa : en)
    : reverse || en;
};
