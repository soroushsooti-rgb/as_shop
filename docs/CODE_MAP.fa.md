# as_shop — نقشه کد

مسیرهای جدول نسبت به پوشه پکیج as_shop هستند.

| فایل | مسئولیت |
| --- | --- |
| hooks.py | معرفی اپ و ماژول Frappe |
| integration.py | خواندن URL عمومی از تنظیمات همان سایت |
| www/*.py | کنترلر مسیر و ارسال تنظیمات عمومی به قالب |
| www/*.html | خروجی HTML ساخته‌شده؛ ویرایش مستقیم نکنید |
| `public/css/as/01-base.css` | سبک اصلی سایت، اندازه‌ها، رنگ‌ها، فونت و حالت موبایل |
| `public/css/as/02-language.css` | سبک نمایش زبان و متن‌های فارسی |
| `public/css/as/03-customer-flow.css` | ظاهر مسیر درخواست و راهنمای کاربر |
| `public/css/as/04-shop-layout.css` | چیدمان صفحات و کارت‌های فروشگاه |
| `public/css/as/05-shop-refinements.css` | اصلاحات ظاهر فروشگاه و جزئیات نمایش محصولات |
| `public/css/as/06-shop-hero.css` | ظاهر عکس و لایهٔ بالای صفحهٔ فروشگاه |
| `public/css/as/standalone-export-1.css` | ظاهر CSS |
| `public/css/as/template-overrides.css` | قواعد ثابت ظاهری که از ویژگی style قالب‌های HTML جدا شده‌اند |
| `public/data/as/02-language-init/SITE_EN-1.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/02-language-init/SITE_FA-2.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/05-offline-assets/AS_OFFLINE_ASSETS-1.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/07-pricing-config/PRICING_CONFIG-1.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/08-drawing-worker/AS_WORKER_SOURCE-1.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/advancedLabels-10.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/descriptions-3.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/descriptions-7.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/ECO_CATEGORIES-9.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/ECO_PETS-8.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/formDefinitions-5.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/guides-6.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/materials-1.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/metals-2.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/as/10-application/rows-4.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/asset-manifest.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/integration.json` | هویت اپ و نشانی‌های جایگزین مستقل از API |
| `public/data/module-manifest.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/source-index.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/style-index.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/data/template-index.json` | داده یا فهرست منبع قابل ویرایش؛ نام مسیر حوزه مصرف را مشخص می‌کند |
| `public/js/app-context.js` | هویت ثابت همین اپ، زبان و تنظیمات اولیه |
| `public/js/app-navigation.js` | لینک URL بین سایت‌ها و دریافت API فهرست مقصدها |
| `public/js/as/01-hero-image.js` | نشانی تصویر اصلی فروشگاه |
| `public/js/as/02-language-init.js` | تشخیص زبان اولیه و معرفی فرهنگ ترجمه‌ها |
| `public/js/as/03-language-additions.js` | تکمیل ترجمه‌های فروشگاه و درخواست‌ها |
| `public/js/as/04-shop-bundle-images.js` | نشانی تصاویر مجموعه‌های فروشگاه |
| `public/js/as/05-offline-assets.js` | نگاشت نام‌های قبلی تصاویر AS به فایل‌های مستقل |
| `public/js/as/06-three-vendor.js` | کتابخانهٔ اصلی Three.js؛ کد شخص ثالث با اعلان مجوز اصلی |
| `public/js/as/07-pricing-config.js` | معرفی تنظیمات قیمت‌گذاری؛ مقادیر اصلی در JSON متناظر هستند |
| `public/js/as/08-drawing-worker.js` | معرفی Worker تحلیل فایل‌های طراحی؛ منبع اصلی در workers است |
| `public/js/as/09-engineering-scene.js` | ساخت صحنهٔ نمایشی سه‌بعدی AS |
| `public/js/as/10-application.js` | مسیریابی، فرم‌ها، سفارش نمایشی، سبد و رفتار صفحه‌های AS/فروشگاه |
| `public/js/as/11-language-runtime.js` | اعمال ترجمه روی متن‌ها و حفظ مقدار فیلدها هنگام تغییر زبان |
| `public/js/generated-data.js` | خروجی ساخته‌شده؛ منبع در data یا templates |
| `public/js/generated-templates.js` | خروجی ساخته‌شده؛ منبع در data یا templates |
| `public/js/integration-defaults.js` | خروجی ساخته‌شده؛ منبع در data یا templates |
| `public/pages/index.html` | اسکلت HTML و ترتیب بارگیری CSS و JavaScript |
| `public/workers/drawing-parser.js` | پردازش فایل طراحی در Worker مستقل |

تصاویر و فونت‌ها در public/media همین اپ قرار دارند. قالب‌ها در TEMPLATES.fa.md فهرست شده‌اند.
