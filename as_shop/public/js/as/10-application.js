/* مسئولیت این فایل: مسیریابی، فرم‌ها، سفارش نمایشی، سبد و رفتار صفحه‌های AS/فروشگاه. */
/**
 * SHN / as / application
 * Extracted from the original inline script #10.
 * Load order is defined by pages/index.html. See docs/CODE_MAP.fa.md.
 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)],
    escape = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
      );
  const store = {
    get(k, d) {
      try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
        return true;
      } catch {
        return false;
      }
    },
  };
  let lang = window.SITE_LANGUAGE,
    dispose = () => {},
    path = "/",
    step = 0,
    currentFileWorker = null;
  const t = (en, fa) => window.siteTranslate(en, fa),
    tx = (pair) => t(...pair),
    num = (v) =>
      new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 2 }).format(
        v,
      ),
    money = (v) =>
      `${new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 0 }).format(v)} Toman`;
  const ADMIN_CODE = "2026";
  let adminUnlocked = false;
  const getMaterialRate = (id) => {
    const rates = store.get("as-v3-toman-rates", {}),
      value = rates[id];
    return value === null || value === "" || value === undefined
      ? null
      : Number.isFinite(Number(value)) && Number(value) >= 0
        ? Number(value)
        : null;
  };
  const image = (name, alt, cls = "", lazy = true) =>
    `<img class="${cls}" src="./assets/${name}.${name.endsWith("-v6") ? "png" : "webp"}" alt="${escape(alt)}" ${lazy ? 'loading="lazy"' : ""}>`;
  const a = (url, text, cls = "") => `<a href="#${url}" class="${cls}">${text}</a>`;
  const colors = [
    ["graphite", "#353d39", "Graphite", "گرافیتی"],
    ["ivory", "#eee9da", "Ivory", "عاجی"],
    ["lime", "#d7ef58", "Lime", "لیمویی"],
    ["clay", "#be735a", "Terracotta", "سفالی"],
    ["blue", "#7297c4", "Ocean blue", "آبی اقیانوسی"],
    ["green", "#527565", "Forest green", "سبز جنگلی"],
    ["red", "#bd4b54", "Ruby", "یاقوتی"],
    ["yellow", "#e5b84a", "Mustard", "خردلی"],
    ["purple", "#9a85b9", "Lavender", "یاسی"],
    ["silver", "#b8c2c3", "Silver", "نقره‌ای"],
    ["black", "#151815", "Black", "مشکی"],
    ["white", "#f9faf5", "White", "سفید"],
  ];
  const materials = window.SHN_DATA.get("as/10-application/materials-1");
  const metals = window.SHN_DATA.get("as/10-application/metals-2");
  const routes = [
    ["/", "Home", ""],
    ["/services", "Make a part", " "],
    ["/shop", "Shop", ""],
    ["/learn", "Learn", ""],
  ];
  const methods = [
    ["print", "3D printed part", "  ", "STL · OBJ · STEP", "/services/3d-printing/workspace", "◈"],
    ["laser", "Laser cut part", "  ", "DXF · SVG", "/services/laser-cutting/workspace", "⌁"],
    ["cnc", "CNC machined part", " ", "STEP · IGES", "/services/cnc", "⌘"],
    ["production", "Production run", " ", "Batch · repeat", "/services/production", "▦"],
    ["idea", "I only have an idea", "   ", "Sketch · photo", "/engineering/start", "✧"],
  ];
  const catalog = [
    ["charger", "Wireless charging stand", "  ", "workspace", "charger"],
    ["cables", "Cable organizer", " ", "workspace", "cables"],
    ["stand", "Headphone stand", " ", "workspace", "stand"],
    ["fountain", "Pet water fountain", " ", "pet", "fountain"],
    ["feeder", "Pet feeder", " ", "pet", "feeder"],
    ["pet-tag", "Pet identification tag", "  ", "pet", "pet-tag"],
    ["desk-set", "Studio desk collection", "  ", "workspace", "catalogue-group"],
    ["pla", "PLA filament", " ", "materials", "polymer-filaments"],
    ["petg", "PETG filament", " ", "materials", "polymer-filaments"],
    ["tpu", "TPU filament", " ", "materials", "polymer-filaments"],
    ["asa", "ASA filament", "  ", "materials", "polymer-filaments"],
    ["metal-kit", "Metal sample collection", "  ", "materials", "material-samples"],
    ["fdm", "FDM 3D printer", "  ", "machine", "fdm"],
    ["resin", "Resin 3D printer", "  ", "machine", "resin"],
    ["laser-head", "Laser toolhead", " ", "machine", "laser-head"],
  ].map(([id, en, fa, category, img]) => ({ id, name: [en, fa], category, img }));
  const state = {
    print: {
      uploaded: false,
      file: "",
      dims: [0, 0, 0],
      volume: 0,
      technology: "FDM",
      material: "PETG",
      color: "graphite",
      strength: "STANDARD",
      quality: "STANDARD",
      infill: "gyroid",
      density: 20,
      walls: 3,
      topLayers: 5,
      bottomLayers: 4,
      support: "none",
      nozzle: "0.4",
      qty: 1,
      finish: "AS_PRINTED",
      delivery: "STANDARD",
      notes: "",
    },
    laser: {
      uploaded: false,
      file: "",
      material: "ALUMINIUM",
      thickness: "2",
      qty: 1,
      finish: "RAW",
      delivery: "STANDARD",
      bounds: [0, 0],
      length: 0,
      pierces: 0,
      notes: "",
    },
  };
  let basket = store.get("as-v2-basket", []),
    drafts = store.get("as-v2-quotes", []),
    compare = ["PLA", "PETG", "TPU"],
    metalCompare = ["ALUMINIUM", "BRASS"],
    shopFilter = "all",
    productColor = "graphite";
  const matName = (id) => {
      const m = [...materials, ...metals].find((x) => x.id === id);
      return m ? tx(m.name) : id;
    },
    colName = (id) => {
      const c = colors.find((c) => c[0] === id);
      return c ? c[lang === "fa" ? 3 : 2] : id;
    };
  function logo() {
    return `<span class="as-wordmark" dir="ltr">AS<span>INDUSTRIES</span></span>`;
  }
  /** shell: application feature. Keep related handlers in this module. */
  function shell() {
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
    $("#siteHeader").innerHTML = window.SHN_TEMPLATES.render("as/10-application/shell-1", [
      window.SHN_TEMPLATES.text(t("AS Industries home", "صفحهٔ اصلی AS Industries")),
      window.SHN_TEMPLATES.text(logo()),
      window.SHN_TEMPLATES.text(t("Main navigation", "منوی اصلی")),
      window.SHN_TEMPLATES.text(
        [
          ["/services", "SERVICES", ""],
          ["/shop", "SHOP", ""],
          ["/learn", "LEARN", ""],
          ["/partners", "PARTNERS", ""],
          ["/repair", "REPAIR", ""],
        ]
          .map(([url, en, fa]) => a(url, t(en, fa)))
          .join(""),
      ),
      window.SHN_TEMPLATES.text(a("/account", t("Sign in", "ورود"), "account-link") + a("/profile", t("Profile", "پروفایل"), "account-link")),
      window.SHN_TEMPLATES.text(
        path.startsWith("/shop") || path === "/nixa"
          ? a("/shop/pets", "PET KEYCHAINS", "button primary header-quote")
          : a(
              "/cart",
              `${t("CART", "سبد درخواست")} <span id="cartCount">${num(basket.reduce((n, x) => n + x.qty, 0))}</span>`,
              "cart-link",
            ) +
              a(
                "/services/3d-printing/workspace",
                t("GET A QUOTE", "دریافت برآورد"),
                "button primary header-quote",
              ),
      ),
      window.SHN_TEMPLATES.text(t("Open menu", "باز کردن منو")),
    ]);
    $("#siteFooter").innerHTML =
      `<div class="wrap footer-grid"><div class="brand">${logo()}</div><div>${a("/services", t("Make a part", "ساخت قطعه"))}${a("/engineering", t("Design a product", "طراحی محصول"))}${a("/repair", t("Repair a machine", "تعمیر دستگاه"))}</div><div>${a("/shop", "Shop")}${a("/shop/pets", "AS Shop pet keychains")}${a("/shop/family", "Family figurines")}${a("/learn", "Learn")}</div><div>${a("/partners", "Partners")}${a("/quotes", "My quotes")}${a("/about", "About us")}${a("/contact", "Contact")}</div></div><p class="wrap footer-note">${t("Local design preview. AS Shop keychain examples are 350,000 Toman each; availability, delivery and payment are confirmed before purchase. Other products are quoted after review.", "نسخهٔ محلی طراحی. قیمت هر نمونه جاکلیدی AS Shop برابر با ۳۵۰٬۰۰۰ تومان است؛ موجودی، تحویل و پرداخت پیش از خرید تأیید می‌شوند. سایر محصولات پس از بررسی قیمت‌گذاری می‌شوند.")}</p>`;
    $("#menu").onclick = () => {
      $("#mainNav").classList.toggle("open");
      $("#menu").setAttribute("aria-expanded", String($("#mainNav").classList.contains("open")));
    };
  }
  /** accountPage: application feature. Keep related handlers in this module. */
  function accountPage() {
    const rates = store.get("as-v3-toman-rates", {}),
      materials = Object.keys(PRICING_CONFIG.printing.materials);
    return window.SHN_TEMPLATES.render("as/10-application/accountPage-2", [
      window.SHN_TEMPLATES.text(t("Sign in or create an account", "ورود یا ایجاد حساب")),
      window.SHN_TEMPLATES.text(
        t(
          "Choose a sign-in option. Google and email accounts need secure sign-in service setup before they can be used.",
          "روش ورود را انتخاب کنید. ورود با گوگل و ایمیل پس از راه‌اندازی سرویس امن ورود قابل‌استفاده خواهد بود.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Your account", "حساب شما")),
      window.SHN_TEMPLATES.text(t("Continue with Google", "ادامه با گوگل")),
      window.SHN_TEMPLATES.text(
        t("Sign in / create account with email", "ورود یا ثبت‌نام با ایمیل"),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "These account options are ready for connection to a secure sign-in service.",
          "این گزینه‌ها برای اتصال به سرویس امن ورود آماده‌اند.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Administrator access", "دسترسی مدیر")),
      window.SHN_TEMPLATES.text(
        t(
          "Enter the local code to set material prices in tomans per gram on this device.",
          "برای تعیین قیمت هر گرم ماده به تومان در این دستگاه، کد محلی را وارد کنید.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        adminUnlocked
          ? window.SHN_TEMPLATES.render("as/10-application/accountPage-3", [
              window.SHN_TEMPLATES.text(
                t("Material price per gram (toman)", "قیمت هر گرم ماده (تومان)"),
              ),
              window.SHN_TEMPLATES.text(
                materials
                  .map((id) => {
                    const v = rates[id] ?? "";
                    return window.SHN_TEMPLATES.render("as/10-application/accountPage-4", [
                      window.SHN_TEMPLATES.text(id),
                      window.SHN_TEMPLATES.text(id),
                      window.SHN_TEMPLATES.text(v),
                      window.SHN_TEMPLATES.text(t("Set price", "تعیین قیمت")),
                      window.SHN_TEMPLATES.text(escape(id)),
                      window.SHN_TEMPLATES.text(
                        t("price per gram in tomans", "قیمت هر گرم به تومان"),
                      ),
                      window.SHN_TEMPLATES.text(t("toman/g", "تومان/گرم")),
                    ]);
                  })
                  .join(""),
              ),
              window.SHN_TEMPLATES.text(t("Save pricing", "ذخیرهٔ قیمت‌ها")),
              window.SHN_TEMPLATES.text(
                t(
                  "Rates are saved in this browser only.",
                  "قیمت‌ها فقط در همین مرورگر ذخیره می‌شوند.",
                ),
              ),
              window.SHN_TEMPLATES.text(t("Lock admin settings", "قفل کردن تنظیمات مدیر")),
            ])
          : window.SHN_TEMPLATES.render("as/10-application/accountPage-5", [
              window.SHN_TEMPLATES.text(t("Administrator code", "کد مدیر")),
              window.SHN_TEMPLATES.text(t("Unlock pricing settings", "باز کردن تنظیمات قیمت")),
              window.SHN_TEMPLATES.text(
                t(
                  "Local preview only. This code does not protect a published website.",
                  "این کد فقط برای نسخهٔ محلی است و امنیت سایت منتشرشده را تأمین نمی‌کند.",
                ),
              ),
            ]),
      ),
    ]);
  }
  /** bindAccount: application feature. Keep related handlers in this module. */
  function bindAccount() {
    const status = $("#accountStatus");
    $("#googleSignIn").onclick = () =>
      (status.textContent = t(
        "Google sign-in needs OAuth credentials and a secure server connection.",
        "ورود با گوگل به تنظیمات OAuth و اتصال به سرور امن نیاز دارد.",
      ));
    $("#emailSignIn").onclick = () =>
      (status.textContent = t(
        "Email sign-in and account creation need a secure server connection.",
        "ورود با ایمیل و ایجاد حساب به اتصال به سرور امن نیاز دارند.",
      ));
    $("#adminLogin")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = $("#adminCode").value.trim() === ADMIN_CODE;
      $("#adminStatus").textContent = ok
        ? t("Access granted.", "دسترسی فعال شد.")
        : t("That code is not correct.", "کد واردشده صحیح نیست.");
      if (ok) {
        adminUnlocked = true;
        render();
      }
    });
    $("#adminRates")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const rates = {};
      $$("[data-material-rate]").forEach((input) => {
        const raw = input.value.trim();
        rates[input.dataset.materialRate] = raw === "" ? null : Number(raw);
      });
      store.set("as-v3-toman-rates", rates);
      render();
    });
    $("#adminLock")?.addEventListener("click", () => {
      adminUnlocked = false;
      render();
    });
  }
  /** render: application feature. Keep related handlers in this module. */
  function render() {
    dispose();
    dispose = () => {};
    path =
      decodeURIComponent((location.hash || window.CONNECTED_HASH || "#/").slice(1).split("?")[0]) ||
      "/";
    if ((window.CONNECTED_SITE === "shop" || window.AS_SITE === "shop") && path === "/")
      path = "/shop";
    // The managed shop body comes exclusively from the Frappe product catalogue.
    if (window.AS_SHOP_BACKEND?.owns(path)) {
      shell();
      window.AS_SHOP_BACKEND.mount(path, $("#app"));
      // Shared UI must run even when the managed body bypasses legacy bind().
      chatWidget();
      bindShopInquiry();
      bindInquiryForm($("#quickContactForm"), $("#quick-status"), "quick");
      window.refreshLocalization?.();
      return;
    }
    shell();
    let html;
    if (path === "/") html = home();
    else if (path === "/request-sent") html = receiptPage();
    else if (path === "/partners/shahrniaz") html = shahrniazPartner();
    else if (path === "/services") html = services();
    else if (path.includes("/workspace"))
      html = workspace(path.includes("laser") ? "laser" : "print");
    else if (path === "/services/3d-printing") html = processGuide("print");
    else if (path === "/services/laser-cutting") html = processGuide("laser");
    else if (path === "/services/cnc") html = intake("cnc");
    else if (path === "/services/production") html = intake("production");
    else if (path === "/engineering") html = designPage();
    else if (path === "/engineering/start") html = intake("idea");
    else if (path === "/repair") html = intake("repair");
    else if (path === "/contact" || path === "/consultation") html = intake("contact");
    else if (path === "/nixa") html = petShop();
    else if (path === "/account") html = accountPage();
    else if (path === "/shop") html = shopLanding();
    else if (path === "/shop/basket") html = ecoBasketPage();
    else if (path === "/shop/pets") html = petShop();
    else if (path.startsWith("/shop/pets/")) html = petDetail(path.split("/").pop());
    else if (path === "/shop/request") html = customRequest();
    else if (path === "/shop/furniture") html = furnitureShop();
    else if (path === "/partners") html = partnersPage();
    else if (path === "/machines") html = shop(true);
    else if (path.startsWith("/shop/")) html = shopCategory(path.split("/").pop());
    else if (/^\/machines\//.test(path)) html = product(path.split("/").pop());
    else if (path === "/cart") html = cart();
    else if (path === "/quotes") html = quotes();
    else if (path === "/learn" || path === "/learn/materials") html = learn();
    else if (path.startsWith("/learn/materials/")) html = materialPage(path.split("/").pop());
    else if (path.startsWith("/learn/"))
      html = processGuide(
        path.includes("laser") ? "laser" : path.includes("cnc") ? "cnc" : "print",
      );
    else html = about();
    $("#app").innerHTML = window.embedAssets ? window.embedAssets(html) : html;
    bind();
    window.scrollTo({ top: 0, behavior: "instant" });
    $("#app").focus({ preventScroll: true });
    const skip = document.querySelector(".skip");
    skip.textContent = t("Skip to content", "رفتن به محتوای اصلی");
    skip.onclick = (e) => {
      e.preventDefault();
      document.querySelector("#app").focus();
      document.querySelector("#app").scrollIntoView();
    };
    document.title =
      path === "/nixa"
        ? t("AS Shop — Animal keychains", "AS Shop — جاکلیدی حیوانات")
        : path.startsWith("/shop")
          ? t("Shop — AS Industries", "فروشگاه — AS Industries")
          : t("AS Industries — Idea to object", "AS Industries — از ایده تا محصول");
  }
  /** photoIntro: application feature. Keep related handlers in this module. */
  function photoIntro(kicker, title, copy, asset = "cinema-laser", action = "") {
    return window.SHN_TEMPLATES.render("as/10-application/photoIntro-6", [
      window.SHN_TEMPLATES.text(a("/", t("Home", "خانه"))),
      window.SHN_TEMPLATES.text(kicker),
      window.SHN_TEMPLATES.text(kicker),
      window.SHN_TEMPLATES.text(title),
      window.SHN_TEMPLATES.text(copy),
      window.SHN_TEMPLATES.text(action),
      window.SHN_TEMPLATES.text(image(asset, kicker, "reference-photo", false)),
    ]);
  }
  /** intro: application feature. Keep related handlers in this module. */
  function intro(kicker, title, copy) {
    const asset = path.startsWith("/learn")
      ? "cinema-studio"
      : path === "/engineering" || path === "/engineering/start"
        ? "cinema-studio"
        : path === "/repair"
          ? "cinema-print"
          : path === "/machines"
            ? "cinema-print"
            : path === "/shop"
              ? "catalogue-group"
              : path.includes("cnc")
                ? "cinema-studio"
                : "cinema-laser";
    return photoIntro(kicker, title, copy, asset);
  }
  /** methodTiles: application feature. Keep related handlers in this module. */
  function methodTiles() {
    const pics = ["cinema-print", "cinema-laser", "cinema-studio", "cinema-print", "cinema-studio"];
    const titles = [
      ["3D printing services", "خدمات چاپ سه‌بعدی"],
      ["Laser cutting services", "خدمات برش لیزری"],
      ["CNC machining", "ماشین‌کاری CNC"],
      ["Production runs", "تولید سری"],
      ["Product design", "طراحی محصول"],
    ];
    const descriptions = window.SHN_DATA.get("as/10-application/descriptions-3");
    return `<div class="service-gallery">${methods.map(([id, en, fa, meta, url], i) => window.SHN_TEMPLATES.render("as/10-application/methodTiles-7", [window.SHN_TEMPLATES.text(url), window.SHN_TEMPLATES.text(image(pics[i], tx(titles[i]))), window.SHN_TEMPLATES.text(num(i + 1).padStart(2, lang === "fa" ? "" : "0")), window.SHN_TEMPLATES.text(i === 3 ? t("BATCH MANUFACTURING", "تولید سری") : i === 4 ? t("CONCEPT → PRODUCT", "از ایده تا محصول") : meta), window.SHN_TEMPLATES.text(tx(titles[i])), window.SHN_TEMPLATES.text(tx(descriptions[i])), window.SHN_TEMPLATES.text(t("Start here", "از اینجا شروع کنید"))])).join("")}</div>`;
  }
  /** home: application feature. Keep related handlers in this module. */
  function home() {
    return window.SHN_TEMPLATES.render("as/10-application/home-8", [
      window.SHN_TEMPLATES.text(
        image(
          "cinema-laser",
          t("Precision manufacturing in light and metal", "ساخت دقیق با نور و فلز"),
          "cinema-hero-image",
          false,
        ),
      ),
      window.SHN_TEMPLATES.text(
        t("AS INDUSTRIES / FROM THOUGHT TO THING", "AS INDUSTRIES / از ایده تا ساخت"),
      ),
      window.SHN_TEMPLATES.text(
        t("IDEAS TAKE<br><em>SHAPE.</em>", "ایده‌ها<br><em>شکل می‌گیرند.</em>"),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "A line becomes a contour. A layer becomes a part.<br>Your next idea begins here.",
          "خطی که به طرح تبدیل می‌شود. لایه‌ای که قطعه می‌سازد.<br>ایدهٔ بعدی شما از اینجا آغاز می‌شود.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/services/3d-printing/workspace",
          t("Upload your part ↗", "بارگذاری فایل قطعه ↗"),
          "button primary",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a("/services", t("Explore manufacturing", "آشنایی با روش‌های ساخت"), "classic-text-link"),
      ),
      window.SHN_TEMPLATES.text(
        t("SCROLL TO SEE IT TAKE SHAPE ↓", "پایین بروید و مراحل شکل‌گیری را ببینید ↓"),
      ),
      window.SHN_TEMPLATES.text(t("YOUR NEXT MOVE", "قدم بعدی شما")),
      window.SHN_TEMPLATES.text(t("What will you make?", "چه می‌خواهید بسازید؟")),
      window.SHN_TEMPLATES.text(
        t(
          "Five ways to begin. One place to bring it together.",
          "پنج مسیر برای شروع؛ یک مجموعه برای پیش بردن کار.",
        ),
      ),
      window.SHN_TEMPLATES.text(methodTiles()),
      window.SHN_TEMPLATES.text(processMotion("print")),
      window.SHN_TEMPLATES.text(processMotion("laser")),
      window.SHN_TEMPLATES.text(
        image(
          "cinema-studio",
          t("Finished metal and polymer components", "قطعات ساخته‌شده از فلز و پلیمر"),
          "finale-photo",
        ),
      ),
      window.SHN_TEMPLATES.text(t("03 / THE IDEA, MADE REAL", "۰۳ / ایده‌ای که ساخته شد")),
      window.SHN_TEMPLATES.text(
        t("Different materials.<br>One clear intention.", "مواد مختلف.<br>یک هدف مشخص."),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Compare materials. Resolve the details.<br>Make something worth holding.",
          "مواد را مقایسه کنید و جزئیات را مشخص کنید.<br>محصولی بسازید که از داشتنش لذت ببرید.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a("/learn", t("Explore the material studio ↗", "بررسی مواد و متریال ↗"), "button primary"),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/engineering/start",
          t("Start with an idea ↗", "شروع از یک ایده ↗"),
          "classic-text-link",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Made for everyday.", "برای استفادهٔ روزمره.")),
      window.SHN_TEMPLATES.text(
        a("/shop", t("Explore the collection ↗", "دیدن مجموعه ↗"), "classic-text-link"),
      ),
      window.SHN_TEMPLATES.text(
        catalog
          .filter((p) => ["charger", "fountain", "cables"].includes(p.id))
          .map(card)
          .join(""),
      ),
    ]);
  }
  /** processMotion: application feature. Keep related handlers in this module. */
  function processMotion(type, standalone = false) {
    const laser = type === "laser",
      uid = "motion-" + type;
    return window.SHN_TEMPLATES.render("as/10-application/processMotion-9", [
      window.SHN_TEMPLATES.text(standalone ? "standalone" : ""),
      window.SHN_TEMPLATES.text(type),
      window.SHN_TEMPLATES.text(
        image(
          laser ? "cinema-laser" : "cinema-print",
          laser
            ? t("Precision laser head and metal sheet", "هد لیزر و ورق فلزی")
            : t("Printer building a ribbed part", "چاپگر در حال ساخت قطعهٔ شیاردار"),
          "making-photo",
        ),
      ),
      window.SHN_TEMPLATES.text(
        laser
          ? t("02 / CUT THE OUTLINE", "۰۲ / برش طرح")
          : t("01 / BUILD THE LAYERS", "۰۱ / ساخت لایه‌ها"),
      ),
      window.SHN_TEMPLATES.text(
        laser
          ? t("A line.<br>A new possibility.", "یک خط.<br>امکانی تازه.")
          : t("A little material.<br>One layer at a time.", "کمی ماده.<br>لایه به لایه."),
      ),
      window.SHN_TEMPLATES.text(
        laser
          ? t(
              "Follow the head as a drawing becomes a shape. Material, thickness and contour define the next step.",
              "حرکت هد را دنبال کنید تا طرح به قطعه تبدیل شود. جنس ورق، ضخامت و مسیر برش، مرحلهٔ بعد را تعیین می‌کنند.",
            )
          : t(
              "Watch the nozzle build the profile, layer by layer. Choose the inside, surface and character of your part.",
              "ساخت لایه‌به‌لایهٔ قطعه را ببینید و ساختار داخلی، کیفیت سطح و ویژگی‌های آن را انتخاب کنید.",
            ),
      ),
      window.SHN_TEMPLATES.text(
        a(
          laser ? "/services/laser-cutting/workspace" : "/services/3d-printing/workspace",
          laser
            ? t("Prepare a laser cut part ↗", "آماده‌سازی قطعه برای برش لیزری ↗")
            : t("Configure my print ↗", "تنظیم چاپ قطعه ↗"),
          "button primary",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Process illustration", "نمای شماتیک فرایند")),
      window.SHN_TEMPLATES.text(t("Pause motion", "توقف حرکت")),
      window.SHN_TEMPLATES.text(
        laser
          ? t("Moving laser head following a cutting contour", "حرکت هد لیزر روی مسیر برش")
          : t("Moving print nozzle with growing layers", "حرکت نازل و ساخته‌شدن لایه‌ها"),
      ),
      window.SHN_TEMPLATES.text(uid),
      window.SHN_TEMPLATES.text(uid),
      window.SHN_TEMPLATES.text(uid),
      window.SHN_TEMPLATES.text(uid),
      window.SHN_TEMPLATES.text(uid),
      window.SHN_TEMPLATES.text(
        laser
          ? `<path data-toolpath d="M165 330 L200 280 L425 280 L475 330 L450 400 L190 400 Z" fill="#101613" stroke="#8c9b84" stroke-width="1" opacity=".5"/><path data-cut d="M165 330 L200 280 L425 280 L475 330 L450 400 L190 400 Z" fill="none" stroke="#d9ff28" stroke-width="2.2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><g data-tool transform="translate(165 330)"><image href="./assets/laser-head.webp" x="-86" y="-184" width="200" height="200"/><path d="M0 -3V0" stroke="#fff4cd" stroke-width="2"/><g data-sparks stroke="#f5b15f" stroke-width="1.5">${Array.from(
              { length: 10 },
              (_, i) => {
                const a = i * 2.4;
                return `<path d="M${Math.cos(a) * 5} ${Math.sin(a) * 3}l${Math.cos(a) * (12 + i * 2)} ${Math.sin(a) * (6 + i)}"/>`;
              },
            ).join("")}</g><circle r="8" fill="#ffbc6630"/><circle r="2.7" fill="#fff6d1"/></g>`
          : `<g clip-path="url(#${uid}-growth)"><path d="M180 365V213Q320 162 460 213V365Q320 415 180 365Z" fill="url(#${uid}-polymer)"/>${Array.from({ length: 31 }, (_, i) => `<path d="M180 ${365 - i * 5}Q320 ${415 - i * 5} 460 ${365 - i * 5}" fill="none" stroke="#393f2d" opacity=".42" stroke-width="1"/>`).join("")}</g><path data-print-trace d="M180 365Q320 415 460 365" fill="none" stroke="#eaff83" stroke-width="2"/><g data-tool transform="translate(180 365)"><image href="./assets/cinema-printhead.webp" x="-106" y="-209" width="224" height="224" style="mix-blend-mode:lighten"/></g>`,
      ),
      window.SHN_TEMPLATES.text(t("READY TO MAKE", "آمادهٔ ساخت")),
      window.SHN_TEMPLATES.text(
        t(
          "Process progress; adjust to control the head",
          "پیشرفت فرایند؛ برای کنترل هد، نوار را جابه‌جا کنید",
        ),
      ),
    ]);
  }

  /** serviceRows: application feature. Keep related handlers in this module. */
  function serviceRows() {
    const rows = window.SHN_DATA.get("as/10-application/rows-4");
    return `<div class="reference-service-list">${rows.map((x, i) => a(x[4], `<span class="row-number">${num(i + 1).padStart(2, lang === "fa" ? "" : "0")}</span><h3>${t(x[0], x[1])}</h3><p>${t(x[2], x[3])}</p><span class="row-meta">${lang === "fa" ? [" / ", " / ", " /  ", " / ", " / "][i] : x[5]} ↗</span>`, "reference-service-row")).join("")}</div>`;
  }
  /** services: application feature. Keep related handlers in this module. */
  function services() {
    return (
      photoIntro(
        t("Services", "خدمات"),
        t("WHAT DO YOU<br>WANT TO MAKE?", "چه می‌خواهید<br>بسازید؟"),
        t(
          "Choose the shape of the problem, not the engineering terminology.",
          "کار موردنیازتان را انتخاب کنید؛ لازم نیست اصطلاحات فنی را بدانید.",
        ),
        "cinema-laser",
      ) + `<section class="reference-services wrap">${serviceRows()}</section>`
    );
  }
  /** bindHero: application feature. Keep related handlers in this module. */
  function bindHero() {
    const host = $("#hero3d"),
      section = $("#scrollStory"),
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
      scene = ASScene(host);
    if (!scene) {
      host.innerHTML = image(
        "material-samples",
        t("Engineering material samples", "نمونه‌های مواد مهندسی"),
      );
      if (window.embedAssets) host.innerHTML = window.embedAssets(host.innerHTML);
    }
    let frame = 0,
      last = -1;
    const update = () => {
      frame = 0;
      const p = reduced
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              -section.getBoundingClientRect().top /
                Math.max(1, section.offsetHeight - innerHeight + 76),
            ),
          );
      scene?.setProgress(p);
      $("#scrollProgress").style.width = p * 100 + "%";
      const phase = Math.min(2, Math.floor(p * 3));
      if (phase !== last) {
        last = phase;
        $("#storyTitle").innerHTML = [
          t("An idea.<br>A thousand possibilities.", "یک ایده.<br>هزار امکان."),
          t("Every detail.<br>In its right place.", "هر جزئیات،<br>در جای درست."),
          t("From imagination.<br>Into your hands.", "از تصور شما<br>تا محصولی در دستتان."),
        ][phase];
        $("#storyCopy").textContent = [
          t(
            "Start with a file or a thought. The path to making starts right here.",
            "با یک فایل یا یک ایده شروع کنید. مسیر ساخت از همین‌جا آغاز می‌شود.",
          ),
          t(
            "Explore the assembly. Material, geometry and process come together.",
            "مونتاژ را بررسی کنید؛ جنس، هندسه و روش ساخت در کنار هم قرار می‌گیرند.",
          ),
          t(
            "Prepare a clear brief and move toward a manufacturable part.",
            "نیازها را روشن کنید و به سمت قطعه‌ای قابل‌ساخت پیش بروید.",
          ),
        ][phase];
        $("#stageName").textContent = [
          t("01 / CONCEPT", "۰۱ / ایده"),
          t("02 / ENGINEER", "۰۲ / طراحی مهندسی"),
          t("03 / ASSEMBLE", "۰۳ / مونتاژ"),
        ][phase];
      }
    };
    const onscroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onscroll, { passive: true });
    update();
    $("#skipStory").onclick = () =>
      $("#homeNext").scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
    dispose = () => {
      window.removeEventListener("scroll", onscroll);
      cancelAnimationFrame(frame);
      scene?.dispose();
    };
  }
  const finishes = [
    ["AS_PRINTED", "As printed", " "],
    ["CLEANUP", "Cleaned", ""],
    ["SANDING", "Sanded", ""],
    ["PAINTING", "Painted", ""],
  ];
  const laserFinishes = [
    ["RAW", "Raw edge", " "],
    ["DEBURRED", "Deburred", ""],
    ["BRUSHED", "Brushed", ""],
    ["POWDER_COATED", "Powder coated", " "],
  ];
  const qualities = [
    ["DRAFT", "Quick prototype", " ", "0.28"],
    ["STANDARD", "Balanced", "", "0.20"],
    ["DETAIL", "Fine detail", " ", "0.12"],
  ];
  const infills = [
    [
      "gyroid",
      "Gyroid",
      "",
      "A continuous curved structure that changes between layers. Useful for support in several directions.",
      "              .",
    ],
    [
      "linear",
      "Linear / rectilinear",
      "",
      "Parallel paths, with direction alternating between layers. A simple, efficient starting point.",
      "            .",
    ],
    [
      "grid",
      "Grid",
      "",
      "Two crossing directions in each layer. The nozzle crosses previously printed paths.",
      "             .",
    ],
    [
      "honeycomb",
      "Honeycomb",
      "",
      "Hexagonal cells. More changes of direction can increase printing time.",
      "          .",
    ],
  ];
  /** infillSVG: application feature. Keep related handlers in this module. */
  function infillSVG(pattern, density = 20) {
    if (density === 0 || density === 100)
      return `<svg viewBox="0 0 160 100" aria-hidden="true"><rect x="6" y="6" width="148" height="88" rx="7" fill="${density === 100 ? "currentColor" : "none"}" stroke="currentColor" stroke-width="3"/></svg>`;
    let lines = "";
    const gap = Math.max(6, 26 - density * 0.2);
    if (pattern === "gyroid") {
      // Iso-contour of sin(x)cos(y)+sin(y)cos(z)+sin(z)cos(x)=0 at z=.65.
      const scale = gap / 3,
        cell = 2,
        z = 0.65,
        f = (x, y) =>
          Math.sin(x / scale) * Math.cos(y / scale) +
          Math.sin(y / scale) * Math.cos(z) +
          Math.sin(z) * Math.cos(x / scale);
      for (let y = 10; y < 90; y += cell)
        for (let x = 10; x < 150; x += cell) {
          const p = [
              [x, y],
              [x + cell, y],
              [x + cell, y + cell],
              [x, y + cell],
            ],
            v = p.map(([a, b]) => f(a, b)),
            cross = [];
          for (let i = 0; i < 4; i++) {
            let j = (i + 1) % 4;
            if (v[i] < 0 !== v[j] < 0) {
              const u = v[i] / (v[i] - v[j]);
              cross.push([p[i][0] + u * (p[j][0] - p[i][0]), p[i][1] + u * (p[j][1] - p[i][1])]);
            }
          }
          for (let i = 0; i + 1 < cross.length; i += 2)
            lines += `M${cross[i][0]},${cross[i][1]}L${cross[i + 1][0]},${cross[i + 1][1]}`;
        }
    } else if (pattern === "honeycomb") {
      let size = gap * 0.52,
        h = Math.sqrt(3) * size;
      for (let x = -size, c = 0; x < 170; x += size * 1.5, c++)
        for (let y = -h; y < 110; y += h) {
          const cy = y + ((c % 2) * h) / 2;
          for (let k = 0; k <= 6; k++) {
            const a = (k * Math.PI) / 3;
            lines += (k ? "L" : "M") + (x + size * Math.cos(a)) + "," + (cy + size * Math.sin(a));
          }
        }
    } else {
      for (let n = -100; n < 200; n += gap) {
        lines += `M${n},10l80,80`;
        if (pattern === "grid") lines += `M${n},10l-80,80`;
      }
    }
    return window.SHN_TEMPLATES.render("as/10-application/infillSVG-10", [
      window.SHN_TEMPLATES.text(lines),
    ]);
  }
  /** layerSVG: application feature. Keep related handlers in this module. */
  function layerSVG(height) {
    let out = "";
    const gap = height * 110;
    for (let y = 12; y < 89; y += gap) out += `<path d="M18 ${y}H142"/>`;
    return window.SHN_TEMPLATES.render("as/10-application/layerSVG-11", [
      window.SHN_TEMPLATES.text(out),
    ]);
  }
  /** slicerControls: application feature. Keep related handlers in this module. */
  function slicerControls(s) {
    return window.SHN_TEMPLATES.render("as/10-application/slicerControls-12", [
      window.SHN_TEMPLATES.text(t("Inside your part", "ساختار داخلی قطعه")),
      window.SHN_TEMPLATES.text(t("PRINT SETTINGS", "تنظیمات چاپ")),
      window.SHN_TEMPLATES.text(
        t(
          "Infill is the internal structure between the outer walls. Choose its pattern and how much of the interior it fills.",
          "پرکننده، ساختار داخلی میان دیواره‌های بیرونی قطعه است. الگو و میزان پرشدن آن را انتخاب کنید.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        infills
          .map(
            (x) =>
              `<button data-infill="${x[0]}" class="infill-card ${s.infill === x[0] ? "selected" : ""}" aria-pressed="${s.infill === x[0]}">${infillSVG(x[0], s.density)}<strong>${t(x[1], x[2])}</strong><span class="selection-check">${s.infill === x[0] ? "✓" : "○"}</span><p>${t(x[3], x[4])}</p></button>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Schematic pattern slices, not toolpaths calculated for your uploaded model.",
          "الگوها شماتیک‌اند و مسیر واقعی چاپِ فایل شما را نشان نمی‌دهند.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Infill density", "تراکم پرکننده")),
      window.SHN_TEMPLATES.text(num(s.density)),
      window.SHN_TEMPLATES.text(s.density),
      window.SHN_TEMPLATES.text(
        t(
          "0% leaves the interior empty; 100% requests a solid fill. More infill usually uses more material and time. At 100%, the pattern switches to linear. Walls, orientation and material also affect strength.",
          "۰٪ یعنی داخل قطعه خالی است؛ ۱۰۰٪ یعنی پرکنندهٔ توپر. تراکم بیشتر معمولاً ماده و زمان بیشتری مصرف می‌کند. در ۱۰۰٪، الگو خطی می‌شود. دیواره‌ها، جهت چاپ و جنس هم بر استحکام اثر دارند.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Layer height", "ارتفاع لایه")),
      window.SHN_TEMPLATES.text(
        t(
          "The thickness of each deposited layer. Thinner layers reduce visible stepping but increase the number of layers and usually the print time.",
          "ضخامت هر لایهٔ چاپ‌شده. لایه‌های نازک‌تر، رد لایه‌ها را کمتر می‌کنند اما تعداد لایه‌ها و معمولاً زمان چاپ را افزایش می‌دهند.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        qualities
          .map(
            (q) =>
              `<button class="layer-card ${q[0] === s.quality ? "selected" : ""}" data-quality="${q[0]}" aria-pressed="${q[0] === s.quality}">${layerSVG(+q[3])}<strong>${num(+q[3])} ${t("mm", "میلی‌متر")}</strong><span>${t(q[1], q[2])}</span><small>${q[0] === "DRAFT" ? t("Fewer layers; more visible steps.", "لایه‌های کمتر؛ رد لایه‌ها واضح‌تر است.") : q[0] === "DETAIL" ? t("More layers; finer surface detail.", "لایه‌های بیشتر؛ جزئیات سطح ظریف‌تر است.") : t("A middle ground for general parts.", "گزینه‌ای متعادل برای قطعات معمولی.")}</small></button>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(t("Wall loops", "تعداد دیواره‌ها")),
      window.SHN_TEMPLATES.text(s.walls),
      window.SHN_TEMPLATES.text(
        t(
          "Contours around the part. More walls add material to its shell.",
          "دیواره‌های پیرامون قطعه؛ تعداد بیشتر، پوسته را ضخیم‌تر می‌کند.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Nozzle diameter (mm)", "قطر نازل (میلی‌متر)")),
      window.SHN_TEMPLATES.text(
        ["0.4", "0.6", "0.8"]
          .map(
            (x) => `<option value="${x}" ${s.nozzle === x ? "selected" : ""}>${num(+x)}</option>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Wider nozzles suit wider paths; available hardware must be confirmed.",
          "نازل بزرگ‌تر برای مسیرهای پهن‌تر مناسب است؛ امکانات دستگاه باید تأیید شود.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Top solid layers", "لایه‌های توپر بالا")),
      window.SHN_TEMPLATES.text(s.topLayers),
      window.SHN_TEMPLATES.text(
        t("Solid layers closing the top surface.", "لایه‌های توپر برای بستن سطح بالایی."),
      ),
      window.SHN_TEMPLATES.text(t("Bottom solid layers", "لایه‌های توپر پایین")),
      window.SHN_TEMPLATES.text(s.bottomLayers),
      window.SHN_TEMPLATES.text(t("Solid layers forming the base.", "لایه‌های توپرِ کف قطعه.")),
      window.SHN_TEMPLATES.text(t("Support preference", "انتخاب ساپورت")),
      window.SHN_TEMPLATES.text(
        opts(
          [
            ["none", "No support requested", " "],
            ["auto", "Automatic / engineering review", " /  "],
            ["tree", "Tree / organic, if suitable", " /    "],
          ],
          s.support,
        ),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Temporary structures under overhangs. The model must be sliced to determine where they are needed.",
          "ساختارهای موقت زیر قسمت‌های معلق؛ محل دقیق آن‌ها پس از آماده‌سازی فایل چاپ مشخص می‌شود.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "These preferences are saved in your brief. Final toolpaths, time and material require slicing; the demo estimate does not simulate every setting.",
          "این تنظیمات در شرح درخواست ذخیره می‌شوند. مسیر چاپ، زمان و مصرف نهایی پس از آماده‌سازی فایل در نرم‌افزار اسلایسر مشخص می‌شوند؛ برآورد نمایشی همهٔ تنظیمات را شبیه‌سازی نمی‌کند.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        t("Read the Prusa infill guide ↗", "مطالعهٔ راهنمای پرکنندهٔ Prusa ↗"),
      ),
    ]);
  }
  /** bindSlicer: application feature. Keep related handlers in this module. */
  function bindSlicer(s, type) {
    if (type !== "print") return;
    $$("[data-infill]").forEach(
      (b) =>
        (b.onclick = () => {
          s.infill = b.dataset.infill;
          if (s.density === 100 && s.infill !== "linear") s.density = 95;
          config(type);
        }),
    );
    $$("[data-quality]").forEach(
      (b) =>
        (b.onclick = () => {
          s.quality = b.dataset.quality;
          config(type);
        }),
    );
    $("#density")?.addEventListener("input", (e) => {
      s.density = +e.target.value;
      $("#densityValue").textContent = num(s.density) + "";
      $$("[data-infill]").forEach(
        (b) => (b.querySelector("svg").outerHTML = infillSVG(b.dataset.infill, s.density)),
      );
    });
    $("#density")?.addEventListener("change", () => {
      if (s.density === 100) s.infill = "linear";
      config(type);
    });
    for (const k of ["walls", "topLayers", "bottomLayers"])
      $("#" + k)?.addEventListener("input", (e) => {
        s[k] = Math.max(
          k === "walls" ? 1 : 0,
          Math.min(k === "walls" ? 12 : 20, Math.round(+e.target.value || 0)),
        );
        e.target.value = s[k];
      });
    for (const k of ["nozzle", "support"])
      $("#" + k)?.addEventListener("change", (e) => (s[k] = e.target.value));
  }
  /** slicerRows: application feature. Keep related handlers in this module. */
  function slicerRows(s, type) {
    if (type !== "print") return [];
    return [
      [t("Infill pattern", "الگوی پرکننده"), selectedLabel(infills, s.infill || "gyroid")],
      [t("Infill density", "تراکم پرکننده"), num(s.density ?? 20) + ""],
      [
        t("Layer height", "ارتفاع لایه"),
        num(+qualities.find((q) => q[0] === s.quality)[3]) + " " + t("mm", "میلی‌متر"),
      ],
      [t("Wall loops", "تعداد دیواره‌ها"), num(s.walls ?? 3)],
      [
        t("Top / bottom layers", "لایه‌های بالا / پایین"),
        num(s.topLayers ?? 5) + " / " + num(s.bottomLayers ?? 4),
      ],
      [t("Nozzle diameter", "قطر نازل"), num(+(s.nozzle || 0.4)) + " " + t("mm", "میلی‌متر")],
      [
        t("Support", "ساپورت"),
        selectedLabel(
          [
            ["none", "None", " "],
            ["auto", "Automatic / review", " / "],
            ["tree", "Tree / review", " / "],
          ],
          s.support || "none",
        ),
      ],
    ];
  }

  function opts(items, selected) {
    return items
      .map(
        (x) =>
          `<option value="${x[0]}" ${x[0] === selected ? "selected" : ""}>${t(x[1], x[2])}</option>`,
      )
      .join("");
  }
  function selectedLabel(list, id) {
    const x = list.find((x) => x[0] === id);
    return x ? t(x[1], x[2]) : id;
  }
  /** workspace: application feature. Keep related handlers in this module. */
  function workspace(type) {
    const s = state[type];
    step = s.uploaded ? 1 : 0;
    return window.SHN_TEMPLATES.render("as/10-application/workspace-13", [
      window.SHN_TEMPLATES.text(type),
      window.SHN_TEMPLATES.text(a("/services", t("← All processes", "← همهٔ روش‌های ساخت"))),
      window.SHN_TEMPLATES.text(
        type === "print" ? t("3D printing", "چاپ سه‌بعدی") : t("Laser cutting", "برش لیزری"),
      ),
      window.SHN_TEMPLATES.text(
        t("Your files stay on your device", "فایل‌ها در دستگاه شما می‌مانند"),
      ),
      window.SHN_TEMPLATES.text(
        s.uploaded ? escape(s.file) : t("Your part, right here", "پیش‌نمایش قطعهٔ شما"),
      ),
      window.SHN_TEMPLATES.text(t("Choose / replace", "انتخاب / تعویض فایل")),
      window.SHN_TEMPLATES.text(
        type === "print" ? ".stl,.obj,.step,.stp,.3mf" : ".dxf,.svg,.pdf,.ai",
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Part preview. Drag to rotate; shift-drag to pan; arrow keys and plus/minus also work.",
          "پیش‌نمایش قطعه. برای چرخش بکشید؛ برای جابه‌جایی، هم‌زمان Shift را نگه دارید. کلیدهای جهت و مثبت و منفی هم فعال‌اند.",
        ),
      ),
      window.SHN_TEMPLATES.text(s.uploaded ? "hidden" : ""),
      window.SHN_TEMPLATES.text(t("Drop your file here", "فایل را اینجا رها کنید")),
      window.SHN_TEMPLATES.text(type === "print" ? "STL · OBJ · STEP · 3MF" : "DXF · SVG · PDF"),
      window.SHN_TEMPLATES.text(t("Choose a file", "انتخاب فایل")),
      window.SHN_TEMPLATES.text(
        t(
          "No fixed file-size limit; available device memory matters.",
          "محدودیت ثابتی برای حجم فایل نیست؛ ظرفیت حافظهٔ دستگاه تعیین‌کننده است.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Reading your geometry…", "در حال خواندن هندسهٔ فایل…")),
      window.SHN_TEMPLATES.text(t("Cancel", "لغو")),
      window.SHN_TEMPLATES.text(t("Fit", "نمای کامل")),
      window.SHN_TEMPLATES.text(t("Front", "نمای روبه‌رو")),
      window.SHN_TEMPLATES.text(t("Top", "نمای بالا")),
      window.SHN_TEMPLATES.text(t("Angle", "نمای زاویه‌دار")),
      window.SHN_TEMPLATES.text(t("Zoom in", "بزرگ‌نمایی")),
      window.SHN_TEMPLATES.text(t("Zoom out", "کوچک‌نمایی")),
      window.SHN_TEMPLATES.text(
        type === "laser"
          ? t(
              "DXF lines, polylines, arcs, circles, ellipses, splines and blocks are supported.",
              "خط، چندخطی، کمان، دایره، بیضی، اسپلاین و بلوک در فایل DXF پشتیبانی می‌شوند.",
            )
          : t(
              "STL and OBJ preview immediately. STEP and 3MF are accepted for review.",
              "STL و OBJ مستقیم پیش‌نمایش دارند. STEP و 3MF برای بررسی پذیرفته می‌شوند.",
            ),
      ),
      window.SHN_TEMPLATES.text(
        type === "laser"
          ? `<label class="units">${t("Drawing units", "واحد نقشه")}<select id="drawingUnit">${opts(
              [
                ["auto", "From file / mm if unspecified", "  /    "],
                ["mm", "میلی‌متر", ""],
                ["cm", "Centimeters", ""],
                ["inch", "Inches", ""],
              ],
              s.unit || "auto",
            )}</select></label>`
          : "",
      ),
      window.SHN_TEMPLATES.text(t("Quote steps", "مراحل برآورد")),
      window.SHN_TEMPLATES.text(
        [t("File", "فایل"), t("Material", "جنس"), t("Quantity", "تعداد"), t("Review", "بازبینی")]
          .map(
            (v, i) =>
              `<button data-step="${i}" ${i > 1 && !s.uploaded ? "disabled" : ""}><span>${num(i + 1)}</span>${v}</button>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(t("Back", "بازگشت")),
      window.SHN_TEMPLATES.text(t("Continue →", "ادامه →")),
    ]);
  }
  /** materialPicker: application feature. Keep related handlers in this module. */
  function materialPicker(type) {
    const s = state[type],
      list = type === "print" ? materials : metals;
    return `<div class="material-picker">${list.map((m) => `<button data-material="${m.id}" class="material-option ${m.id === s.material ? "selected" : ""}" aria-pressed="${m.id === s.material}"><i style="--sample:${m.color || { PLA: "#e6e6d7", PETG: "#7fa3a4", ABS: "#777f83", ASA: "#ac9476", TPU: "#cae769", NYLON: "#d6d0be", PC: "#a8bfc8", CF_NYLON: "#4a5350" }[m.id]}"></i><strong>${tx(m.name)}</strong><small>${tx(m.tag || m.use)}</small><span>✓</span></button>`).join("")}</div>`;
  }
  /** palette: application feature. Keep related handlers in this module. */
  function palette(selected, scope = "part") {
    return `<div class="palette" role="group" aria-label="${t("Choose a color", "انتخاب رنگ")}">${colors.map((c) => `<button class="swatch ${c[0] === selected ? "selected" : ""}" style="--swatch:${c[1]}" data-color="${c[0]}" data-scope="${scope}" aria-label="${c[lang === "fa" ? 3 : 2]}" aria-pressed="${c[0] === selected}"><i></i><span>${c[lang === "fa" ? 3 : 2]}</span></button>`).join("")}</div>`;
  }
  /** config: application feature. Keep related handlers in this module. */
  function config(type) {
    const s = state[type],
      print = type === "print";
    $$("[data-step]").forEach((b) => {
      b.classList.toggle("active", +b.dataset.step === step);
      b.disabled = +b.dataset.step > 1 && !s.uploaded;
      b.setAttribute("aria-current", +b.dataset.step === step ? "step" : "false");
    });
    $("#prevStep").hidden = step === 0;
    $("#nextStep").hidden = step === 3;
    $("#nextStep").disabled = !s.uploaded;
    const title = [
      t("Start with your file.", "با فایل قطعه شروع کنید."),
      t("Choose how it feels.", "جنس و ظاهر قطعه را انتخاب کنید."),
      t("One part or a whole batch?", "یک قطعه یا تولید سری؟"),
      t("Everything, in one place.", "همهٔ جزئیات، در یک نگاه."),
    ][step];
    let body = `<h2>${title}</h2>`;
    if (step === 0)
      body += `<p class="muted">${t("Drop a file on the preview or choose one from your device. You can continue even if a format needs engineering review.", "فایل را روی پیش‌نمایش رها کنید یا از دستگاه انتخاب کنید. حتی اگر فرمت به بررسی مهندسی نیاز دارد، می‌توانید مراحل بعد را ادامه دهید.")}</p><div class="tip">${t("Only have an idea? You can start without CAD.", "فقط ایده دارید؟ بدون فایل CAD هم می‌توانید شروع کنید.")}${a("/engineering/start", t("Start with an idea ↗", "شروع از یک ایده ↗"))}</div>`;
    if (step === 1) {
      const m = [...materials, ...metals].find((m) => m.id === s.material);
      body +=
        materialPicker(type) +
        `<div class="material-description"><strong>${matName(s.material)}</strong><p>${tx(m.desc || m.detail)}</p>${a("/learn", t("Compare materials ↗", "مقایسهٔ مواد ↗"))}</div>`;
      if (print)
        body += `<div class="field-heading"><h3>${t("Color", "رنگ")}</h3><span id="colorName">${colName(s.color)}</span></div>${palette(s.color)}<p class="micro">${t("Color on screen is an approximation. Stock is confirmed before purchase.", "رنگ روی صفحه تقریبی است. موجودی پیش از خرید تأیید می‌شود.")}</p>${slicerControls(s)}`;
      else
        body += window.SHN_TEMPLATES.render("as/10-application/config-14", [
          window.SHN_TEMPLATES.text(t("Sheet thickness (mm)", "ضخامت ورق (میلی‌متر)")),
          window.SHN_TEMPLATES.text(s.thickness),
          window.SHN_TEMPLATES.text(
            [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12]
              .map(
                (n) =>
                  `<button data-thickness="${n}" class="${+s.thickness === n ? "selected" : ""}">${num(n)}</button>`,
              )
              .join(""),
          ),
          window.SHN_TEMPLATES.text(Math.min(70, 4 + Number(s.thickness) * 5)),
          window.SHN_TEMPLATES.text(m.color),
          window.SHN_TEMPLATES.text(num(+s.thickness)),
          window.SHN_TEMPLATES.text(t("mm", "میلی‌متر")),
          window.SHN_TEMPLATES.text(
            t(
              "Any positive thickness can be requested. Only configured thicknesses receive a demo estimate.",
              "هر ضخامت مثبت قابل‌درخواست است. برآورد نمایشی فقط برای ضخامت‌های تعریف‌شده محاسبه می‌شود.",
            ),
          ),
        ]);
      body += window.SHN_TEMPLATES.render("as/10-application/config-15", [
        window.SHN_TEMPLATES.text(t("Surface finish", "پرداخت سطح")),
        window.SHN_TEMPLATES.text(opts(print ? finishes : laserFinishes, s.finish)),
        window.SHN_TEMPLATES.text(t("Advanced requirements", "نیازهای تخصصی")),
        window.SHN_TEMPLATES.text(
          print
            ? `<label class="field">${t("Use / strength requirement", "کاربرد / استحکام موردنیاز")}<select id="strength">${opts(
                [
                  ["LIGHT", "Visual prototype", " "],
                  ["STANDARD", "Everyday use", " "],
                  ["REINFORCED", "Higher load: engineering review", " :  "],
                ],
                s.strength,
              )}</select></label>`
            : "",
        ),
        window.SHN_TEMPLATES.text(
          t(
            "Fit, tolerance, orientation, engraving, or notes",
            "انطباق، تلرانس، جهت چاپ، حکاکی یا توضیحات",
          ),
        ),
        window.SHN_TEMPLATES.text(escape(s.notes)),
      ]);
    }
    if (step === 2)
      body += window.SHN_TEMPLATES.render("as/10-application/config-16", [
        window.SHN_TEMPLATES.text(t("Quantity", "تعداد")),
        window.SHN_TEMPLATES.text(s.qty),
        window.SHN_TEMPLATES.text(
          [1, 5, 10, 25, 50, 100, 250]
            .map(
              (n) =>
                `<button data-qty="${n}" class="${s.qty === n ? "selected" : ""}">${num(n)}</button>`,
            )
            .join(""),
        ),
        window.SHN_TEMPLATES.text(price(type)),
      ]);
    if (step === 3)
      body +=
        summary(s, type) +
        price(type) +
        `<button id="saveQuote" class="button primary full">${t("Save my quote", "ذخیرهٔ برآورد")}</button><button id="exportQuote" class="button ghost full">${t("Download engineering brief ↓", "دانلود شرح فنی درخواست ↓")}</button><p class="micro">${t("Saved locally; no order is submitted. Attach original files when sharing the brief.", "اطلاعات محلی ذخیره می‌شوند و سفارشی ارسال نمی‌شود. هنگام اشتراک‌گذاری، فایل‌های اصلی را پیوست کنید.")}</p>`;
    $("#configBody").innerHTML = body;
    $("#materialEstimate") && ($("#materialEstimate").innerHTML = materialEstimateCard(type));
    $("#prevStep").onclick = () => {
      step--;
      config(type);
    };
    $("#nextStep").onclick = () => {
      step++;
      config(type);
    };
    $$("[data-step]").forEach(
      (b) =>
        (b.onclick = () => {
          step = +b.dataset.step;
          config(type);
        }),
    );
    $$("[data-material]").forEach(
      (b) =>
        (b.onclick = () => {
          s.material = b.dataset.material;
          if (
            type === "laser" &&
            !PRICING_CONFIG.laser.materialRatesPerSquareMeter[s.material]?.[s.thickness]
          )
            s.thickness = "2";
          config(type);
          drawPreview(type);
        }),
    );
    $$("[data-color]").forEach(
      (b) =>
        (b.onclick = () => {
          s.color = b.dataset.color;
          config(type);
          drawPreview(type);
        }),
    );
    for (const key of ["quality", "finish", "strength"])
      $("#" + key)?.addEventListener("change", (e) => {
        s[key] = e.target.value;
      });
    bindSlicer(s, type);
    $("#notes")?.addEventListener("input", (e) => (s.notes = e.target.value));
    $("#thickness")?.addEventListener("change", (e) => {
      s.thickness = String(Math.max(0.01, +e.target.value || 0.01));
      config(type);
    });
    $$("[data-thickness]").forEach(
      (b) =>
        (b.onclick = () => {
          s.thickness = b.dataset.thickness;
          config(type);
        }),
    );
    $("#quantity")?.addEventListener("change", (e) => {
      s.qty = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(+e.target.value || 1)));
      config(type);
    });
    $$("[data-qty]").forEach(
      (b) =>
        (b.onclick = () => {
          s.qty = +b.dataset.qty;
          config(type);
        }),
    );
    $("#saveQuote")?.addEventListener("click", () => {
      drafts.push(quoteData(type));
      const ok = store.set("as-v2-quotes", drafts);
      toast(
        ok
          ? t("Quote saved on this device.", "برآورد در این دستگاه ذخیره شد.")
          : t(
              "Storage unavailable. Download your brief instead.",
              "ذخیره‌سازی در دسترس نیست. شرح درخواست را دانلود کنید.",
            ),
      );
    });
    $("#exportQuote")?.addEventListener("click", () =>
      downloadBrief(t("Manufacturing brief", "شرح درخواست ساخت"), quoteRows(type)),
    );
  }
  function discount(type, qty) {
    return (
      [...PRICING_CONFIG[type === "print" ? "printing" : "laser"].quantityDiscounts]
        .reverse()
        .find((x) => qty >= x.min)?.discount || 0
    );
  }
  /** estimatedMassGrams: application feature. Keep related handlers in this module. */
  function estimatedMassGrams(s) {
    if (!s?.analyzed || !Number.isFinite(s.volume) || s.volume <= 0) return null;
    const material = PRICING_CONFIG.printing.materials[s.material];
    if (!material) return null;
    const walls = Math.max(1, Number(s.walls) || 3),
      skins = Math.max(0, (Number(s.topLayers) || 0) + (Number(s.bottomLayers) || 0)),
      shell = Math.min(0.42, 0.12 + walls * 0.025 + skins * 0.003),
      infill = Math.max(0, Math.min(100, Number(s.density ?? 20))) / 100,
      effectiveSolid = shell + (1 - shell) * infill;
    return (s.volume / 1000) * material.density * effectiveSolid;
  }
  function estimate(type) {
    if (type !== "print") return null;
    const s = state.print,
      grams = estimatedMassGrams(s),
      rate = getMaterialRate(s.material);
    if (grams === null || rate === null) return null;
    const unit = grams * rate;
    return { unit, total: unit * s.qty, grams, rate };
  }
  /** price: application feature. Keep related handlers in this module. */
  function price(type) {
    const e = estimate(type),
      s = state[type];
    if (e)
      return window.SHN_TEMPLATES.render("as/10-application/price-17", [
        window.SHN_TEMPLATES.text(t("MATERIAL COST ESTIMATE", "برآورد هزینهٔ مواد")),
        window.SHN_TEMPLATES.text(money(e.total)),
        window.SHN_TEMPLATES.text(t("Estimated weight per part", "وزن تقریبی هر قطعه")),
        window.SHN_TEMPLATES.text(num(e.grams)),
        window.SHN_TEMPLATES.text(t("g", "گرم")),
        window.SHN_TEMPLATES.text(t("Material cost per part", "هزینهٔ مواد هر قطعه")),
        window.SHN_TEMPLATES.text(money(e.unit)),
        window.SHN_TEMPLATES.text(t("Material rate", "قیمت ماده")),
        window.SHN_TEMPLATES.text(money(e.rate)),
        window.SHN_TEMPLATES.text(t("g", "گرم")),
        window.SHN_TEMPLATES.text(t("Quantity", "تعداد")),
        window.SHN_TEMPLATES.text(num(s.qty)),
        window.SHN_TEMPLATES.text(
          t(
            "Approximate material cost only. Printing time, labor, supports, tax and shipping are not included.",
            "فقط هزینهٔ تقریبی مواد است. زمان چاپ، دستمزد، ساپورت، مالیات و ارسال در آن حساب نشده‌اند.",
          ),
        ),
      ]);
    return `<div class="tip"><strong>${t("Material estimate", "برآورد مواد")}</strong><p>${type === "print" && estimatedMassGrams(s) !== null ? t("Estimated weight is shown beside the preview. Enter the toman price per gram in the administrator page to calculate material cost.", "وزن تقریبی کنار پیش‌نمایش نمایش داده می‌شود. برای محاسبهٔ هزینهٔ مواد، قیمت هر گرم به تومان را در صفحهٔ مدیر وارد کنید.") : t("A price is shown after supported geometry and a toman material rate are available.", "قیمت پس از تحلیل هندسهٔ پشتیبانی‌شده و تعیین نرخ ماده به تومان نمایش داده می‌شود.")}</p></div>`;
  }
  /** materialEstimateCard: application feature. Keep related handlers in this module. */
  function materialEstimateCard(type) {
    if (type !== "print") return "";
    const s = state.print,
      grams = estimatedMassGrams(s);
    if (!s.uploaded) return "";
    if (grams === null)
      return `<section class="material-estimate" aria-live="polite"><strong>${t("Approximate material weight", "وزن تقریبی مواد")}</strong><p>${t("Weight will appear after the file geometry is analyzed.", "وزن پس از تحلیل هندسهٔ فایل نمایش داده می‌شود.")}</p></section>`;
    const rate = getMaterialRate(s.material),
      cost = rate === null ? null : grams * rate,
      pattern = selectedLabel(infills, s.infill || "gyroid");
    return window.SHN_TEMPLATES.render("as/10-application/materialEstimateCard-18", [
      window.SHN_TEMPLATES.text(t("ESTIMATED PART WEIGHT", "وزن تقریبی قطعه")),
      window.SHN_TEMPLATES.text(num(grams)),
      window.SHN_TEMPLATES.text(t("g", "گرم")),
      window.SHN_TEMPLATES.text(escape(pattern)),
      window.SHN_TEMPLATES.text(num(s.density ?? 20)),
      window.SHN_TEMPLATES.text(t("Material price per gram", "قیمت هر گرم ماده")),
      window.SHN_TEMPLATES.text(
        rate === null ? t("Not set yet", "هنوز تعیین نشده") : money(rate) + " / " + t("g", "گرم"),
      ),
      window.SHN_TEMPLATES.text(t("Estimated material cost", "هزینهٔ تقریبی مواد")),
      window.SHN_TEMPLATES.text(
        cost === null ? a("/account", t("Set the rate", "تعیین قیمت")) : money(cost),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Approximation from mesh volume, material density and print settings. Slicer output may differ, especially for supports and complex walls.",
          "برآورد بر اساس حجم مش، چگالی ماده و تنظیمات چاپ است. خروجی اسلایسر، به‌ویژه برای ساپورت و دیواره‌های پیچیده، ممکن است متفاوت باشد.",
        ),
      ),
    ]);
  }

  /** quoteRows: application feature. Keep related handlers in this module. */
  function quoteRows(type) {
    const s = state[type],
      e = estimate(type);
    return [
      [t("File", "فایل"), s.file],
      [
        t("Process", "روش ساخت"),
        type === "print" ? t("3D printing", "چاپ سه‌بعدی") : t("Laser cutting", "برش لیزری"),
      ],
      [t("Material", "جنس"), matName(s.material)],
      ...(type === "print"
        ? [
            [
              t("Estimated weight", "وزن تقریبی"),
              estimatedMassGrams(s) === null
                ? t("Unavailable", "در دسترس نیست")
                : num(estimatedMassGrams(s)) + " " + t("g", "گرم"),
            ],
            [
              t("Rate per gram", "قیمت هر گرم"),
              getMaterialRate(s.material) === null
                ? t("Not set", "تعیین نشده")
                : money(getMaterialRate(s.material)),
            ],
          ]
        : []),
      [t("Quantity", "تعداد"), num(s.qty)],
      [
        type === "print" ? t("Color", "رنگ") : t("Thickness", "ضخامت"),
        type === "print" ? colName(s.color) : num(+s.thickness) + " " + t("mm", "میلی‌متر"),
      ],
      ...slicerRows(s, type),
      [t("Finish", "پرداخت"), selectedLabel(type === "print" ? finishes : laserFinishes, s.finish)],
      [t("Notes", "توضیحات"), s.notes || t("None", "ندارد")],
      [t("Estimate", "برآورد"), e ? money(e.total) : t("Requires review", "نیازمند بررسی")],
      [t("Delivery", "تحویل"), t("Not yet confirmed", "هنوز تأیید نشده")],
    ];
  }
  function summary(s, type) {
    return `<dl class="summary-list">${quoteRows(type)
      .map(([k, v]) => `<dt>${k}</dt><dd>${escape(v)}</dd>`)
      .join("")}</dl>`;
  }
  function quoteData(type) {
    return {
      id: Date.now() + "-" + Math.random().toString(36).slice(2),
      type,
      file: state[type].file,
      date: new Date().toISOString(),
      state: { ...state[type], mesh: undefined, drawing: undefined, svg: undefined },
      rows: quoteRows(type),
    };
  }
  let view = { rx: -0.45, ry: 0.6, zoom: 1, x: 0, y: 0 },
    viewRequest = null,
    uploadVersion = 0;
  /** drawPreview: application feature. Keep related handlers in this module. */
  function drawPreview(type) {
    const c = $("#modelCanvas");
    if (!c) return;
    const s = state[type],
      fallback = $("#previewFallback");
    if (!s.uploaded) return;
    const has = !!(s.mesh || s.drawing);
    c.hidden = !has;
    fallback.hidden = has;
    if (!has) {
      fallback.innerHTML = s.svg
        ? `<img src="${s.svg}" alt="${t("Uploaded vector drawing", "نقشهٔ برداری بارگذاری‌شده")}"><p>${t("Visual preview; dimensions require review.", "پیش‌نمایش بصری؛ ابعاد باید بررسی شوند.")}</p>`
        : `<span class="upload-symbol">◇</span><h2>${t("File accepted.", "فایل پذیرفته شد.")}</h2><p>${t("Continue to prepare your request. This format needs an engineering preview.", "برای آماده‌کردن درخواست ادامه دهید. پیش‌نمایش این فرمت به بررسی مهندسی نیاز دارد.")}</p>`;
      return;
    }
    c.width = Math.max(1, c.clientWidth * devicePixelRatio);
    c.height = Math.max(1, c.clientHeight * devicePixelRatio);
    const ctx = c.getContext("2d"),
      w = c.width,
      h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + view.x * devicePixelRatio, h / 2 + view.y * devicePixelRatio);
    const dims = type === "print" ? s.dims : s.bounds,
      scale = ((Math.min(w, h) * 0.68) / Math.max(...dims, 1e-10)) * view.zoom;
    if (type === "laser") {
      ctx.strokeStyle = metals.find((m) => m.id === s.material)?.color || "#d8ef66";
      ctx.lineWidth = 1.4 * devicePixelRatio;
      const center = s.drawing.min.map((v, i) => (v + s.drawing.max[i]) / 2);
      ctx.rotate(view.ry);
      for (const points of s.drawing.paths) {
        ctx.beginPath();
        points.forEach((p, i) => {
          const x = (p[0] - center[0]) * scale,
            y = -(p[1] - center[1]) * scale;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
    } else {
      const mesh = s.mesh,
        center = mesh.center,
        project = (v) => {
          const [x, y, z] = v.map((x, i) => x - center[i]),
            a = x * Math.cos(view.ry) + z * Math.sin(view.ry),
            b = -x * Math.sin(view.ry) + z * Math.cos(view.ry);
          return [
            a,
            y * Math.cos(view.rx) - b * Math.sin(view.rx),
            y * Math.sin(view.rx) + b * Math.cos(view.rx),
          ];
        },
        stride = Math.max(1, Math.ceil(mesh.triangles.length / 15000)),
        faces = [];
      for (let i = 0; i < mesh.triangles.length; i += stride) {
        const pts = mesh.triangles[i].map(project);
        faces.push({ pts, z: pts.reduce((a, p) => a + p[2], 0) / 3 });
      }
      faces.sort((a, b) => a.z - b.z);
      const hex = colors.find((c) => c[0] === s.color)?.[1] || "#aab5ac",
        rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      for (const { pts } of faces) {
        const [a, b, d] = pts,
          u = b.map((x, i) => x - a[i]),
          v = d.map((x, i) => x - a[i]),
          n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]],
          shade =
            0.48 +
            0.52 * Math.abs((n[0] * 0.3 + n[1] * -0.5 + n[2] * 0.8) / (Math.hypot(...n) || 1));
        ctx.beginPath();
        pts.forEach((p, i) =>
          i ? ctx.lineTo(p[0] * scale, -p[1] * scale) : ctx.moveTo(p[0] * scale, -p[1] * scale),
        );
        ctx.closePath();
        ctx.fillStyle = `rgb(${rgb.map((v) => Math.round(v * shade)).join(",")})`;
        ctx.fill();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
    }
    ctx.restore();
    $("#dims").textContent = dims.map(num).join(" × ") + " " + t("mm", "میلی‌متر");
  }
  /** setupPreview: application feature. Keep related handlers in this module. */
  function setupPreview(type) {
    const c = $("#modelCanvas");
    let drag = null,
      frame = 0;
    const request = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          drawPreview(type);
        });
    };
    viewRequest = request;
    c.onpointerdown = (e) => {
      drag = [e.clientX, e.clientY];
      c.setPointerCapture(e.pointerId);
    };
    c.onpointerup = c.onpointercancel = () => (drag = null);
    c.onpointermove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag[0],
        dy = e.clientY - drag[1];
      if (e.shiftKey || type === "laser") {
        view.x += dx;
        view.y += dy;
      } else {
        view.ry += dx * 0.01;
        view.rx += dy * 0.01;
      }
      drag = [e.clientX, e.clientY];
      request();
    };
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        view.zoom = Math.max(0.001, Math.min(10000, view.zoom * Math.exp(-e.deltaY * 0.001)));
        request();
      },
      { passive: false },
    );
    c.onkeydown = (e) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "+", "-", "="].includes(e.key))
        return;
      e.preventDefault();
      if (e.key === "+" || e.key === "=") view.zoom *= 1.15;
      else if (e.key === "-") view.zoom /= 1.15;
      else if (type === "laser" || e.shiftKey) {
        view.x += e.key === "ArrowLeft" ? -15 : e.key === "ArrowRight" ? 15 : 0;
        view.y += e.key === "ArrowUp" ? -15 : e.key === "ArrowDown" ? 15 : 0;
      } else {
        view.ry += e.key === "ArrowLeft" ? -0.1 : e.key === "ArrowRight" ? 0.1 : 0;
        view.rx += e.key === "ArrowUp" ? -0.1 : e.key === "ArrowDown" ? 0.1 : 0;
      }
      request();
    };
    $$("[data-camera]").forEach(
      (b) =>
        (b.onclick = () => {
          const v = b.dataset.camera;
          if (v === "reset") {
            view = {
              rx: type === "print" ? -0.45 : 0,
              ry: type === "print" ? 0.6 : 0,
              zoom: 1,
              x: 0,
              y: 0,
            };
          }
          if (v === "front") {
            view.rx = 0;
            view.ry = 0;
          }
          if (v === "top") {
            view.rx = type === "print" ? Math.PI / 2 : 0;
            view.ry = 0;
          }
          if (v === "iso") {
            view.rx = -0.45;
            view.ry = 0.6;
          }
          if (v === "in") view.zoom *= 1.2;
          if (v === "out") view.zoom /= 1.2;
          request();
        }),
    );
    const ro = new ResizeObserver(request);
    ro.observe(c);
    request();
    dispose = () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      viewRequest = null;
      if (currentFileWorker) {
        currentFileWorker.terminate();
        currentFileWorker = null;
        uploadVersion++;
      }
    };
  }
  /** upload: application feature. Keep related handlers in this module. */
  async function upload(type, file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase(),
      allowed =
        type === "print" ? ["stl", "obj", "step", "stp", "3mf"] : ["dxf", "svg", "pdf", "ai"];
    if (!allowed.includes(ext) || !file.size) {
      toast(t("Choose a valid manufacturing file.", "یک فایل معتبر برای ساخت انتخاب کنید."));
      return;
    }
    currentFileWorker?.terminate();
    const version = ++uploadVersion,
      s = state[type];
    $("#loading").hidden = false;
    const next = {
      ...s,
      file: file.name,
      uploaded: true,
      analyzed: false,
      mesh: null,
      drawing: null,
      svg: null,
      reviewNeeded: false,
    };
    try {
      if (["dxf", "stl", "obj"].includes(ext)) {
        const url = URL.createObjectURL(
            new Blob([AS_WORKER_SOURCE], { type: "application/javascript" }),
          ),
          worker = new Worker(url);
        URL.revokeObjectURL(url);
        currentFileWorker = worker;
        const result = await new Promise((resolve, reject) => {
          worker.onmessage = (e) =>
            e.data.ok ? resolve(e.data.result) : reject(Error(e.data.error));
          worker.onerror = () => reject(Error("PARSE"));
          worker.postMessage({ file, ext });
        });
        worker.terminate();
        currentFileWorker = null;
        if (version !== uploadVersion) return;
        if (ext === "dxf") {
          next.drawing = result;
          next.bounds = result.bounds;
          next.length = result.length;
          next.pierces = result.pierces;
          next.unit = "auto";
          next.reviewNeeded = result.ignored.some(
            (x) => !["TEXT", "MTEXT", "DIMENSION", "ATTDEF", "POINT"].includes(x),
          );
          next.analyzed = !next.reviewNeeded;
        } else {
          next.mesh = result;
          next.dims = result.dims;
          next.volume = result.volume;
          next.analyzed = true;
        }
      } else if (ext === "svg") next.svg = URL.createObjectURL(file);
    } catch {
      currentFileWorker?.terminate();
      currentFileWorker = null;
      next.reviewNeeded = true;
      next.analyzed = false;
    }
    if (version !== uploadVersion) return;
    if (s.svg) URL.revokeObjectURL(s.svg);
    Object.assign(s, next);
    view = {
      rx: type === "print" ? -0.45 : 0,
      ry: type === "print" ? 0.6 : 0,
      zoom: 1,
      x: 0,
      y: 0,
    };
    $("#loading").hidden = true;
    $("#fileName").textContent = file.name;
    $("#fileStatus").textContent = s.drawing
      ? t(
          "Drawing loaded. Curves are tessellated for display; verify contours and units before manufacture.",
          "نقشه بارگذاری شد. منحنی‌ها برای نمایش به قطعات خطی تبدیل شده‌اند؛ پیش از ساخت، مسیرها و واحدها را بررسی کنید.",
        ) +
        (s.drawing.ignored.length
          ? " " +
            t(
              "Some annotations or unsupported entities are omitted from the preview.",
              "برخی یادداشت‌ها یا اجزای پشتیبانی‌نشده در پیش‌نمایش نمایش داده نمی‌شوند.",
            )
          : "")
      : s.mesh
        ? t(
            "Actual mesh preview. Millimeter units assumed; closed-volume validity is not certified.",
            "پیش‌نمایش مش واقعی. واحد میلی‌متر فرض شده است؛ بسته‌بودن حجم تأیید نشده است.",
          )
        : t(
            "File accepted for review. Continue with material and quantity; no geometry or price is invented.",
            "فایل برای بررسی پذیرفته شد. جنس و تعداد را انتخاب کنید؛ هندسه یا قیمت فرضی تولید نمی‌شود.",
          );
    step = 1;
    config(type);
    drawPreview(type);
  }
  /** bindWorkspace: application feature. Keep related handlers in this module. */
  function bindWorkspace(type) {
    config(type);
    setupPreview(type);
    $("#fileInput").onchange = (e) => upload(type, e.target.files[0]);
    $("#chooseFile").onclick = () => $("#fileInput").click();
    const drop = $("#dropZone");
    drop.ondragover = (e) => {
      e.preventDefault();
      drop.classList.add("drag");
    };
    drop.ondragleave = () => drop.classList.remove("drag");
    drop.ondrop = (e) => {
      e.preventDefault();
      drop.classList.remove("drag");
      upload(type, e.dataTransfer.files[0]);
    };
    $("#cancelFile").onclick = () => {
      uploadVersion++;
      currentFileWorker?.terminate();
      currentFileWorker = null;
      $("#loading").hidden = true;
      toast(t("File processing cancelled.", "پردازش فایل لغو شد."));
    };
    $("#drawingUnit")?.addEventListener("change", (e) => {
      const s = state.laser;
      if (!s.drawing) return;
      const d = s.drawing,
        target =
          e.target.value === "auto" ? d.unitScale : { mm: 1, cm: 10, inch: 25.4 }[e.target.value],
        factor = target / (d.appliedScale || d.unitScale);
      for (const p of d.paths)
        for (const v of p) {
          v[0] *= factor;
          v[1] *= factor;
        }
      d.min = d.min.map((v) => v * factor);
      d.max = d.max.map((v) => v * factor);
      d.bounds = d.bounds.map((v) => v * factor);
      d.length *= factor;
      d.appliedScale = target;
      s.bounds = d.bounds;
      s.length = d.length;
      s.unit = e.target.value;
      drawPreview(type);
      config(type);
    });
    if (state[type].uploaded) {
      $("#previewFallback").hidden = true;
      drawPreview(type);
    }
  }
  function categoryName(id) {
    return {
      all: t("All products", "همهٔ محصولات"),
      workspace: t("Workspace", "محیط کار"),
      pet: t("Pets", "حیوانات"),
      materials: t("Materials", "مواد و متریال"),
      machine: t("Machines", "دستگاه‌ها"),
    }[id];
  }
  /** card: application feature. Keep related handlers in this module. */
  function card(p) {
    return `<article class="product-card">${a("/" + (p.category === "machine" ? "machines" : "shop") + "/" + p.id, `<div class="product-image">${image(p.img, tx(p.name))}<span>↗</span></div><small>${categoryName(p.category)}</small><h3>${tx(p.name)}</h3>`)}<div class="product-bottom"><span>${t("Price on enquiry", "قیمت پس از بررسی درخواست")}</span><button data-add="${p.id}" aria-label="${t("Add to enquiry basket", "افزودن به سبد درخواست")} ${tx(p.name)}">＋</button></div></article>`;
  }
  /** shop: application feature. Keep related handlers in this module. */
  function shop(machines = false) {
    if (!machines) return comingSoon();
    const items = catalog.filter((p) => (p.category === "machine") === machines);
    return (
      intro(
        machines ? t("Machines", "دستگاه‌ها") : t("Shop", "فروشگاه"),
        machines
          ? t("Tools for the next<br>thing you make.", "ابزارهایی برای<br>ساخت ایدهٔ بعدی شما.")
          : t("Small details.<br>A better everyday.", "جزئیات کوچک.<br>زندگی روزمرهٔ بهتر."),
        t(
          "Explore the concept collection, choose a color, and prepare a purchase enquiry. Pricing and availability are confirmed before payment.",
          "مجموعهٔ طرح‌ها را ببینید، رنگ انتخاب کنید و درخواست خرید آماده کنید. قیمت و موجودی پیش از پرداخت تأیید می‌شوند.",
        ),
      ) +
      window.SHN_TEMPLATES.render("as/10-application/shop-19", [
        window.SHN_TEMPLATES.text(t("Categories", "دسته‌بندی‌ها")),
        window.SHN_TEMPLATES.text(
          (machines ? ["all"] : ["all", "workspace", "pet", "materials"])
            .map(
              (c) =>
                `<button data-filter="${c}" class="${c === "all" ? "selected" : ""}">${categoryName(c)}</button>`,
            )
            .join(""),
        ),
        window.SHN_TEMPLATES.text(t("Search products", "جست‌وجوی محصولات")),
        window.SHN_TEMPLATES.text(t("Find a product…", "جست‌وجوی محصول…")),
        window.SHN_TEMPLATES.text(items.map(card).join("")),
        window.SHN_TEMPLATES.text(
          t(
            "No matching products. Try another search.",
            "محصولی پیدا نشد. عبارت دیگری جست‌وجو کنید.",
          ),
        ),
        window.SHN_TEMPLATES.text(
          machines
            ? window.SHN_TEMPLATES.render("as/10-application/shop-20", [
                window.SHN_TEMPLATES.text(
                  t("Already have a machine that needs help?", "دستگاهتان به تعمیر نیاز دارد؟"),
                ),
                window.SHN_TEMPLATES.text(
                  a("/repair", t("Request a repair ↗", "درخواست تعمیر ↗"), "button primary"),
                ),
                window.SHN_TEMPLATES.text(t("Compare the process", "مقایسهٔ روش ساخت")),
                window.SHN_TEMPLATES.text(t("Machine", "دستگاه")),
                window.SHN_TEMPLATES.text(t("Starting point", "کاربرد اولیه")),
                window.SHN_TEMPLATES.text(t("Before purchase", "پیش از خرید")),
                window.SHN_TEMPLATES.text(t("Filament printer", "چاپگر فیلامنتی")),
                window.SHN_TEMPLATES.text(
                  t("Functional plastic prototypes", "نمونه‌های پلاستیکی کاربردی"),
                ),
                window.SHN_TEMPLATES.text(
                  t("Build volume, materials, support", "ابعاد قابل‌چاپ، مواد و پشتیبانی"),
                ),
                window.SHN_TEMPLATES.text(t("Resin printer", "چاپگر رزینی")),
                window.SHN_TEMPLATES.text(
                  t("Small detailed models", "مدل‌های کوچک با جزئیات دقیق"),
                ),
                window.SHN_TEMPLATES.text(
                  t("Process, post-curing, consumables", "روش چاپ، پخت نهایی و مواد مصرفی"),
                ),
              ])
            : "",
        ),
      ])
    );
  }
  /** product: application feature. Keep related handlers in this module. */
  function product(id) {
    const p = catalog.find((p) => p.id === id);
    if (!p) return about();
    productColor = "graphite";
    return window.SHN_TEMPLATES.render("as/10-application/product-21", [
      window.SHN_TEMPLATES.text(
        a(
          p.category === "machine" ? "/machines" : "/shop",
          t("← Back to collection", "← بازگشت به مجموعه"),
          "back-link",
        ),
      ),
      window.SHN_TEMPLATES.text(image(p.img, tx(p.name), "", false)),
      window.SHN_TEMPLATES.text(
        t(
          "Concept image; final specifications are confirmed before purchase.",
          "تصویر مفهومی؛ مشخصات نهایی پیش از خرید تأیید می‌شوند.",
        ),
      ),
      window.SHN_TEMPLATES.text(categoryName(p.category)),
      window.SHN_TEMPLATES.text(tx(p.name)),
      window.SHN_TEMPLATES.text(
        t(
          "A considered object for your setup. Choose the appearance you prefer, then add it to your enquiry basket.",
          "محصولی برای فضای شما. ظاهر دلخواهتان را انتخاب کنید و به سبد درخواست اضافه کنید.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Preferred color", "رنگ دلخواه")),
      window.SHN_TEMPLATES.text(colName(productColor)),
      window.SHN_TEMPLATES.text(palette(productColor, "product")),
      window.SHN_TEMPLATES.text(
        t(
          "Color selection is a preference, not a stock guarantee. The photograph does not change the product specification.",
          "انتخاب رنگ بیانگر سلیقهٔ شماست و موجودی آن باید تأیید شود. تغییر عکس، مشخصات محصول را تغییر نمی‌دهد.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Quantity", "تعداد")),
      window.SHN_TEMPLATES.text(p.id),
      window.SHN_TEMPLATES.text(t("Add to purchase enquiry", "افزودن به درخواست خرید")),
      window.SHN_TEMPLATES.text(t("Price", "قیمت")),
      window.SHN_TEMPLATES.text(t("Requires confirmation", "نیازمند تأیید")),
      window.SHN_TEMPLATES.text(t("Dimensions / material", "ابعاد / جنس")),
      window.SHN_TEMPLATES.text(t("Final specification pending", "مشخصات نهایی هنوز تأیید نشده")),
      window.SHN_TEMPLATES.text(t("Delivery", "تحویل")),
      window.SHN_TEMPLATES.text(t("Confirmed before purchase", "پیش از خرید تأیید می‌شود")),
    ]);
  }
  /** addToCart: application feature. Keep related handlers in this module. */
  function addToCart(id, color = "graphite", qty = 1) {
    const p = catalog.find((p) => p.id === id);
    if (!p) return;
    const existing = basket.find((x) => x.id === id && x.color === color);
    if (existing) existing.qty += qty;
    else basket.push({ id, color, qty });
    store.set("as-v2-basket", basket);
    $("#cartCount").textContent = num(basket.reduce((n, x) => n + x.qty, 0));
    toast(t("Added to your enquiry basket.", "به سبد درخواست شما اضافه شد."));
  }
  /** cart: application feature. Keep related handlers in this module. */
  function cart() {
    return (
      intro(
        t("Your basket", "سبد درخواست شما"),
        t("One step closer<br>to making it yours.", "یک قدم نزدیک‌تر<br>به انتخاب شما."),
        t(
          "This is a purchase enquiry. It does not charge you or submit an order automatically.",
          "این یک درخواست خرید است. پرداخت یا ثبت سفارش خودکار انجام نمی‌شود.",
        ),
      ) +
      `<section class="wrap section compact">${
        basket.length
          ? `<div class="cart-items">${basket
              .map((x, i) => {
                const p = catalog.find((p) => p.id === x.id);
                return window.SHN_TEMPLATES.render("as/10-application/cart-22", [
                  window.SHN_TEMPLATES.text(image(p.img, tx(p.name))),
                  window.SHN_TEMPLATES.text(tx(p.name)),
                  window.SHN_TEMPLATES.text(colName(x.color)),
                  window.SHN_TEMPLATES.text(t("Price on enquiry", "قیمت پس از بررسی درخواست")),
                  window.SHN_TEMPLATES.text(t("Quantity", "تعداد")),
                  window.SHN_TEMPLATES.text(i),
                  window.SHN_TEMPLATES.text(x.qty),
                  window.SHN_TEMPLATES.text(i),
                  window.SHN_TEMPLATES.text(t("Remove", "حذف")),
                ]);
              })
              .join(
                "",
              )}</div><div class="cart-total"><p>${t("Final total and delivery are confirmed after availability review.", "مبلغ نهایی و زمان تحویل پس از بررسی موجودی تأیید می‌شوند.")}</p><button class="button primary" id="cartDownload">${t("Download purchase enquiry ↓", "دانلود درخواست خرید ↓")}</button></div>`
          : `<div class="empty"><h2>${t("Your basket is empty.", "سبد درخواست شما خالی است.")}</h2>${a("/shop", t("Explore products ↗", "دیدن محصولات ↗"), "button primary")}</div>`
      }</section>`
    );
  }
  /** quotes: application feature. Keep related handlers in this module. */
  function quotes() {
    return (
      intro(
        t("Saved quotes", "برآوردهای ذخیره‌شده"),
        t("Your projects,<br>ready for the next step.", "پروژه‌های شما،<br>آمادهٔ قدم بعدی."),
        t(
          "Saved on this device. These are drafts, not submitted orders.",
          "در این دستگاه ذخیره شده‌اند؛ پیش‌نویس‌اند و به‌عنوان سفارش ارسال نشده‌اند.",
        ),
      ) +
      `<section class="wrap section compact">${drafts.length ? drafts.map((d, i) => window.SHN_TEMPLATES.render("as/10-application/quotes-23", [window.SHN_TEMPLATES.text(d.type === "print" ? t("3D printing", "چاپ سه‌بعدی") : t("Laser cutting", "برش لیزری")), window.SHN_TEMPLATES.text(escape(d.file)), window.SHN_TEMPLATES.text(matName(d.state.material)), window.SHN_TEMPLATES.text(num(d.state.qty)), window.SHN_TEMPLATES.text(t("units", "عدد")), window.SHN_TEMPLATES.text(i), window.SHN_TEMPLATES.text(t("Download", "دانلود")), window.SHN_TEMPLATES.text(i), window.SHN_TEMPLATES.text(t("Remove", "حذف"))])).join("") : `<div class="empty"><h2>${t("No saved quotes yet.", "هنوز برآوردی ذخیره نشده است.")}</h2>${a("/services", t("Start a part ↗", "شروع ساخت قطعه ↗"), "button primary")}</div>`}</section>`
    );
  }
  const formDefinitions = window.SHN_DATA.get("as/10-application/formDefinitions-5");
  /** field: application feature. Keep related handlers in this module. */
  function field(key, en, fa, type = "text", required = false) {
    return `<label class="field">${t(en, fa)}${required ? " *" : ""}${type === "textarea" ? `<textarea name="${key}" ${required ? "required" : ""}></textarea>` : `<input name="${key}" type="${type}" ${required ? "required" : ""} ${type === "number" ? 'min="1" step="1"' : ""}>`}</label>`;
  }
  /** intake: application feature. Keep related handlers in this module. */
  function intake(kind) {
    const f = formDefinitions[kind];
    return (
      intro(t("Project brief", "شرح پروژه"), tx(f.title), tx(f.description)) +
      window.SHN_TEMPLATES.render("as/10-application/intake-24", [
        window.SHN_TEMPLATES.text(t("Three simple steps", "سه مرحلهٔ ساده")),
        window.SHN_TEMPLATES.text(t("Introduce the project", "معرفی پروژه")),
        window.SHN_TEMPLATES.text(t("Add requirements", "ثبت نیازها")),
        window.SHN_TEMPLATES.text(t("Review and download", "بازبینی و دانلود")),
        window.SHN_TEMPLATES.text(
          t(
            "The brief stays on your device. Nothing is submitted automatically.",
            "شرح پروژه در دستگاه شما می‌ماند. چیزی خودکار ارسال نمی‌شود.",
          ),
        ),
        window.SHN_TEMPLATES.text(kind),
        window.SHN_TEMPLATES.text(t("First, a little context.", "اول، کمی دربارهٔ پروژه بگویید.")),
        window.SHN_TEMPLATES.text(field("name", "Your name", " ", "text", true)),
        window.SHN_TEMPLATES.text(field("email", "Email", "", "email", true)),
        window.SHN_TEMPLATES.text(
          f.fields
            .slice(0, Math.ceil(f.fields.length / 2))
            .map((x) => field(...x))
            .join(""),
        ),
        window.SHN_TEMPLATES.text(t("Continue →", "ادامه →")),
        window.SHN_TEMPLATES.text(t("Now, the requirements.", "حالا، نیازهای پروژه را مشخص کنید.")),
        window.SHN_TEMPLATES.text(
          f.fields
            .slice(Math.ceil(f.fields.length / 2))
            .map((x) => field(...x))
            .join(""),
        ),
        window.SHN_TEMPLATES.text(field("deadline", "Target date", " ", "date")),
        window.SHN_TEMPLATES.text(
          t("Attach CAD, sketches, photos or video", "پیوست فایل CAD، طرح، عکس یا ویدئو"),
        ),
        window.SHN_TEMPLATES.text(
          t(
            "Discuss confidentiality / NDA before sharing more.",
            "پیش از ارسال اطلاعات بیشتر، دربارهٔ محرمانگی یا توافق‌نامهٔ آن گفت‌وگو کنید.",
          ),
        ),
        window.SHN_TEMPLATES.text(t("Back", "بازگشت")),
        window.SHN_TEMPLATES.text(t("Review →", "بازبینی →")),
        window.SHN_TEMPLATES.text(
          t("Ready for a useful conversation.", "آمادهٔ گفت‌وگو دربارهٔ پروژه."),
        ),
        window.SHN_TEMPLATES.text(
          t(
            "The download lists attachment names. Share the original files separately. No appointment or order has been booked.",
            "فایل دانلودی نام پیوست‌ها را ثبت می‌کند. فایل‌های اصلی را جداگانه بفرستید. جلسه یا سفارشی ثبت نشده است.",
          ),
        ),
        window.SHN_TEMPLATES.text(t("Back", "بازگشت")),
        window.SHN_TEMPLATES.text(t("Download brief ↓", "دانلود شرح پروژه ↓")),
      ])
    );
  }
  /** bindIntake: application feature. Keep related handlers in this module. */
  function bindIntake() {
    const form = $("#briefForm"),
      f = formDefinitions[form.dataset.kind];
    let formStep = 0;
    const labels = Object.fromEntries([
      ["name", t("Name", "نام")],
      ["email", t("Email", "ایمیل")],
      ["deadline", t("Target date", "تاریخ موردنظر")],
      ["attachments", t("Attachments", "پیوست‌ها")],
      ["nda", t("Confidentiality request", "درخواست محرمانگی")],
      ...f.fields.map((x) => [x[0], t(x[1], x[2])]),
    ]);
    const rows = () =>
      [...new FormData(form)]
        .filter(([k, v]) => !(v instanceof File) || v.name)
        .map(([k, v]) => [
          labels[k],
          v instanceof File
            ? v.name
            : k === "nda"
              ? t("Yes", "بله")
              : String(v) || t("Not specified", "مشخص نشده"),
        ]);
    const show = (n) => {
      formStep = n;
      $$("[data-form-step]").forEach((el) => (el.hidden = +el.dataset.formStep !== n));
      if (n === 2)
        $("#briefReview").innerHTML = `<dl class="summary-list">${rows()
          .map(([k, v]) => `<dt>${k}</dt><dd>${escape(v)}</dd>`)
          .join("")}</dl>`;
      form.scrollIntoView({ block: "start", behavior: "instant" });
    };
    $$("[data-form-next]").forEach(
      (b) =>
        (b.onclick = () => {
          const invalid = $$("input,textarea,select", $(`[data-form-step="${formStep}"]`)).find(
            (e) => !e.checkValidity(),
          );
          if (invalid) {
            invalid.reportValidity();
            return;
          }
          show(+b.dataset.formNext);
        }),
    );
    $$("[data-form-back]").forEach((b) => (b.onclick = () => show(+b.dataset.formBack)));
    form.onsubmit = (e) => {
      e.preventDefault();
      downloadBrief(t("Project brief", "شرح پروژه"), rows());
      toast(t("Brief downloaded; not submitted.", "شرح پروژه دانلود شد؛ ارسال نشده است."));
    };
  }
  /** designPage: application feature. Keep related handlers in this module. */
  function designPage() {
    return (
      intro(
        t("Product design", "طراحی محصول"),
        t("From “what if”<br>to “here it is”.", "از «می‌شود ساخت؟»<br>تا «ساخته شد»."),
        t(
          "Concept, engineering, prototype and manufacturing preparation. Start from a sketch or a problem.",
          "ایده‌پردازی، طراحی مهندسی، نمونه‌سازی و آماده‌سازی تولید. با یک طرح اولیه یا یک مسئله شروع کنید.",
        ),
      ) +
      `<section class="wrap design-page">${image("catalogue-group", t("Industrial product concepts", "ایده‌های محصولات صنعتی"))}<div><h2>${t("Think through every detail.", "همهٔ جزئیات را در نظر بگیرید.")}</h2><div class="service-chips">${[
        ["Industrial design", "طراحی صنعتی"],
        ["Mechanical design", "طراحی مکانیکی"],
        ["CAD modeling", "مدل‌سازی CAD"],
        ["DFM review", "بررسی طراحی برای تولید"],
        ["Reverse engineering", "مهندسی معکوس"],
        ["Prototype development", "توسعهٔ نمونهٔ اولیه"],
      ]
        .map(tx)
        .map((x) => `<span>${x}</span>`)
        .join(
          "",
        )}</div>${a("/engineering/start", t("Start my project ↗", "شروع پروژهٔ من ↗"), "button primary")}${a("/consultation", t("Request a consultation", "درخواست مشاوره"), "button ghost")}</div></section>`
    );
  }
  /** learn: application feature. Keep related handlers in this module. */
  function learn() {
    return (
      intro(
        t("Material studio", "راهنمای انتخاب مواد"),
        t(
          "Compare. Explore.<br>Choose with confidence.",
          "بررسی و مقایسه کنید.<br>آگاهانه انتخاب کنید.",
        ),
        t(
          "Put materials next to each other. See what changes with color, process and sheet thickness.",
          "مواد را کنار هم مقایسه کنید و تأثیر رنگ، روش ساخت و ضخامت ورق را ببینید.",
        ),
      ) +
      window.SHN_TEMPLATES.render("as/10-application/learn-25", [
        window.SHN_TEMPLATES.text(
          [
            ["polymers", "Filaments", ""],
            ["metals", "Metals", ""],
            ["thickness", "Thickness & 3D", "   "],
          ]
            .map(
              (x, i) =>
                `<button role="tab" aria-selected="${i === 0}" aria-controls="learn-${x[0]}" id="tab-${x[0]}" data-learn-tab="${x[0]}" class="${i === 0 ? "selected" : ""}">${t(x[1], x[2])}</button>`,
            )
            .join(""),
        ),
        window.SHN_TEMPLATES.text(
          image(
            "polymer-filaments",
            t("Filament and printed part samples", "نمونهٔ فیلامنت و قطعات چاپ‌شده"),
          ),
        ),
        window.SHN_TEMPLATES.text(
          t(
            "Choose for the job.<br>Not just the color.",
            "جنس مناسب کاربرد را انتخاب کنید،<br>در کنار رنگ دلخواهتان.",
          ),
        ),
        window.SHN_TEMPLATES.text(
          t(
            "Select up to three materials to compare. These are general starting points, not certified properties for a named grade.",
            "حداکثر سه ماده را انتخاب کنید. این اطلاعات برای مقایسهٔ اولیه‌اند؛ مشخصات تأییدشدهٔ یک گرید معین نیستند.",
          ),
        ),
        window.SHN_TEMPLATES.text(
          materials
            .map(
              (m) =>
                `<button data-compare-material="${m.id}" class="${compare.includes(m.id) ? "selected" : ""}" aria-pressed="${compare.includes(m.id)}">${tx(m.name)}</button>`,
            )
            .join(""),
        ),
        window.SHN_TEMPLATES.text(
          image(
            "material-samples",
            t("Aluminum, brass, copper and steel samples", "نمونه‌های آلومینیوم، برنج، مس و فولاد"),
          ),
        ),
        window.SHN_TEMPLATES.text(
          t("The same part.<br>A different material.", "همان قطعه.<br>با جنسی دیگر."),
        ),
        window.SHN_TEMPLATES.text(
          t(
            "Alloy, temper, environment and finish can change the decision. Compare the material families first, then define the exact grade.",
            "آلیاژ، عملیات حرارتی، محیط و پرداخت بر انتخاب اثر دارند. ابتدا خانوادهٔ مواد را مقایسه کنید و سپس گرید دقیق را مشخص کنید.",
          ),
        ),
        window.SHN_TEMPLATES.text(
          metals
            .map(
              (m) =>
                `<button data-compare-metal="${m.id}" class="${metalCompare.includes(m.id) ? "selected" : ""}" aria-pressed="${metalCompare.includes(m.id)}">${tx(m.name)}</button>`,
            )
            .join(""),
        ),
        window.SHN_TEMPLATES.text(
          t("A millimeter<br>makes a difference.", "یک میلی‌متر هم<br>تفاوت ایجاد می‌کند."),
        ),
        window.SHN_TEMPLATES.text(
          t(
            "Compare two sheets with the same face area. This illustrates geometry, not strength or a machine’s cutting capability.",
            "دو ورق با سطح یکسان را مقایسه کنید. این نمایش فقط تفاوت هندسی را نشان می‌دهد؛ استحکام یا توان برش دستگاه را محاسبه نمی‌کند.",
          ),
        ),
        window.SHN_TEMPLATES.text(t("First sheet", "ورق اول")),
        window.SHN_TEMPLATES.text(t("Second sheet", "ورق دوم")),
        window.SHN_TEMPLATES.text(t("Sheet section comparison", "مقایسهٔ مقطع ورق‌ها")),
        window.SHN_TEMPLATES.text(t("First sheet", "ورق اول")),
        window.SHN_TEMPLATES.text(t("Second sheet", "ورق دوم")),
        window.SHN_TEMPLATES.text(t("Schematic / common face area", "نمای شماتیک / سطح یکسان")),
        window.SHN_TEMPLATES.text(t("Rotatable illustrative assembly", "مدل آموزشی قابل‌چرخش")),
        window.SHN_TEMPLATES.text(t("See it from every side.", "از همهٔ زاویه‌ها ببینید.")),
        window.SHN_TEMPLATES.text(
          t(
            "Drag the assembly to rotate. Switch the material appearance or open the assembly. This model is educational, not a product specification.",
            "برای چرخاندن مونتاژ بکشید. ظاهر ماده را تغییر دهید یا اجزای مونتاژ را باز کنید. این مدل آموزشی است و مشخصات محصول نیست.",
          ),
        ),
        window.SHN_TEMPLATES.text(
          metals
            .map(
              (m) =>
                `<button data-scene-metal="${m.id}" style="--sample:${m.color}"><i></i>${tx(m.name)}</button>`,
            )
            .join(""),
        ),
        window.SHN_TEMPLATES.text(t("Assembly / exploded view", "مونتاژ / نمای بازشده")),
        window.SHN_TEMPLATES.text(
          [
            ["front", "Front", ""],
            ["side", "Side", ""],
            ["top", "Top", ""],
          ]
            .map((x, i) => `<button data-scene-view="${i}">${t(x[1], x[2])}</button>`)
            .join(""),
        ),
        window.SHN_TEMPLATES.text(t("Reference reading:", "مطالعهٔ بیشتر:")),
        window.SHN_TEMPLATES.text(t("Prusa material guides", "راهنمای مواد Prusa")),
        window.SHN_TEMPLATES.text(t("Manufacturing material overview", "آشنایی با مواد ساخت")),
        window.SHN_TEMPLATES.text(t("Understand the process", "شناخت فرایند ساخت")),
        window.SHN_TEMPLATES.text(
          [
            ["print", "3D printing", " ", "/learn/3d-printing"],
            ["laser", "Laser cutting", " ", "/learn/laser-cutting"],
            ["cnc", "CNC machining", "", "/learn/cnc"],
          ]
            .map((x) =>
              a(
                x[3],
                `<small>${t("STEP BY STEP", "مرحله به مرحله")}</small><h3>${t(x[1], x[2])} ↗</h3>`,
              ),
            )
            .join(""),
        ),
      ])
    );
  }
  /** comparisonTable: application feature. Keep related handlers in this module. */
  function comparisonTable(ids, list, rows) {
    const selected = ids.map((id) => list.find((m) => m.id === id));
    if (!selected.length)
      return `<p class="tip">${t("Select materials to compare.", "مواد موردنظر را برای مقایسه انتخاب کنید.")}</p>`;
    return `<div class="table-wrap"><table><thead><tr><th>${t("Compare", "مقایسه")}</th>${selected.map((m) => `<th>${tx(m.name)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, key]) => `<tr><th>${label}</th>${selected.map((m) => `<td>${tx(m[key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  /** updateTables: application feature. Keep related handlers in this module. */
  function updateTables() {
    if ($("#polymerTable"))
      $("#polymerTable").innerHTML = comparisonTable(compare, materials, [
        [t("Typical use", "کاربرد معمول"), "use"],
        [t("Flexibility", "انعطاف‌پذیری"), "flex"],
        [t("Outdoor exposure", "استفاده در فضای باز"), "outdoor"],
        [t("Process needs", "نیازهای فرایند"), "process"],
        [t("What to verify", "موارد نیازمند بررسی"), "watch"],
      ]);
    if ($("#metalTable"))
      $("#metalTable").innerHTML = comparisonTable(metalCompare, metals, [
        [t("Typical use", "کاربرد معمول"), "use"],
        [t("Grade and requirements", "گرید و الزامات"), "detail"],
        [t("Finishing options", "گزینه‌های پرداخت"), "finish"],
      ]);
  }
  /** bindLearn: application feature. Keep related handlers in this module. */
  function bindLearn() {
    updateTables();
    let labScene = null;
    $$("[data-learn-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          $$("[data-learn-tab]").forEach((x) => {
            x.classList.toggle("selected", x === b);
            x.setAttribute("aria-selected", String(x === b));
          });
          $$("[role=tabpanel]").forEach((x) => (x.hidden = x.id !== "learn-" + b.dataset.learnTab));
          if (b.dataset.learnTab === "thickness" && !labScene) {
            labScene = ASScene($("#material3d"), { drag: true });
            if (!labScene)
              $("#material3d").innerHTML = window.embedAssets
                ? window.embedAssets(
                    image("material-samples", t("Metal samples", "نمونه‌های فلزی")),
                  )
                : image("material-samples", t("Metal samples", "نمونه‌های فلزی"));
          }
        }),
    );
    for (const kind of ["material", "metal"])
      $$("[data-compare-" + kind + "]").forEach(
        (b) =>
          (b.onclick = () => {
            const list = kind === "material" ? compare : metalCompare,
              id = b.dataset[kind === "material" ? "compareMaterial" : "compareMetal"];
            if (list.includes(id)) list.splice(list.indexOf(id), 1);
            else if (list.length < 3) list.push(id);
            else {
              toast(
                t(
                  "Compare up to three materials at a time.",
                  "حداکثر سه ماده را هم‌زمان مقایسه کنید.",
                ),
              );
              return;
            }
            b.classList.toggle("selected", list.includes(id));
            b.setAttribute("aria-pressed", String(list.includes(id)));
            updateTables();
          }),
      );
    const thickness = () => {
      const x = +$("#thickA").value,
        y = +$("#thickB").value;
      $("#thickAValue").textContent = num(x) + " " + t("mm", "میلی‌متر");
      $("#thickBValue").textContent = num(y) + " " + t("mm", "میلی‌متر");
      $("#sheetA").style.height = 8 + x * 5 + "px";
      $("#sheetB").style.height = 8 + y * 5 + "px";
      $("#thicknessResult").textContent =
        t(
          "With equal face area, the second sheet has ",
          "با سطح یکسان، حجم ورق دوم برابر است با ",
        ) +
        num(y / x) +
        t(
          " times the volume. For the same material, mass changes by the same ratio.",
          " برابر حجم ورق اول. اگر جنس یکسان باشد، جرم هم به همین نسبت تغییر می‌کند.",
        );
    };
    $("#thickA").oninput = $("#thickB").oninput = thickness;
    thickness();
    $$("[data-scene-metal]").forEach(
      (b) =>
        (b.onclick = () =>
          labScene?.setColor(metals.find((m) => m.id === b.dataset.sceneMetal).color)),
    );
    $("#explode").oninput = (e) => labScene?.setProgress((+e.target.value / 100) * 0.5);
    $$("[data-scene-view]").forEach(
      (b) => (b.onclick = () => labScene?.view(+b.dataset.sceneView)),
    );
    dispose = () => labScene?.dispose();
  }
  /** materialPage: application feature. Keep related handlers in this module. */
  function materialPage(id) {
    const m = materials.find((m) => m.id === id.toUpperCase());
    if (!m) return learn();
    return (
      intro(t("Material guide", "راهنمای مواد"), tx(m.name), tx(m.desc)) +
      `<section class="wrap material-detail">${image("polymer-filaments", tx(m.name))}<div><h2>${t("What to consider", "معیارهای انتخاب")}</h2><h3>${t("Applications", "کاربردها")}</h3><p>${tx(m.use)}</p><h3>${t("Before manufacturing", "پیش از ساخت")}</h3><p>${tx(m.watch)}</p><p>${t("Strength, temperature, chemical resistance, and fatigue must be verified for the exact grade and manufacturing process.", "استحکام، تحمل دما، مقاومت شیمیایی و خستگی باید برای گرید و روش ساخت دقیق بررسی شوند.")}</p>${a("/learn", t("Compare with other materials ↗", "مقایسه با مواد دیگر ↗"), "button primary")}</div></section>`
    );
  }
  const guides = window.SHN_DATA.get("as/10-application/guides-6");
  /** processGuide: application feature. Keep related handlers in this module. */
  function processGuide(type) {
    const g = guides[type];
    return (
      (type === "print" || type === "laser" ? processMotion(type, true) : "") +
      intro(
        t("How it works", "روش انجام کار"),
        type === "print"
          ? t("From a model<br>to a printed part.", "از مدل سه‌بعدی<br>تا قطعهٔ چاپ‌شده.")
          : type === "laser"
            ? t("From a sheet<br>to a useful shape.", "از یک ورق<br>تا قطعه‌ای کاربردی.")
            : t("Remove material.<br>Reveal the part.", "با برداشتن ماده،<br>قطعه شکل می‌گیرد."),
        t(
          "Select a stage to see what happens and what to prepare.",
          "هر مرحله را انتخاب کنید تا روند کار و پیش‌نیازهای آن را ببینید.",
        ),
      ) +
      `<section class="wrap section compact"><div class="guide-stages">${g.map((x, i) => `<button class="${i === 0 ? "selected" : ""}" data-guide-stage="${i}" data-guide-type="${type}"><small>${num(i + 1)}</small>${t(x[0], x[1])}</button>`).join("")}</div><div id="guideCopy" class="guide-copy"><h2>${t(g[0][0], g[0][1])}</h2><p>${t(g[0][2], g[0][3])}</p></div>${a(type === "cnc" ? "/services/cnc" : "/services/" + (type === "print" ? "3d-printing" : "laser-cutting") + "/workspace", t("Prepare my part ↗", "آماده‌سازی قطعهٔ من ↗"), "button primary")}</section>`
    );
  }
  /** about: application feature. Keep related handlers in this module. */
  function about() {
    return (
      intro(
        t("About AS Industries", "دربارهٔ AS Industries"),
        t("Ideas deserve<br>to become real.", "ایده‌ها شایستهٔ<br>ساخته‌شدن‌اند."),
        t(
          "Design, engineering and manufacturing start with understanding what you need to make.",
          "طراحی، مهندسی و تولید با شناخت آنچه می‌خواهید بسازید آغاز می‌شوند.",
        ),
      ) +
      `<section class="wrap section compact"><p class="muted">${t("This preview connects product design, manufacturing enquiries, materials and machine services. Company credentials and live commerce will be added when verified.", "این پیش‌نمایش، طراحی محصول، درخواست ساخت، راهنمای مواد و خدمات دستگاه‌ها را کنار هم قرار می‌دهد. اطلاعات تأییدشدهٔ شرکت و خرید آنلاین بعداً اضافه می‌شوند.")}</p>${a("/contact", t("Start a conversation ↗", "شروع گفت‌وگو ↗"), "button primary")}</section>`
    );
  }
  /** downloadBrief: application feature. Keep related handlers in this module. */
  function downloadBrief(title, rows) {
    const text =
      title +
      "\n" +
      t("Local draft — not submitted", "پیش‌نویس محلی — ارسال نشده") +
      "\n\n" +
      rows.map(([k, v]) => k + ": " + v).join("\n") +
      "\n\n" +
      t(
        "Attach original files separately. Prices and delivery need confirmation.",
        "فایل‌های اصلی را جداگانه پیوست کنید. قیمت و تحویل باید تأیید شوند.",
      );
    const url = URL.createObjectURL(
        new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" }),
      ),
      el = document.createElement("a");
    el.href = url;
    el.download = lang === "fa" ? "--.txt" : "AS-Industries-brief.txt";
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  /** toast: application feature. Keep related handlers in this module. */
  function toast(message) {
    let el = $("#notice");
    if (!el) {
      el = document.createElement("div");
      el.id = "notice";
      el.role = "status";
      document.body.append(el);
    }
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(el.timer);
    el.timer = setTimeout(() => el.classList.remove("visible"), 4000);
  }
  /** bind: application feature. Keep related handlers in this module. */
  function bind() {
    if ($("#adminLogin") || $("#adminRates")) bindAccount();
    if ($("[data-making]")) dispose = ASMotion();
    if ($("#hero3d")) bindHero();
    if ($("[data-workspace]")) bindWorkspace($("[data-workspace]").dataset.workspace);
    if ($("#briefForm")) bindIntake();
    if ($("#polymerTable")) bindLearn();
    $$("[data-add]").forEach((b) => (b.onclick = () => addToCart(b.dataset.add)));
    if ($("#shopSearch")) {
      shopFilter = "all";
      const filter = () => {
        const q = $("#shopSearch").value.trim().toLowerCase(),
          machines = path === "/machines",
          found = catalog.filter(
            (p) =>
              (p.category === "machine") === machines &&
              (shopFilter === "all" || p.category === shopFilter) &&
              p.name.join(" ").toLowerCase().includes(q),
          );
        $("#shopGrid").innerHTML = window.embedAssets
          ? window.embedAssets(found.map(card).join(""))
          : found.map(card).join("");
        $("#shopEmpty").hidden = found.length > 0;
        $$("[data-add]").forEach((b) => (b.onclick = () => addToCart(b.dataset.add)));
      };
      $("#shopSearch").oninput = filter;
      $$("[data-filter]").forEach(
        (b) =>
          (b.onclick = () => {
            shopFilter = b.dataset.filter;
            $$("[data-filter]").forEach((x) => x.classList.toggle("selected", x === b));
            filter();
          }),
      );
    }
    if ($("#productAdd")) {
      $$("[data-scope=product]").forEach(
        (b) =>
          (b.onclick = () => {
            productColor = b.dataset.color;
            $$("[data-scope=product]").forEach((x) => {
              x.classList.toggle("selected", x === b);
              x.setAttribute("aria-pressed", String(x === b));
            });
            $("#productColorName").textContent = colName(productColor);
          }),
      );
      $("#productAdd").onclick = () => {
        const qty = $("#productQty");
        if (!qty.checkValidity()) {
          qty.reportValidity();
          return;
        }
        addToCart(
          $("#productAdd").dataset.product,
          productColor,
          Math.max(1, Math.round(+qty.value || 1)),
        );
      };
    }
    $$("[data-cart-qty]").forEach(
      (e) =>
        (e.onchange = () => {
          basket[+e.dataset.cartQty].qty = Math.max(1, Math.round(+e.value || 1));
          store.set("as-v2-basket", basket);
          render();
        }),
    );
    $$("[data-cart-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          basket.splice(+b.dataset.cartRemove, 1);
          store.set("as-v2-basket", basket);
          render();
        }),
    );
    $("#cartDownload")?.addEventListener("click", () =>
      downloadBrief(
        t("Purchase enquiry", "درخواست خرید"),
        basket.map((x) => [
          tx(catalog.find((p) => p.id === x.id).name),
          colName(x.color) + " / " + num(x.qty) + " " + t("units", "عدد"),
        ]),
      ),
    );
    $$("[data-draft-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          drafts.splice(+b.dataset.draftRemove, 1);
          store.set("as-v2-quotes", drafts);
          render();
        }),
    );
    $$("[data-draft-export]").forEach(
      (b) =>
        (b.onclick = () => {
          const d = drafts[+b.dataset.draftExport];
          downloadBrief(t("Manufacturing brief", "شرح درخواست ساخت"), [
            [t("File", "فایل"), d.file],
            [t("Material", "جنس"), matName(d.state.material)],
            [t("Quantity", "تعداد"), num(d.state.qty)],
            [
              d.type === "print" ? t("Color", "رنگ") : t("Thickness", "ضخامت"),
              d.type === "print"
                ? colName(d.state.color)
                : num(+d.state.thickness) + " " + t("mm", "میلی‌متر"),
            ],
            ...slicerRows(d.state, d.type),
            [
              t("Finish", "پرداخت"),
              selectedLabel(d.type === "print" ? finishes : laserFinishes, d.state.finish),
            ],
            [t("Notes", "توضیحات"), d.state.notes || t("None", "ندارد")],
          ]);
        }),
    );
    $$("[data-guide-stage]").forEach(
      (b) =>
        (b.onclick = () => {
          const x = guides[b.dataset.guideType][+b.dataset.guideStage];
          $$("[data-guide-stage]").forEach((el) => el.classList.toggle("selected", el === b));
          $("#guideCopy").innerHTML = `<h2>${t(x[0], x[1])}</h2><p>${t(x[2], x[3])}</p>`;
        }),
    );
    $$("input,textarea,select").forEach((el) => {
      el.addEventListener("invalid", () => {
        el.setCustomValidity(
          el.validity.typeMismatch
            ? t("Enter a valid email address.", "یک نشانی ایمیل معتبر وارد کنید.")
            : t(
                "Please complete this field with a valid value.",
                "این قسمت را با مقدار معتبر تکمیل کنید.",
              ),
        );
      });
      el.addEventListener("input", () => el.setCustomValidity(""));
    });
  }
  /** intro: application feature. Keep related handlers in this module. */
  function intro(kicker, title, copy) {
    const asset = path.startsWith("/learn")
      ? "cinema-studio"
      : path === "/engineering" || path === "/engineering/start"
        ? "product-design-v6"
        : path === "/services/production"
          ? "production-run-v6"
          : path === "/repair"
            ? "cinema-print"
            : path === "/machines"
              ? "cinema-print"
              : path === "/shop"
                ? "catalogue-group"
                : path.includes("cnc")
                  ? "cinema-studio"
                  : "cinema-laser";
    return photoIntro(kicker, title, copy, asset);
  }
  /** methodTiles: application feature. Keep related handlers in this module. */
  function methodTiles() {
    const pics = [
      "cinema-print",
      "cinema-laser",
      "cinema-studio",
      "production-run-v6",
      "product-design-v6",
    ];
    const titles = [
      ["3D printing services", "خدمات چاپ سه‌بعدی"],
      ["Laser cutting services", "خدمات برش لیزری"],
      ["CNC machining", "ماشین‌کاری CNC"],
      ["Production runs", "تولید سری"],
      ["Product design", "طراحی محصول"],
    ];
    const descriptions = window.SHN_DATA.get("as/10-application/descriptions-7");
    return `<div class="service-gallery">${methods.map(([id, en, fa, meta, url], i) => window.SHN_TEMPLATES.render("as/10-application/methodTiles-26", [window.SHN_TEMPLATES.text(url), window.SHN_TEMPLATES.text(image(pics[i], tx(titles[i]))), window.SHN_TEMPLATES.text(num(i + 1).padStart(2, lang === "fa" ? "" : "0")), window.SHN_TEMPLATES.text(i === 3 ? t("BATCH MANUFACTURING", "تولید سری") : i === 4 ? t("CONCEPT → PRODUCT", "از ایده تا محصول") : meta), window.SHN_TEMPLATES.text(tx(titles[i])), window.SHN_TEMPLATES.text(tx(descriptions[i])), window.SHN_TEMPLATES.text(t("Start here", "از اینجا شروع کنید"))])).join("")}</div>`;
  }
  /** staticProcess: application feature. Keep related handlers in this module. */
  function staticProcess(asset, kicker, title, copy, url, button) {
    return `<section class="static-process"><div class="wrap static-process-grid">${image(asset, title, "static-process-photo")}<div><small class="eyebrow">${kicker}</small><h2>${title}</h2><p>${copy}</p>${a(url, button, "button primary")}</div></div></section>`;
  }
  /** home: application feature. Keep related handlers in this module. */
  function home() {
    return window.SHN_TEMPLATES.render("as/10-application/home-27", [
      window.SHN_TEMPLATES.text(
        image(
          "cinema-laser",
          t("Precision manufacturing in light and metal", "ساخت دقیق با نور و فلز"),
          "cinema-hero-image",
          false,
        ),
      ),
      window.SHN_TEMPLATES.text(
        t("AS INDUSTRIES / FROM THOUGHT TO THING", "AS INDUSTRIES / از ایده تا ساخت"),
      ),
      window.SHN_TEMPLATES.text(
        t("IDEAS TAKE<br><em>SHAPE.</em>", "ایده‌ها<br><em>شکل می‌گیرند.</em>"),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "A line becomes a contour. A layer becomes a part.<br>Your next idea begins here.",
          "خطی که به طرح تبدیل می‌شود. لایه‌ای که قطعه می‌سازد.<br>ایدهٔ بعدی شما از اینجا آغاز می‌شود.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/services/3d-printing/workspace",
          t("Upload your part ↗", "بارگذاری فایل قطعه ↗"),
          "button primary",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a("/services", t("Explore manufacturing", "آشنایی با روش‌های ساخت"), "classic-text-link"),
      ),
      window.SHN_TEMPLATES.text(t("YOUR NEXT MOVE", "قدم بعدی شما")),
      window.SHN_TEMPLATES.text(t("What will you make?", "چه می‌خواهید بسازید؟")),
      window.SHN_TEMPLATES.text(
        t(
          "Five ways to begin. One place to bring it together.",
          "پنج مسیر برای شروع؛ یک مجموعه برای پیش بردن کار.",
        ),
      ),
      window.SHN_TEMPLATES.text(methodTiles()),
      window.SHN_TEMPLATES.text(
        staticProcess(
          "cinema-print",
          t("01 / BUILD THE LAYERS", "۰۱ / ساخت لایه‌ها"),
          t("A little material.<br>One layer at a time.", "کمی ماده.<br>لایه به لایه."),
          t(
            "Choose the material, internal structure and surface quality before production.",
            "پیش از تولید، جنس، ساختار داخلی و کیفیت سطح را انتخاب کنید.",
          ),
          "/services/3d-printing/workspace",
          t("Configure my print ↗", "تنظیم چاپ قطعه ↗"),
        ),
      ),
      window.SHN_TEMPLATES.text(
        staticProcess(
          "cinema-laser",
          t("02 / CUT THE OUTLINE", "۰۲ / برش طرح"),
          t("A line.<br>A new possibility.", "یک خط.<br>امکانی تازه."),
          t(
            "Define the sheet material, thickness and cutting contour in one simple path.",
            "جنس ورق، ضخامت و مسیر برش را در چند مرحلهٔ ساده مشخص کنید.",
          ),
          "/services/laser-cutting/workspace",
          t("Prepare a laser cut part ↗", "آماده‌سازی قطعه برای برش لیزری ↗"),
        ),
      ),
      window.SHN_TEMPLATES.text(
        image(
          "cinema-studio",
          t("Finished metal and polymer components", "قطعات ساخته‌شده از فلز و پلیمر"),
          "finale-photo",
        ),
      ),
      window.SHN_TEMPLATES.text(t("03 / THE IDEA, MADE REAL", "۰۳ / ایده‌ای که ساخته شد")),
      window.SHN_TEMPLATES.text(
        t("Different materials.<br>One clear intention.", "مواد مختلف.<br>یک هدف مشخص."),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Compare materials. Resolve the details.<br>Make something worth holding.",
          "مواد را مقایسه کنید و جزئیات را مشخص کنید.<br>محصولی بسازید که از داشتنش لذت ببرید.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a("/learn", t("Explore the material studio ↗", "بررسی مواد و متریال ↗"), "button primary"),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/engineering/start",
          t("Start with an idea ↗", "شروع از یک ایده ↗"),
          "classic-text-link",
        ),
      ),
      window.SHN_TEMPLATES.text(architecturePartnerTeaser()),
    ]);
  }
  /** designPage: application feature. Keep related handlers in this module. */
  function designPage() {
    return (
      intro(
        t("Product design", "طراحی محصول"),
        t("From “what if”<br>to “here it is”.", "از «می‌شود ساخت؟»<br>تا «ساخته شد»."),
        t(
          "Concept, engineering, prototype and manufacturing preparation. Start from a sketch or a problem.",
          "ایده‌پردازی، طراحی مهندسی، نمونه‌سازی و آماده‌سازی تولید. با یک طرح اولیه یا یک مسئله شروع کنید.",
        ),
      ) +
      `<section class="wrap design-page">${image("product-design-v6", t("Industrial product design development", "توسعهٔ طراحی محصول صنعتی"))}<div><h2>${t("Think through every detail.", "همهٔ جزئیات را در نظر بگیرید.")}</h2><div class="service-chips">${[
        ["Industrial design", "طراحی صنعتی"],
        ["Mechanical design", "طراحی مکانیکی"],
        ["CAD modeling", "مدل‌سازی CAD"],
        ["DFM review", "بررسی طراحی برای تولید"],
        ["Reverse engineering", "مهندسی معکوس"],
        ["Prototype development", "توسعهٔ نمونهٔ اولیه"],
      ]
        .map(tx)
        .map((x) => `<span>${x}</span>`)
        .join(
          "",
        )}</div>${a("/engineering/start", t("Start my project ↗", "شروع پروژهٔ من ↗"), "button primary")}${a("/consultation", t("Request a consultation", "درخواست مشاوره"), "button ghost")}</div></section>`
    );
  }
  /** processGuide: application feature. Keep related handlers in this module. */
  function processGuide(type) {
    const g = guides[type];
    return (
      intro(
        t("How it works", "روش انجام کار"),
        type === "print"
          ? t("From a model<br>to a printed part.", "از مدل سه‌بعدی<br>تا قطعهٔ چاپ‌شده.")
          : type === "laser"
            ? t("From a sheet<br>to a useful shape.", "از یک ورق<br>تا قطعه‌ای کاربردی.")
            : t("Remove material.<br>Reveal the part.", "با برداشتن ماده،<br>قطعه شکل می‌گیرد."),
        t(
          "Select a stage to see what happens and what to prepare.",
          "هر مرحله را انتخاب کنید تا روند کار و پیش‌نیازهای آن را ببینید.",
        ),
      ) +
      `<section class="wrap section compact"><div class="guide-stages">${g.map((x, i) => `<button class="${i === 0 ? "selected" : ""}" data-guide-stage="${i}" data-guide-type="${type}"><small>${num(i + 1)}</small>${t(x[0], x[1])}</button>`).join("")}</div><div id="guideCopy" class="guide-copy"><h2>${t(g[0][0], g[0][1])}</h2><p>${t(g[0][2], g[0][3])}</p></div>${a(type === "cnc" ? "/services/cnc" : "/services/" + (type === "print" ? "3d-printing" : "laser-cutting") + "/workspace", t("Prepare my part ↗", "آماده‌سازی قطعهٔ من ↗"), "button primary")}</section>`
    );
  }
  window.addEventListener("hashchange", render);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $("#mainNav")?.classList.remove("open");
      $$(".services-menu").forEach((d) => (d.open = false));
    }
  });

  /** architecturePartnerTeaser: application feature. Keep related handlers in this module. */
  function architecturePartnerTeaser() {
    return window.SHN_TEMPLATES.render("as/10-application/architecturePartnerTeaser-28", [
      window.SHN_TEMPLATES.text(t("DESIGN & ARCHITECTURE PARTNER", "همکار طراحی و معماری")),
      window.SHN_TEMPLATES.text(
        t(
          "Architecture, interiors and construction. Custom elements developed with engineering and manufacturing support.",
          "معماری، طراحی داخلی و اجرا؛ توسعهٔ اجزای اختصاصی با همکاری مهندسی و تولید.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/partners/shahrniaz",
          t("From space to object ↗", "از فضا تا محصول ↗"),
          "button primary",
        ),
      ),
    ]);
  }
  /** shahrniazPartner: application feature. Keep related handlers in this module. */
  function shahrniazPartner() {
    return (
      photoIntro(
        t("Architecture & design partner", "همکار معماری و طراحی"),
        t("From space<br>to object.", "از فضا<br>تا محصول."),
        t(
          "SHAHRNIAZ creates architecture, interiors and bespoke environments. AS Industries supports selected custom ideas through engineering, prototyping and manufacturing.",
          "شهر نیاز، معماری، فضای داخلی و فضاهای اختصاصی را طراحی می‌کند. AS Industries در ایده‌های منتخب با مهندسی، نمونه‌سازی و تولید همکاری می‌کند.",
        ),
        "shahrniaz-partner",
      ) +
      window.SHN_TEMPLATES.render("as/10-application/shahrniazPartner-29", [
        window.SHN_TEMPLATES.text(
          t("ARCHITECTURE, INTERIORS & CONSTRUCTION", "معماری، طراحی داخلی و اجرا"),
        ),
        window.SHN_TEMPLATES.text(
          t(
            "Independent brands with complementary roles: architectural design and construction by SHAHRNIAZ; engineering and manufacturing support through AS Industries.",
            "دو برند مستقل با نقش‌های مکمل: طراحی معماری و اجرا با شهر نیاز؛ پشتیبانی مهندسی و تولید با AS Industries.",
          ),
        ),
        window.SHN_TEMPLATES.text(
          [
            ["Spatial concept", "ایدهٔ فضایی"],
            ["CAD development", "توسعهٔ مدل CAD"],
            ["Material selection", "انتخاب جنس"],
            ["Prototype", "نمونهٔ اولیه"],
            ["Fabrication", "ساخت"],
            ["Installation planning", "برنامه‌ریزی نصب"],
          ]
            .map((x) => `<span style="padding:12px">${tx(x)} →</span>`)
            .join(""),
        ),
        window.SHN_TEMPLATES.text(t("Explore the project archive ↗", "دیدن آرشیو پروژه‌ها ↗")),
        window.SHN_TEMPLATES.text(t("Explore SHAHRNIAZ ↗", "دیدن شهر نیاز ↗")),
        window.SHN_TEMPLATES.text(
          t(
            "Arvand Industries is another partner working in robotics and industrial products.",
            "صنایع آروند، همکار دیگری در زمینهٔ رباتیک و محصولات صنعتی است.",
          ),
        ),
        window.SHN_TEMPLATES.text(t("Meet Arvand ↗", "آشنایی با آروند ↗")),
      ])
    );
  }

  /** ecosystemPartners: application feature. Keep related handlers in this module. */
  function ecosystemPartners() {
    return window.SHN_TEMPLATES.render("as/10-application/ecosystemPartners-30", [
      window.SHN_TEMPLATES.text(t("CONNECTED COMPANIES", "مجموعه‌های همکار")),
      window.SHN_TEMPLATES.text(
        t("Different expertise.<br>One connected path.", "تخصص‌های متفاوت.<br>یک مسیر مشترک."),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Architecture, manufacturing, robotics and industrial product development meet through independent specialist companies.",
          "معماری، تولید، رباتیک و توسعهٔ محصولات صنعتی با همکاری مجموعه‌های تخصصی مستقل پیش می‌روند.",
        ),
      ),
      window.SHN_TEMPLATES.text(AS_SN_LOGO),
      window.SHN_TEMPLATES.text(t("Architecture & design", "معماری و طراحی")),
      window.SHN_TEMPLATES.text(t("Arvand Industries", "صنایع آروند")),
      window.SHN_TEMPLATES.text(t("Arvand Industries", "صنایع آروند")),
      window.SHN_TEMPLATES.text(t("Robotics & industrial products", "رباتیک و محصولات صنعتی")),
    ]);
  }
  /** home: application feature. Keep related handlers in this module. */
  function home() {
    return window.SHN_TEMPLATES.render("as/10-application/home-31", [
      window.SHN_TEMPLATES.text(
        image(
          "cinema-laser",
          t("Precision manufacturing in light and metal", "ساخت دقیق با نور و فلز"),
          "cinema-hero-image",
          false,
        ),
      ),
      window.SHN_TEMPLATES.text(
        t("AS INDUSTRIES / FROM THOUGHT TO THING", "AS INDUSTRIES / از ایده تا ساخت"),
      ),
      window.SHN_TEMPLATES.text(
        t("IDEAS TAKE<br><em>SHAPE.</em>", "ایده‌ها<br><em>شکل می‌گیرند.</em>"),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "A line becomes a contour. A layer becomes a part.<br>Your next idea begins here.",
          "خطی که به طرح تبدیل می‌شود. لایه‌ای که قطعه می‌سازد.<br>ایدهٔ بعدی شما از اینجا آغاز می‌شود.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/services/3d-printing/workspace",
          t("Upload your part ↗", "بارگذاری فایل قطعه ↗"),
          "button primary",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a("/services", t("Explore manufacturing", "آشنایی با روش‌های ساخت"), "classic-text-link"),
      ),
      window.SHN_TEMPLATES.text(t("YOUR NEXT MOVE", "قدم بعدی شما")),
      window.SHN_TEMPLATES.text(t("What will you make?", "چه می‌خواهید بسازید؟")),
      window.SHN_TEMPLATES.text(
        t(
          "Five direct ways to begin. Choose the result you need.",
          "پنج مسیر مستقیم برای شروع؛ نتیجهٔ موردنیازتان را انتخاب کنید.",
        ),
      ),
      window.SHN_TEMPLATES.text(methodTiles()),
      window.SHN_TEMPLATES.text(
        image(
          "cinema-studio",
          t("Finished metal and polymer components", "قطعات ساخته‌شده از فلز و پلیمر"),
          "finale-photo",
        ),
      ),
      window.SHN_TEMPLATES.text(t("MATERIAL STUDIO", "راهنمای مواد")),
      window.SHN_TEMPLATES.text(
        t("Different materials.<br>One clear intention.", "مواد مختلف.<br>یک هدف مشخص."),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Compare polymers and metals, understand their strengths and choose with confidence.",
          "پلیمرها و فلزات را مقایسه کنید، ویژگی‌هایشان را بشناسید و آگاهانه انتخاب کنید.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a("/learn", t("Explore the material studio ↗", "بررسی مواد و متریال ↗"), "button primary"),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/engineering/start",
          t("Start with an idea ↗", "شروع از یک ایده ↗"),
          "classic-text-link",
        ),
      ),
      window.SHN_TEMPLATES.text(t("PRODUCTS / READY TO USE", "محصولات / آمادهٔ استفاده")),
      window.SHN_TEMPLATES.text(t("Made for everyday.", "برای استفادهٔ روزمره.")),
      window.SHN_TEMPLATES.text(
        a("/shop", t("Explore the collection ↗", "دیدن مجموعه ↗"), "classic-text-link"),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/shop",
          `<small>AS INDUSTRIES SHOP</small><h3>Shop the collection</h3><span>Explore objects made around everyday life ↗</span>`,
          "collection-launch-card",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a(
          "/shop/pets",
          `<small>SHOP / AS Shop</small><h3>Animal keychains</h3><span>See the collection · 350,000 Toman each ↗</span>`,
          "collection-launch-card",
        ),
      ),
      window.SHN_TEMPLATES.text(ecosystemPartners()),
    ]);
  }

  /* Production solid-model viewer override. The legacy preview painted and stroked
   decimated triangles on a 2D canvas, which made valid STL files look hollow. */
  let solidViewer = null;
  const MAX_MODEL_BYTES = 250 * 1024 * 1024;
  const OCCT_VERSION = "0.0.23";
  const OCCT_BASE = `https://cdn.jsdelivr.net/npm/occt-import-js@${OCCT_VERSION}/dist/`;

  function disposeSolidViewer() {
    if (solidViewer) {
      solidViewer.dispose();
      solidViewer = null;
    }
  }
  /** modelError: application feature. Keep related handlers in this module. */
  function modelError(code) {
    const messages = {
      EMPTY: ["The file is empty.", "  ."],
      SIZE: ["The file is larger than 250 MB.", "      ."],
      FORMAT: ["This file format is not supported.", "   ."],
      INVALID: ["The file could not be read or contains no valid geometry.", "       ."],
      STEP: [
        "STEP processing failed. Check the file and your connection to the CAD engine.",
        " STEP        CAD   .",
      ],
      WEBGL: ["3D preview is unavailable because WebGL could not start.", "     WebGL  ."],
    };
    return t(...(messages[code] || messages.INVALID));
  }
  /** setPreviewError: application feature. Keep related handlers in this module. */
  function setPreviewError(code) {
    disposeSolidViewer();
    const c = $("#modelCanvas"),
      f = $("#previewFallback");
    if (c) c.hidden = true;
    if (f) {
      f.hidden = false;
      f.innerHTML = `<span class="upload-symbol">!</span><h2>${t("Preview unavailable", "پیش‌نمایش در دسترس نیست")}</h2><p>${modelError(code)}</p>`;
    }
    const st = $("#fileStatus");
    if (st) st.textContent = modelError(code);
  }
  function flattenTriplets(value) {
    if (!value) return [];
    const a = value.array || value;
    if (!a.length) return [];
    return Array.isArray(a[0]) ? a.flat() : a;
  }
  /** stepToRenderData: application feature. Keep related handlers in this module. */
  function stepToRenderData(result) {
    if (!result?.success || !Array.isArray(result.meshes) || !result.meshes.length)
      throw Error("STEP");
    const parts = [];
    for (const source of result.meshes) {
      const positions = flattenTriplets(source.attributes?.position),
        normals = flattenTriplets(source.attributes?.normal),
        indices = flattenTriplets(source.index),
        base = {
          name: source.name || "",
          color: source.color || null,
          positions,
          normals: normals.length === positions.length ? normals : null,
        };
      if (positions.length < 9) continue;
      if (indices.length) {
        for (let i = 0; i < indices.length; i += 12000)
          parts.push({ ...base, indices: indices.slice(i, i + 12000) });
      } else parts.push({ ...base, indices: null });
    }
    if (!parts.length) throw Error("STEP");
    return { parts, assembly: result.root || null };
  }
  /** parseStepInWorker: application feature. Keep related handlers in this module. */
  function parseStepInWorker(file) {
    const source = `const BASE=${JSON.stringify(OCCT_BASE)};importScripts(BASE+'occt-import-js.min.js');self.onmessage=async e=>{try{const occt=await occtimportjs({locateFile:n=>BASE+n});const result=occt.ReadStepFile(new Uint8Array(e.data),{linearUnit:'millimeter',linearDeflectionType:'bounding_box_ratio',linearDeflection:0.001,angularDeflection:0.5});self.postMessage({ok:true,result})}catch(error){self.postMessage({ok:false,error:String(error&&error.message||error)})}}`;
    const url = URL.createObjectURL(new Blob([source], { type: "application/javascript" })),
      worker = new Worker(url);
    URL.revokeObjectURL(url);
    currentFileWorker = worker;
    return new Promise(async (resolve, reject) => {
      worker.onmessage = (e) => {
        worker.terminate();
        currentFileWorker = null;
        e.data.ok ? resolve(e.data.result) : reject(Error("STEP"));
      };
      worker.onerror = () => {
        worker.terminate();
        currentFileWorker = null;
        reject(Error("STEP"));
      };
      try {
        const buffer = await file.arrayBuffer();
        worker.postMessage(buffer, [buffer]);
      } catch {
        worker.terminate();
        currentFileWorker = null;
        reject(Error("STEP"));
      }
    });
  }

  /** createSolidViewer: application feature. Keep related handlers in this module. */
  function createSolidViewer(canvas, model, color) {
    if (!window.THREE) throw Error("WEBGL");
    const T = THREE;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      throw Error("WEBGL");
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0xffffff, 0);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(38, 1, 0.01, 1e7),
      root = new T.Group();
    scene.add(root);
    scene.add(new T.AmbientLight(0xffffff, 1.15));
    scene.add(new T.HemisphereLight(0xffffff, 0x7a817d, 2.4));
    const key = new T.DirectionalLight(0xffffff, 3.2);
    key.position.set(4, 7, 6);
    scene.add(key);
    const fill = new T.DirectionalLight(0xe8f2ff, 2.5);
    fill.position.set(-5, 2, -4);
    scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 1.8);
    rim.position.set(1, -3, 5);
    scene.add(rim);
    const frontFill = new T.DirectionalLight(0xffffff, 1.5);
    frontFill.position.set(-4, 5, 5);
    scene.add(frontFill);
    const lowerFill = new T.DirectionalLight(0xd9e1ff, 1.1);
    lowerFill.position.set(0, -5, -6);
    scene.add(lowerFill);
    const geometries = [],
      materials = [];
    const defaultColor = new T.Color(color || "#aab5ac");
    function material(partColor) {
      const c = defaultColor.clone();
      const m = new T.MeshStandardMaterial({
        color: c,
        metalness: 0.08,
        roughness: 0.46,
        wireframe: false,
        side: T.DoubleSide,
      });
      materials.push(m);
      return m;
    } /** addGeometry: application feature. Keep related handlers in this module. */
    function addGeometry(part) {
      const g = new T.BufferGeometry(),
        p = Float32Array.from(part.positions);
      g.setAttribute("position", new T.BufferAttribute(p, 3));
      if (part.indices?.length) {
        const max = Math.max(...part.indices),
          Index = max > 65535 ? Uint32Array : Uint16Array;
        g.setIndex(new T.BufferAttribute(Index.from(part.indices), 1));
      }
      if (part.normals?.length === part.positions.length)
        g.setAttribute("normal", new T.BufferAttribute(Float32Array.from(part.normals), 3));
      else g.computeVertexNormals();
      g.computeBoundingBox();
      g.computeBoundingSphere();
      geometries.push(g);
      const mesh = new T.Mesh(g, material(part.color));
      mesh.name = part.name || "";
      root.add(mesh);
    }
    if (model.parts) model.parts.forEach(addGeometry);
    else {
      const positions = new Float32Array(model.triangles.length * 9);
      let o = 0;
      for (const tri of model.triangles)
        for (const point of tri) for (const value of point) positions[o++] = value;
      addGeometry({ positions });
    }
    if (!root.children.length) throw Error("INVALID");
    const box = new T.Box3().setFromObject(root),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3()),
      radius = Math.max(size.length() / 2, 1e-6);
    root.position.sub(center);
    let yaw = 0.6,
      pitch = -0.45,
      distance = radius * 2.9,
      target = new T.Vector3(),
      drag = null,
      panMode = false,
      raf = 0,
      dead = false;
    function fit() {
      yaw = 0.6;
      pitch = -0.45;
      distance = (radius / Math.sin(T.MathUtils.degToRad(camera.fov / 2))) * 1.12;
      target.set(0, 0, 0);
      request();
    } /** render: application feature. Keep related handlers in this module. */
    function render() {
      raf = 0;
      if (dead) return;
      const w = Math.max(1, canvas.clientWidth),
        h = Math.max(1, canvas.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.near = Math.max(radius / 10000, 0.001);
      camera.far = Math.max(radius * 100, distance * 4);
      camera.position.set(
        target.x + distance * Math.cos(pitch) * Math.sin(yaw),
        target.y + distance * Math.sin(pitch),
        target.z + distance * Math.cos(pitch) * Math.cos(yaw),
      );
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
    function request() {
      if (!raf) raf = requestAnimationFrame(render);
    }
    function down(e) {
      drag = [e.clientX, e.clientY];
      panMode = e.shiftKey || e.button === 1 || e.button === 2;
      canvas.setPointerCapture(e.pointerId);
    } /** move: application feature. Keep related handlers in this module. */
    function move(e) {
      if (!drag) return;
      const dx = e.clientX - drag[0],
        dy = e.clientY - drag[1];
      if (panMode) {
        const scale =
            (2 * distance * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) /
            Math.max(canvas.clientHeight, 1),
          right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0),
          up = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
        target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
      } else {
        yaw -= dx * 0.008;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - dy * 0.008));
      }
      drag = [e.clientX, e.clientY];
      request();
    }
    function up() {
      drag = null;
    }
    function wheel(e) {
      e.preventDefault();
      distance = Math.max(
        radius * 0.04,
        Math.min(radius * 100, distance * Math.exp(e.deltaY * 0.001)),
      );
      request();
    }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    const ro = new ResizeObserver(request);
    ro.observe(canvas);
    fit();
    return {
      fit,
      view(name) {
        if (name === "front") {
          yaw = 0;
          pitch = 0;
        } else if (name === "top") {
          yaw = 0;
          pitch = Math.PI / 2 - 0.01;
        } else if (name === "iso") {
          yaw = 0.6;
          pitch = -0.45;
        } else if (name === "in") distance *= 0.8;
        else if (name === "out") distance *= 1.25;
        else fit();
        request();
      },
      setColor(value) {
        defaultColor.set(value);
        materials.forEach((m) => {
          m.color.copy(defaultColor);
          m.needsUpdate = true;
        });
        request();
      },
      dispose() {
        dead = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
        canvas.removeEventListener("wheel", wheel);
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        renderer.dispose();
      },
    };
  }

  const originalDrawPreview = drawPreview;
  drawPreview = function (type) {
    if (type !== "print") return originalDrawPreview(type);
    const c = $("#modelCanvas"),
      s = state.print,
      f = $("#previewFallback");
    if (!c || !s.uploaded) return;
    const model = s.renderModel || s.mesh;
    if (!model) {
      setPreviewError(s.errorCode || "INVALID");
      return;
    }
    c.hidden = false;
    f.hidden = true;
    const hex = colors.find((x) => x[0] === s.color)?.[1] || "#aab5ac";
    if (!solidViewer)
      try {
        solidViewer = createSolidViewer(c, model, hex);
      } catch (error) {
        setPreviewError(error.message);
        return;
      }
    else solidViewer.setColor(hex);
    $("#dims").textContent = s.dims.map(num).join(" × ") + " " + t("mm", "میلی‌متر");
  };
  const originalSetupPreview = setupPreview;
  setupPreview = function (type) {
    if (type !== "print") return originalSetupPreview(type);
    const c = $("#modelCanvas");
    $$("[data-camera]").forEach((b) => (b.onclick = () => solidViewer?.view(b.dataset.camera)));
    const ro = new ResizeObserver(() => solidViewer?.view(""));
    ro.observe(c);
    dispose = () => {
      ro.disconnect();
      disposeSolidViewer();
      if (currentFileWorker) {
        currentFileWorker.terminate();
        currentFileWorker = null;
        uploadVersion++;
      }
    };
  };
  const originalUpload = upload;
  upload = async function (type, file) {
    if (type !== "print") return originalUpload(type, file);
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase(),
      allowed = ["stl", "obj", "step", "stp"];
    if (!allowed.includes(ext)) {
      toast(modelError("FORMAT"));
      return;
    }
    if (!file.size) {
      toast(modelError("EMPTY"));
      return;
    }
    if (file.size > MAX_MODEL_BYTES) {
      toast(modelError("SIZE"));
      return;
    }
    currentFileWorker?.terminate();
    disposeSolidViewer();
    const version = ++uploadVersion,
      s = state.print;
    $("#loading").hidden = false;
    $("#loading p").textContent = ["step", "stp"].includes(ext)
      ? t("Tessellating CAD geometry…", "در حال تبدیل هندسهٔ CAD به مش…")
      : t("Reading your geometry…", "در حال خواندن هندسهٔ فایل…");
    const next = {
      ...s,
      file: file.name,
      uploaded: true,
      analyzed: false,
      mesh: null,
      renderModel: null,
      drawing: null,
      svg: null,
      reviewNeeded: false,
      errorCode: null,
    };
    try {
      if (["step", "stp"].includes(ext)) {
        const head = (await file.slice(0, 4096).text()).toUpperCase();
        if (!head.includes("ISO-10303-21")) throw Error("STEP");
        const result = stepToRenderData(await parseStepInWorker(file));
        next.renderModel = result;
        const box = new THREE.Box3();
        for (const p of result.parts) {
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(p.positions, 3));
          g.computeBoundingBox();
          box.union(g.boundingBox);
          g.dispose();
        }
        next.dims = box.getSize(new THREE.Vector3()).toArray();
        next.volume = 0;
        next.analyzed = true;
      } else {
        const url = URL.createObjectURL(
            new Blob([AS_WORKER_SOURCE], { type: "application/javascript" }),
          ),
          worker = new Worker(url);
        URL.revokeObjectURL(url);
        currentFileWorker = worker;
        const result = await new Promise((resolve, reject) => {
          worker.onmessage = (e) => (e.data.ok ? resolve(e.data.result) : reject(Error("INVALID")));
          worker.onerror = () => reject(Error("INVALID"));
          worker.postMessage({ file, ext });
        });
        worker.terminate();
        currentFileWorker = null;
        next.mesh = result;
        next.renderModel = result;
        next.dims = result.dims;
        next.volume = result.volume;
        next.analyzed = true;
      }
    } catch (error) {
      currentFileWorker?.terminate();
      currentFileWorker = null;
      next.errorCode = ["STEP", "SIZE", "FORMAT", "EMPTY"].includes(error.message)
        ? error.message
        : "INVALID";
      next.reviewNeeded = true;
    }
    if (version !== uploadVersion) return;
    Object.assign(s, next);
    $("#loading").hidden = true;
    $("#fileName").textContent = file.name;
    if (next.errorCode) {
      setPreviewError(next.errorCode);
      return;
    }
    $("#fileStatus").textContent = ["step", "stp"].includes(ext)
      ? t(
          "STEP geometry tessellated successfully. All renderable bodies are shown.",
          "هندسهٔ STEP با موفقیت به مش تبدیل شد. همهٔ اجزای قابل‌نمایش نشان داده شده‌اند.",
        )
      : t(
          "Solid mesh loaded. Drag to rotate, Shift-drag to pan, and scroll to zoom.",
          "مش بارگذاری شد. برای چرخش بکشید، برای جابه‌جایی Shift را نگه دارید و برای بزرگ‌نمایی از اسکرول استفاده کنید.",
        );
    step = 1;
    config(type);
    drawPreview(type);
  };

  /** comingSoon: application feature. Keep related handlers in this module. */
  function comingSoon() {
    return window.SHN_TEMPLATES.render("as/10-application/comingSoon-32", [
      window.SHN_TEMPLATES.text(t("AS INDUSTRIES / SHOP", "AS INDUSTRIES / فروشگاه")),
      window.SHN_TEMPLATES.text(t("COMING SOON", "به‌زودی")),
      window.SHN_TEMPLATES.text(t("The shop is getting ready.", "فروشگاه در حال آماده‌سازی است.")),
      window.SHN_TEMPLATES.text(
        t(
          "Our online shop is being prepared. Product availability and ordering will be announced here.",
          "فروشگاه آنلاین ما در حال آماده‌سازی است. موجودی محصولات و روش سفارش اینجا اعلام می‌شود.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a("/nixa", t("Discover AS Shop ↗", "آشنایی با AS Shop ↗"), "button primary"),
      ),
      window.SHN_TEMPLATES.text(a("/", t("Back to home", "بازگشت به خانه"), "classic-text-link")),
    ]);
  }
  /** nixa: application feature. Keep related handlers in this module. */
  function nixa() {
    return window.SHN_TEMPLATES.render("as/10-application/nixa-33", [
      window.SHN_TEMPLATES.text(t("3D-PRINTED ANIMAL KEYCHAINS", "جاکلیدی حیوانات با چاپ سه‌بعدی")),
      window.SHN_TEMPLATES.text(
        t(
          "Small animal companions, made to carry. A new collection of 3D-printed keychains is in preparation.",
          "همراهان کوچک حیوانی برای همراه‌داشتن؛ مجموعهٔ جدید جاکلیدی‌های چاپ سه‌بعدی در حال آماده‌سازی است.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("COMING SOON", "به‌زودی")),
      window.SHN_TEMPLATES.text(t("THE FIRST COLLECTION", "نخستین مجموعه")),
      window.SHN_TEMPLATES.text(
        t("Animal keychains are on the way.", "جاکلیدی حیوانات در راه‌اند."),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Product photos and categories will be added when the animal designs are ready.",
          "پس از آماده‌شدن طرح‌ها، عکس محصولات و دسته‌بندی‌ها اضافه می‌شوند.",
        ),
      ),
    ]);
  }

  /* New Shop and two-site ecosystem. All imagery is embedded for offline viewing. */
  const ecoEscape = (value) =>
    String(value ?? "").replace(
      /[&<>\"]/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[ch],
    );
  const ECO_SHAHR = "SHAHRNIAZ-Redesigned-v14.html";
  const ECO_PETS = window.SHN_DATA.get("as/10-application/ECO_PETS-8");
  const ECO_HERO = "/assets/as_shop/media/images/6fd381d2cd1266b5ec3f.png";
  const ECO_FAMILY = "/assets/as_shop/media/damaged/e47f695d4285190cb3b5.base64.txt";
  const ecoImg = (src, alt = "", cls = "") =>
    `<img class="${cls}" src="${src}" alt="${ecoEscape(alt)}" loading="lazy">`;
  const ecoCard = (href, src, kicker, title, copy, action) =>
    `<a class="eco-cat" href="#${href}"><div class="eco-cat-image">${ecoImg(src, "")}</div><div class="eco-cat-copy"><small>${kicker}</small><h3>${title}</h3><p>${copy}</p><b>${action} ↗</b></div></a>`;
  /** shopLanding: application feature. Keep related handlers in this module. */
  function shopLanding() {
    return window.SHN_TEMPLATES.render("as/10-application/shopLanding-34", [
      window.SHN_TEMPLATES.text(ecoImg(ECO_HERO, "A collection of 3D printed animal keychains")),
      window.SHN_TEMPLATES.text(a("/shop/pets", "Shop pet keychains ↗", "button primary")),
      window.SHN_TEMPLATES.text(a("/shop/request", "Make something custom", "button ghost")),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/pets",
          ECO_HERO,
          "01 / AS Shop",
          "Pet keychains",
          "Choose a design or send us a photo of your own companion.",
          "See collection",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/family",
          ECO_FAMILY,
          "02 / PERSONAL",
          "Family figurines",
          "Turn a family photograph into a keepsake object.",
          "Explore idea",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/kitchen",
          "./assets/catalogue-group.webp",
          "03 / EVERYDAY",
          "Kitchen",
          "Useful, considered objects for daily rituals.",
          "Explore category",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/nfc",
          "./assets/charger.webp",
          "04 / CONNECTED",
          "NFC products",
          "Smart tags, cards and linked objects.",
          "Explore category",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/gadgets",
          "./assets/stand.webp",
          "05 / FUNCTION",
          "Gadgets",
          "Stands, organisers and smart small accessories.",
          "Explore category",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/home",
          "./assets/cinema-studio.webp",
          "06 / LIVING",
          "Home objects",
          "Personal pieces for the spaces you live in.",
          "Explore category",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/furniture",
          "./assets/cinema-studio.webp",
          "07 / COLLABORATION",
          "Furniture",
          "Bespoke pieces developed with SHAHR NIAZ.",
          "Explore partnership",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/idea",
          "./assets/cinema-laser.webp",
          "08 / OPEN BRIEF",
          "Your idea",
          "Describe the thing you wish existed. We can review how to make it.",
          "Tell us",
        ),
      ),
      window.SHN_TEMPLATES.text(ecoImg(ECO_FAMILY, "Example of a personalised family keepsake")),
      window.SHN_TEMPLATES.text(a("/shop/request", "Start a custom request ↗", "button primary")),
      window.SHN_TEMPLATES.text(a("/shop/pets", "Browse AS Shop", "button ghost")),
    ]);
  }
  function petPhoto(p) {
    return `<div class="eco-photo">${ecoImg(p.image, p.name + " 3D printed keychain")}</div>`;
  }
  /** petShop: application feature. Keep related handlers in this module. */
  function petShop() {
    return window.SHN_TEMPLATES.render("as/10-application/petShop-35", [
      window.SHN_TEMPLATES.text(ecoImg(ECO_HERO, "")),
      window.SHN_TEMPLATES.text(a("/shop/request", "Make my own pet ↗", "button primary")),
      window.SHN_TEMPLATES.text(a("/shop", "← All shop categories", "button ghost")),
      window.SHN_TEMPLATES.text(ECO_PETS.length),
      window.SHN_TEMPLATES.text(
        ECO_PETS.map((p, i) =>
          window.SHN_TEMPLATES.render("as/10-application/petShop-36", [
            window.SHN_TEMPLATES.text(p.name.toLowerCase()),
            window.SHN_TEMPLATES.text(p.id),
            window.SHN_TEMPLATES.text(petPhoto(p)),
            window.SHN_TEMPLATES.text(String(i + 1).padStart(2, "0")),
            window.SHN_TEMPLATES.text(p.name),
          ]),
        ).join(""),
      ),
    ]);
  }
  /** petDetail: application feature. Keep related handlers in this module. */
  function petDetail(id) {
    const p = ECO_PETS.find((x) => x.id === id);
    if (!p) return petShop();
    return window.SHN_TEMPLATES.render("as/10-application/petDetail-37", [
      window.SHN_TEMPLATES.text(a("/shop/pets", "← All AS Shop designs", "back-link")),
      window.SHN_TEMPLATES.text(petPhoto(p)),
      window.SHN_TEMPLATES.text(p.name),
      window.SHN_TEMPLATES.text(
        a("/shop/request?design=" + p.id, "Request this keychain ↗", "button primary"),
      ),
      window.SHN_TEMPLATES.text(
        a("/shop/request?type=pet", "Personalise from my photo", "button ghost"),
      ),
    ]);
  }
  const ECO_CATEGORIES = window.SHN_DATA.get("as/10-application/ECO_CATEGORIES-9");
  const ECO_EXAMPLES = {
    kitchen: [
      ["Countertop organiser", "./assets/catalogue-group.webp"],
      ["Custom cabinet handle", "./assets/cables.webp"],
      ["Kitchen accessory", "./assets/stand.webp"],
    ],
    nfc: [
      ["NFC key tag", "./assets/pet-tag.webp"],
      ["Smart display stand", "./assets/charger.webp"],
      ["Connected business card", "./assets/stand.webp"],
    ],
    gadgets: [
      ["Wireless charging stand", "./assets/charger.webp"],
      ["Cable organiser", "./assets/cables.webp"],
      ["Headphone stand", "./assets/stand.webp"],
    ],
    home: [
      ["Pet water fountain", "./assets/fountain.webp"],
      ["Personalised home object", "./assets/catalogue-group.webp"],
      ["Storage accessory", "./assets/cables.webp"],
    ],
    family: [["Family photo figurine", ECO_FAMILY]],
  };
  /** ecoExamples: application feature. Keep related handlers in this module. */
  function ecoExamples(id) {
    const items = ECO_EXAMPLES[id];
    if (!items) return "";
    return window.SHN_TEMPLATES.render("as/10-application/ecoExamples-38", [
      window.SHN_TEMPLATES.text(
        items
          .map(([name, pic]) =>
            window.SHN_TEMPLATES.render("as/10-application/ecoExamples-39", [
              window.SHN_TEMPLATES.text(id),
              window.SHN_TEMPLATES.text(encodeURIComponent(name)),
              window.SHN_TEMPLATES.text(ecoImg(pic, name)),
              window.SHN_TEMPLATES.text(name),
            ]),
          )
          .join(""),
      ),
    ]);
  }
  /** shopCategory: application feature. Keep related handlers in this module. */
  function shopCategory(id) {
    const d = ECO_CATEGORIES[id];
    if (!d) return shopLanding();
    return window.SHN_TEMPLATES.render("as/10-application/shopCategory-40", [
      window.SHN_TEMPLATES.text(d[0].toUpperCase()),
      window.SHN_TEMPLATES.text(d[2]),
      window.SHN_TEMPLATES.text(d[1]),
      window.SHN_TEMPLATES.text(
        a("/shop/request?type=" + id, "Tell us what you need ↗", "button primary"),
      ),
      window.SHN_TEMPLATES.text(a("/shop", "← Back to Shop", "button ghost")),
      window.SHN_TEMPLATES.text(
        id === "family"
          ? window.SHN_TEMPLATES.render("as/10-application/shopCategory-41", [
              window.SHN_TEMPLATES.text(ecoImg(ECO_FAMILY, "Concept for a family figurine")),
            ])
          : "",
      ),
      window.SHN_TEMPLATES.text(ecoExamples(id)),
    ]);
  }
  /** furnitureShop: application feature. Keep related handlers in this module. */
  function furnitureShop() {
    return window.SHN_TEMPLATES.render("as/10-application/furnitureShop-42", [
      window.SHN_TEMPLATES.text(ECO_SHAHR),
      window.SHN_TEMPLATES.text(
        a("/shop/request?type=furniture", "Discuss a custom piece", "button ghost"),
      ),
      window.SHN_TEMPLATES.text(ECO_SHAHR),
    ]);
  }
  /** partnersPage: application feature. Keep related handlers in this module. */
  function partnersPage() {
    return window.SHN_TEMPLATES.render("as/10-application/partnersPage-43", [
      window.SHN_TEMPLATES.text(ECO_SHAHR),
      window.SHN_TEMPLATES.text(a("/shop", "Explore AS Shop ↗", "button primary")),
    ]);
  }
  /** customRequest: application feature. Keep related handlers in this module. */
  function customRequest() {
    const qs = new URLSearchParams(location.hash.split("?")[1] || ""),
      design = ECO_PETS.find((p) => p.id === qs.get("design")),
      type = design ? "pet" : qs.get("type") || "pet",
      reference = design ? design.name : qs.get("item") || "",
      intro = design
        ? "The pictured " +
          design.name +
          " design is 350,000 Toman. Availability, finish and delivery are confirmed before payment. Custom changes are quoted separately."
        : "Start with a few details. Add a clear photo, describe what matters and keep a copy of your request brief. Custom work is quoted after review.";
    return window.SHN_TEMPLATES.render("as/10-application/customRequest-44", [
      window.SHN_TEMPLATES.text(
        design ? "Request your " + design.name + "." : "Tell us what you imagine.",
      ),
      window.SHN_TEMPLATES.text(intro),
      window.SHN_TEMPLATES.text(type === "pet" ? "selected" : ""),
      window.SHN_TEMPLATES.text(type === "family" ? "selected" : ""),
      window.SHN_TEMPLATES.text(type === "kitchen" ? "selected" : ""),
      window.SHN_TEMPLATES.text(type === "nfc" ? "selected" : ""),
      window.SHN_TEMPLATES.text(type === "gadgets" ? "selected" : ""),
      window.SHN_TEMPLATES.text(type === "furniture" ? "selected" : ""),
      window.SHN_TEMPLATES.text(type === "idea" ? "selected" : ""),
      window.SHN_TEMPLATES.text(ecoEscape(reference)),
      window.SHN_TEMPLATES.text(a("/shop", "Back to Shop", "button ghost")),
    ]);
  }
  ecosystemPartners = function () {
    return window.SHN_TEMPLATES.render("as/10-application/view-45", [
      window.SHN_TEMPLATES.text(ECO_SHAHR),
    ]);
  };
  const priorBind = bind;
  bind = function () {
    priorBind();
    const search = $("#ecoPetSearch");
    if (search)
      search.oninput = () => {
        const q = search.value.trim().toLowerCase();
        let visible = 0;
        $$(".eco-product-card").forEach((c) => {
          const show = c.dataset.name.includes(q);
          c.hidden = !show;
          if (show) visible++;
        });
        $("#ecoPetCount").textContent = visible + " designs";
      };
    const ref = $("#ecoReference");
    if (ref)
      ref.onchange = () => {
        const f = ref.files?.[0],
          p = $("#ecoReferencePreview");
        if (p.dataset.url) URL.revokeObjectURL(p.dataset.url);
        p.hidden = true;
        if (f && f.type.startsWith("image/")) {
          p.dataset.url = URL.createObjectURL(f);
          p.src = p.dataset.url;
          p.hidden = false;
        }
        $("#ecoFileNote").textContent = f
          ? f.name + " · stored only on this device"
          : "For this offline preview, your file remains on your device.";
      };
    const form = $("#ecoRequestForm");
    if (form)
      form.onsubmit = (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form));
        const file = ref.files?.[0];
        const lines = [
          "AS INDUSTRIES / CUSTOM SHOP REQUEST",
          "",
          ...Object.entries(data).map(([k, v]) => k + ": " + v),
          "Reference file: " + (file?.name || "none"),
          ECO_PETS.some((p) => p.name === data.design)
            ? "Pictured design price: 350,000 Toman; custom changes quoted separately."
            : "Custom work: quote after review.",
          "کار اختصاصی: قیمت پس از بررسی",
          "Offline preview: this brief has not been submitted. Share the original image separately.",
        ];
        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
          url = URL.createObjectURL(blob),
          link = document.createElement("a");
        link.href = url;
        link.download = "AS-Industries-shop-request.txt";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        $("#ecoRequestMessage").textContent =
          "Your brief is saved. This preview has not sent it to AS Industries.";
      };
  };

  /* Shop V3: two active offers, a direct pet-photo brief, and explicit quantity pricing. */
  const ECO_PETS_V3 = ECO_PETS.filter((p) => p.id !== "cream-persian");
  const ECO_PET_TYPES = {
    "french-bulldog": ["Dog", "سگ"],
    pomeranian: ["Dog", "سگ"],
    "tuxedo-cat": ["Cat", "گربه"],
    "shih-tzu": ["Dog", "سگ"],
    chihuahua: ["Dog", "سگ"],
    "yellow-poodle": ["Dog", "سگ"],
    "pink-poodle": ["Dog", "سگ"],
    "blue-poodle": ["Dog", "سگ"],
    "black-duck": ["Character", "شخصیت"],
    "yellow-duck": ["Character", "شخصیت"],
    "white-persian": ["Cat", "گربه"],
    "grey-persian": ["Cat", "گربه"],
    dachshund: ["Dog", "سگ"],
    "black-persian": ["Cat", "گربه"],
  };
  const ecoToman = (n) =>
    new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 0 }).format(
      n,
    ) +
    " " +
    t("Toman", "تومان");
  function ecoPetPrice(n) {
    n = Math.max(1, Math.min(99, Math.round(Number(n) || 1)));
    return n === 1
      ? 350000
      : n === 2
        ? 500000
        : n === 3
          ? 700000
          : n <= 5
            ? 700000 + (n - 3) * 200000
            : n * 200000;
  }
  /** ecoShopComing: application feature. Keep related handlers in this module. */
  function ecoShopComing() {
    return window.SHN_TEMPLATES.render("as/10-application/ecoShopComing-46", [
      window.SHN_TEMPLATES.text(a("/shop/pets", "Shop pet keychains ↗", "button primary")),
      window.SHN_TEMPLATES.text(a("/shop/family", "Explore family figures", "button ghost")),
    ]);
  }
  shopLanding = function () {
    return window.SHN_TEMPLATES.render("as/10-application/view-47", [
      window.SHN_TEMPLATES.text(
        ecoImg(
          ECO_HERO,
          "Complete 3D printed pet keychains: French Bulldog, tuxedo cat, Pomeranian and poodle",
        ),
      ),
      window.SHN_TEMPLATES.text(a("/shop/pets", "Shop pet keychains ↗", "button primary")),
      window.SHN_TEMPLATES.text(a("/shop/request?type=pet", "Make my pet", "button ghost")),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/pets",
          ECO_HERO,
          "01 / READY OR PERSONAL",
          "۰۱ / آماده یا اختصاصی",
          "Browse the AS Shop designs, or send your own pet photo.",
          "طرح‌های AS Shop را ببینید یا عکس حیوان خودتان را بفرستید.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoCard(
          "/shop/family",
          ECO_FAMILY,
          "02 / MADE FROM YOUR PHOTO",
          "۰۲ / ساخته‌شده از عکس شما",
          "A cute collectible version of the people you love.",
          "فیگوری کوچک از آدم‌های عزیز زندگی شما.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        ecoImg(
          ECO_FAMILY,
          "Brown-haired family photograph beside its cute cartoon-like 3D figurine",
        ),
      ),
      window.SHN_TEMPLATES.text(
        a("/shop/request?type=family", "Start a family figure ↗", "button primary"),
      ),
      window.SHN_TEMPLATES.text(a("/shop/pets", "Browse pet keychains", "button ghost")),
    ]);
  };

  /** ecoFastPetForm: application feature. Keep related handlers in this module. */
  function ecoFastPetForm() {
    return window.SHN_TEMPLATES.render("as/10-application/ecoFastPetForm-48", []);
  }
  petShop = function () {
    return window.SHN_TEMPLATES.render("as/10-application/view-49", [
      window.SHN_TEMPLATES.text(a("/shop", "← Back to Shop", "button ghost")),
      window.SHN_TEMPLATES.text(ecoFastPetForm()),
      window.SHN_TEMPLATES.text(ECO_PETS_V3.length),
      window.SHN_TEMPLATES.text(
        ECO_PETS_V3.map((p, i) =>
          window.SHN_TEMPLATES.render("as/10-application/view-50", [
            window.SHN_TEMPLATES.text(p.name.toLowerCase()),
            window.SHN_TEMPLATES.text(p.id),
            window.SHN_TEMPLATES.text(ecoImg(p.image, p.name + " 3D printed keychain")),
            window.SHN_TEMPLATES.text(String(i + 1).padStart(2, "0")),
            window.SHN_TEMPLATES.text(p.name),
            window.SHN_TEMPLATES.text(ECO_PET_TYPES[p.id]?.[0] || "Character"),
          ]),
        ).join(""),
      ),
    ]);
  };

  petDetail = function (id) {
    const p = ECO_PETS_V3.find((x) => x.id === id);
    if (!p) return petShop();
    const [kind, breed] = ECO_PET_TYPES[id] || ["Animal", p.name];
    return window.SHN_TEMPLATES.render("as/10-application/view-51", [
      window.SHN_TEMPLATES.text(a("/shop/pets", "← All keychains", "back-link")),
      window.SHN_TEMPLATES.text(p.image),
      window.SHN_TEMPLATES.text(ecoEscape(p.name)),
      window.SHN_TEMPLATES.text(p.name),
      window.SHN_TEMPLATES.text(kind),
      window.SHN_TEMPLATES.text(breed),
      window.SHN_TEMPLATES.text(breed),
    ]);
  };

  const originalShopCategoryPage = shopCategory;
  shopCategory = function (id) {
    if (id === "kitchen") return originalShopCategoryPage(id);
    if (id === "family")
      return window.SHN_TEMPLATES.render("as/10-application/view-52", [
        window.SHN_TEMPLATES.text(
          a("/shop/request?type=family", "Upload a family photo ↗", "button primary"),
        ),
        window.SHN_TEMPLATES.text(a("/shop", "← Back to Shop", "button ghost")),
        window.SHN_TEMPLATES.text(
          ecoImg(
            ECO_FAMILY,
            "Brown-haired family photograph beside a cute sculpted cartoon family figurine",
          ),
        ),
        window.SHN_TEMPLATES.text(
          a("/shop/request?type=family", "Start my family figure ↗", "button primary"),
        ),
      ]);
    return ecoShopComing();
  };
  furnitureShop = function () {
    return ecoShopComing();
  };

  const originalShopRequestPage = customRequest;
  customRequest = function () {
    const qs = new URLSearchParams(location.hash.split("?")[1] || ""),
      family = qs.get("type") === "family";
    return window.SHN_TEMPLATES.render("as/10-application/view-53", [
      window.SHN_TEMPLATES.text(family ? "FAMILY FIGURE" : "PET KEYCHAIN"),
      window.SHN_TEMPLATES.text(
        family ? "Start with your family photo." : "Start with your pet photo.",
      ),
      window.SHN_TEMPLATES.text(family ? "family" : "pet"),
      window.SHN_TEMPLATES.text(family ? "How many people are in the photo?" : "Pet breed or type"),
      window.SHN_TEMPLATES.text(family ? "e.g. three people" : "e.g. Pomeranian or mixed breed"),
      window.SHN_TEMPLATES.text(family ? "a family" : "your pet"),
      window.SHN_TEMPLATES.text(a("/shop", "Back to Shop", "button ghost")),
    ]);
  };

  partnersPage = function () {
    return window.SHN_TEMPLATES.render("as/10-application/view-54", [
      window.SHN_TEMPLATES.text(AS_SN_LOGO),
      window.SHN_TEMPLATES.text(ECO_SHAHR),
      window.SHN_TEMPLATES.text(logo()),
      window.SHN_TEMPLATES.text(a("/shop", "Explore AS Shop ↗", "button primary")),
    ]);
  };
  ecosystemPartners = function () {
    return window.SHN_TEMPLATES.render("as/10-application/view-55", [
      window.SHN_TEMPLATES.text(ECO_SHAHR),
      window.SHN_TEMPLATES.text(AS_SN_LOGO),
      window.SHN_TEMPLATES.text(logo()),
    ]);
  };

  const ecoBindV2 = bind;
  bind = function () {
    ecoBindV2();
    const input = $("#ecoQty");
    if (input) {
      const sync = () => {
        let n = Math.max(1, Math.min(99, Math.round(Number(input.value) || 1)));
        input.value = n;
        $("#ecoTotal").textContent = ecoToman(ecoPetPrice(n));
        $$("[data-eco-tier]").forEach((b) =>
          b.setAttribute("aria-pressed", String(Number(b.dataset.ecoTier) === n)),
        );
      };
      $("#ecoQtyMinus").onclick = () => {
        input.value = Number(input.value) - 1;
        sync();
      };
      $("#ecoQtyPlus").onclick = () => {
        input.value = Number(input.value) + 1;
        sync();
      };
      input.oninput = sync;
      input.onchange = sync;
      $$("[data-eco-tier]").forEach(
        (b) =>
          (b.onclick = () => {
            input.value = b.dataset.ecoTier;
            sync();
          }),
      );
      const form = $("#ecoOrderForm");
      if (form)
        form.onsubmit = (e) => {
          e.preventDefault();
          if (!form.reportValidity()) return;
          sync();
          const p = ECO_PETS_V3.find((x) => path.endsWith("/" + x.id)),
            d = Object.fromEntries(new FormData(form)),
            n = Number(input.value),
            body = [
              "AS INDUSTRIES / AS Shop KEYCHAIN ORDER REQUEST",
              "",
              "Design: " + (p?.name || ""),
              "Quantity: " + n,
              "Product total: " + ecoToman(ecoPetPrice(n)),
              "",
              ...Object.entries(d).map(([k, v]) => k + ": " + v),
              "",
              "Offline preview: not submitted or paid. Delivery and availability require confirmation.",
            ].join("\n"),
            url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" })),
            link = document.createElement("a");
          link.href = url;
          link.download = "AS Shop-" + (p?.id || "keychain") + "-order.txt";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          $("#ecoOrderStatus").textContent =
            "Your order details are saved. This preview has not sent the order or taken payment.";
        };
      sync();
    }
  };

  const ECO_PET_SHEETS = [
    "/assets/as_shop/media/images/7b6a137b729a38e78619.png",
    "/assets/as_shop/media/images/83a131015ea7cd62ae7b.png",
    "/assets/as_shop/media/images/74c33eb97ff8e58e4655.png",
    "/assets/as_shop/media/images/1a9b8309f8194cfabd76.png",
  ];
  const ECO_FAMILY_V4 = "/assets/as_shop/media/images/c4d2cce2b188d2c7c32b.png";
  const ECO_PET_TILE_MAP = {
    "french-bulldog": [0, 0],
    pomeranian: [0, 1],
    "tuxedo-cat": [0, 2],
    "shih-tzu": [0, 3],
    chihuahua: [1, 0],
    "yellow-poodle": [1, 1],
    "pink-poodle": [1, 2],
    "blue-poodle": [1, 3],
    "black-duck": [2, 0],
    "yellow-duck": [2, 1],
    "white-persian": [2, 2],
    "grey-persian": [2, 3],
    dachshund: [3, 0],
    "black-persian": [3, 1],
  };
  const ecoImageStyle = document.createElement("style");
  ecoImageStyle.id = "eco-v4-image-style";
  ecoImageStyle.textContent = ECO_PET_SHEETS.map(
    (src, i) => `.eco-tile-${i}{background-image:url("${src}")}`,
  ).join("");
  document.head.appendChild(ecoImageStyle);
  const ecoTile = (id, extra = "") => {
    const t = ECO_PET_TILE_MAP[id] || [0, 0];
    return `<div class="eco-clean-photo eco-tile-${t[0]} eco-q-${t[1]} ${extra}" role="img" aria-label="Complete ${ecoEscape(ECO_PETS_V3.find((p) => p.id === id)?.name || "pet")} 3D printed keychain"></div>`;
  };
  const ECO_BASKET_KEY = "as-nixa-mixed-basket-v1";
  /** ecoBasketRead: application feature. Keep related handlers in this module. */
  function ecoBasketRead() {
    try {
      const raw = JSON.parse(localStorage.getItem(ECO_BASKET_KEY) || "{}");
      const out = {};
      for (const [id, qty] of Object.entries(raw)) {
        if (ECO_PET_TILE_MAP[id] && Number.isFinite(Number(qty))) {
          const n = Math.max(0, Math.min(99, Math.round(Number(qty))));
          if (n) out[id] = n;
        }
      }
      return out;
    } catch (e) {
      return {};
    }
  }
  function ecoBasketSave(items) {
    localStorage.setItem(ECO_BASKET_KEY, JSON.stringify(items));
    ecoBasketBadge();
  }
  function ecoBasketCount(items = ecoBasketRead()) {
    return Object.values(items).reduce((sum, n) => sum + n, 0);
  }
  function ecoBasketBadge() {
    const n = ecoBasketCount(),
      badge = document.querySelector("#ecoBasketCount");
    if (badge) badge.textContent = n;
    const link = document.querySelector("#ecoBasketLink");
    if (link) link.setAttribute("aria-label", `Basket, ${n} keychains`);
  }
  /** ecoAddItem: application feature. Keep related handlers in this module. */
  function ecoAddItem(id, qty, origin) {
    if (!ECO_PET_TILE_MAP[id]) return;
    const items = ecoBasketRead();
    items[id] = Math.min(99, (items[id] || 0) + Math.max(1, Math.round(Number(qty) || 1)));
    ecoBasketSave(items);
    const source =
      origin?.closest(".eco-product-card,.eco-detail")?.querySelector(".eco-clean-photo") || origin;
    const target = document.querySelector("#ecoBasketLink");
    if (source && target && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const sr = source.getBoundingClientRect(),
        tr = target.getBoundingClientRect(),
        ghost = source.cloneNode(true);
      ghost.classList.add("eco-fly");
      Object.assign(ghost.style, {
        position: "fixed",
        left: sr.left + "px",
        top: sr.top + "px",
        width: sr.width + "px",
        height: sr.height + "px",
        zIndex: "9999",
        pointerEvents: "none",
        margin: "0",
        borderRadius: "12px",
      });
      document.body.appendChild(ghost);
      const dx = tr.left + tr.width / 2 - sr.left - sr.width / 2,
        dy = tr.top + tr.height / 2 - sr.top - sr.height / 2;
      ghost.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${dx * 0.52}px,${dy * 0.5}px) scale(.55)`, opacity: 0.85 },
          { transform: `translate(${dx}px,${dy}px) scale(.08)`, opacity: 0.1 },
        ],
        { duration: 700, easing: "cubic-bezier(.18,.76,.3,1)" },
      ).onfinish = () => ghost.remove();
      setTimeout(() => ghost.remove(), 900);
    }
    let toast = document.querySelector("#ecoBasketToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ecoBasketToast";
      toast.className = "eco-basket-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    const p = ECO_PETS_V3.find((x) => x.id === id);
    toast.innerHTML = `<strong>${ecoEscape(p?.name || "Keychain")} added</strong><span>${ecoBasketCount(items)} ${ecoBasketCount(items) === 1 ? "piece" : "pieces"} · ${ecoToman(ecoPetPrice(ecoBasketCount(items)))}</span><a href="#/shop/basket">View basket ↗</a>`;
    toast.classList.add("show");
    clearTimeout(window.ecoToastTimer);
    window.ecoToastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
  }
  const ecoShellV4 = shell;
  shell = function () {
    document.querySelectorAll(".eco-fly").forEach((el) => el.remove());
    document.querySelector("#ecoBasketToast")?.classList.remove("show");
    ecoShellV4();
    if (path.startsWith("/shop") || path === "/nixa") {
      const target = document.querySelector("#siteHeader .header-quote");
      if (target)
        target.outerHTML = `<a id="ecoBasketLink" class="eco-header-basket" href="#/shop/basket" aria-label="Basket, ${ecoBasketCount()} keychains"><span>Basket</span><b id="ecoBasketCount">${ecoBasketCount()}</b><span>↗</span></a>`;
    }
  };
  const ecoShopLandingV4 = shopLanding;
  shopLanding = function () {
    let html = ecoShopLandingV4();
    html = html.split(ECO_FAMILY).join(ECO_FAMILY_V4);
    html = html
      .replace("Simple quantity pricing", "Mix & match bundle pricing")
      .replace(
        "A ready pet keychain has a clear quantity price.",
        "Choose one or mix different designs in one basket.",
      );
    return html;
  };
  /** ecoPetProcess: application feature. Keep related handlers in this module. */
  function ecoPetProcess() {
    return window.SHN_TEMPLATES.render("as/10-application/ecoPetProcess-56", [
      window.SHN_TEMPLATES.text(ecoTile("pomeranian")),
    ]);
  }
  /** ecoFastPetFormV4: application feature. Keep related handlers in this module. */
  function ecoFastPetFormV4() {
    return window.SHN_TEMPLATES.render("as/10-application/ecoFastPetFormV4-57", [
      window.SHN_TEMPLATES.text(ecoPetProcess()),
    ]);
  }
  petShop = function () {
    const items = ecoBasketRead();
    return window.SHN_TEMPLATES.render("as/10-application/view-58", [
      window.SHN_TEMPLATES.text(ecoBasketCount(items)),
      window.SHN_TEMPLATES.text(ECO_PETS_V3.length),
      window.SHN_TEMPLATES.text(
        ECO_PETS_V3.map((p, i) =>
          window.SHN_TEMPLATES.render("as/10-application/view-59", [
            window.SHN_TEMPLATES.text(p.name.toLowerCase()),
            window.SHN_TEMPLATES.text(ecoTile(p.id)),
            window.SHN_TEMPLATES.text(String(i + 1).padStart(2, "0")),
            window.SHN_TEMPLATES.text(p.name),
            window.SHN_TEMPLATES.text(ECO_PET_TYPES[p.id]?.[0] || "Character"),
            window.SHN_TEMPLATES.text(p.id),
            window.SHN_TEMPLATES.text(p.id),
            window.SHN_TEMPLATES.text(ecoEscape(p.name)),
          ]),
        ).join(""),
      ),
      window.SHN_TEMPLATES.text(ecoFastPetFormV4()),
    ]);
  };
  petDetail = function (id) {
    const p = ECO_PETS_V3.find((x) => x.id === id);
    if (!p) return petShop();
    const [kind, breed] = ECO_PET_TYPES[id] || ["Animal", p.name];
    return window.SHN_TEMPLATES.render("as/10-application/view-60", [
      window.SHN_TEMPLATES.text(a("/shop/pets", "← All keychains", "back-link")),
      window.SHN_TEMPLATES.text(ecoTile(id, "eco-detail-tile")),
      window.SHN_TEMPLATES.text(p.name),
      window.SHN_TEMPLATES.text(kind),
      window.SHN_TEMPLATES.text(breed),
      window.SHN_TEMPLATES.text(id),
      window.SHN_TEMPLATES.text(a("/shop/basket", "View basket ↗", "eco-inline-link")),
      window.SHN_TEMPLATES.text(a("/shop/pets", "Choose another design ↗", "eco-inline-link")),
      window.SHN_TEMPLATES.text(breed),
    ]);
  };
  /** ecoBasketPage: application feature. Keep related handlers in this module. */
  function ecoBasketPage() {
    const items = ecoBasketRead(),
      n = ecoBasketCount(items);
    return window.SHN_TEMPLATES.render("as/10-application/ecoBasketPage-61", [
      window.SHN_TEMPLATES.text(n),
      window.SHN_TEMPLATES.text(n === 1 ? "keychain" : "keychains"),
      window.SHN_TEMPLATES.text(
        n
          ? Object.entries(items)
              .map(([id, qty]) => {
                const p = ECO_PETS_V3.find((x) => x.id === id);
                return window.SHN_TEMPLATES.render("as/10-application/ecoBasketPage-62", [
                  window.SHN_TEMPLATES.text(id),
                  window.SHN_TEMPLATES.text(ecoTile(id)),
                  window.SHN_TEMPLATES.text(ecoEscape(ECO_PET_TYPES[id]?.[1] || "Character")),
                  window.SHN_TEMPLATES.text(ecoEscape(p.name)),
                  window.SHN_TEMPLATES.text(id),
                  window.SHN_TEMPLATES.text(qty),
                  window.SHN_TEMPLATES.text(id),
                  window.SHN_TEMPLATES.text(ecoEscape(p.name)),
                  window.SHN_TEMPLATES.text(id),
                ]);
              })
              .join("")
          : `<div class="eco-basket-empty"><h3>Nothing in your basket yet.</h3><p>Start with one favourite, then add any others you like.</p>${a("/shop/pets", "Browse pet keychains ↗", "button primary")}</div>`,
      ),
      window.SHN_TEMPLATES.text(a("/shop/pets", "+ Add another design", "button ghost")),
      window.SHN_TEMPLATES.text(a("/shop/request?type=pet", "Make my own pet", "button ghost")),
      window.SHN_TEMPLATES.text(n ? ecoToman(ecoPetPrice(n)) : "0 Toman"),
      window.SHN_TEMPLATES.text(
        n === 1
          ? "One keychain"
          : n === 2
            ? "Two keychains, any combination"
            : n === 3
              ? "Three keychains, any combination"
              : n >= 4
                ? `${n} keychains, any combination`
                : "Add a design to begin",
      ),
      window.SHN_TEMPLATES.text(
        n ? window.SHN_TEMPLATES.render("as/10-application/ecoBasketPage-63", []) : "",
      ),
    ]);
  }
  const ecoShopCategoryV4 = shopCategory;
  shopCategory = function (id) {
    let html = ecoShopCategoryV4(id);
    return id === "family" ? html.split(ECO_FAMILY).join(ECO_FAMILY_V4) : html;
  };
  const ecoBindV4 = bind;
  bind = function () {
    ecoBindV4();
    ecoBasketBadge();
    document
      .querySelectorAll("[data-eco-scroll]")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          document
            .getElementById(btn.dataset.ecoScroll)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        ),
      );
    document.querySelectorAll("[data-eco-add]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const qty = document.querySelector("#ecoQty");
        ecoAddItem(btn.dataset.ecoAdd, qty ? qty.value : 1, btn);
      }),
    );
    document.querySelectorAll("[data-eco-basket-qty]").forEach((input) =>
      input.addEventListener("change", () => {
        const items = ecoBasketRead(),
          n = Math.max(1, Math.min(99, Math.round(Number(input.value) || 1)));
        items[input.dataset.ecoBasketQty] = n;
        ecoBasketSave(items);
        setTimeout(render, 0);
      }),
    );
    document.querySelectorAll("[data-eco-remove]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const items = ecoBasketRead();
        delete items[btn.dataset.ecoRemove];
        ecoBasketSave(items);
        setTimeout(render, 0);
      }),
    );
    const photo = document.querySelector("#ecoReference");
    if (photo) {
      photo.addEventListener("change", () => {
        const file = photo.files?.[0],
          stage = document.querySelector("#ecoLivePhoto");
        if (stage) {
          if (stage.dataset.url) URL.revokeObjectURL(stage.dataset.url);
          if (file && file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            stage.dataset.url = url;
            stage.innerHTML = `<img src="${url}" alt="Your chosen pet photo"><small>Your photo, ready for the brief</small>`;
          } else stage.innerHTML = window.SHN_TEMPLATES.render("as/10-application/view-64", []);
        }
      });
      const form = document.querySelector("#ecoRequestForm");
      if (form)
        form.addEventListener(
          "submit",
          async (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!form.reportValidity()) return;
            const file = photo.files?.[0];
            if (!file || !file.type.startsWith("image/")) return;
            const data = Object.fromEntries(
              [...new FormData(form).entries()].filter(([k, v]) => !(v instanceof File)),
            );
            const esc = (v) =>
              String(v || "").replace(
                /[&<>"']/g,
                (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
              );
            const photoData = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            });
            const body = window.SHN_TEMPLATES.render("as/10-application/body-65", [
              window.SHN_TEMPLATES.text(esc(data.type || "pet")),
              window.SHN_TEMPLATES.text(photoData),
              window.SHN_TEMPLATES.text(
                Object.entries(data)
                  .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
                  .join(""),
              ),
              window.SHN_TEMPLATES.text(esc(file.name)),
            ]);
            const url = URL.createObjectURL(new Blob([body], { type: "text/html;charset=utf-8" })),
              link = document.createElement("a");
            link.href = url;
            link.download = "AS Shop-custom-" + Date.now() + ".html";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            const status = document.querySelector("#ecoRequestMessage");
            if (status)
              status.textContent =
                "Your photo and details were saved as a shareable brief. Nothing has been sent or paid.";
          },
          { capture: true },
        );
    }
    const basketForm = document.querySelector("#ecoBasketForm");
    if (basketForm)
      basketForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!basketForm.reportValidity()) return;
        const items = ecoBasketRead(),
          n = ecoBasketCount(items),
          fields = Object.fromEntries(new FormData(basketForm));
        const body = [
          "AS INDUSTRIES / AS Shop ORDER BRIEF",
          "",
          "DESIGNS",
          ...Object.entries(items).map(
            ([id, qty]) => `${ECO_PETS_V3.find((p) => p.id === id)?.name || id} × ${qty}`,
          ),
          "",
          `Total quantity: ${n}`,
          `Estimated products: ${ecoToman(ecoPetPrice(n))}`,
          "Delivery: confirmed separately",
          "تحویل: تأیید جداگانه",
          "CONTACT",
          ...Object.entries(fields).map(([k, v]) => `${k}: ${v}`),
          "",
          "Offline preview: no order was sent and no payment was taken.",
        ].join("\n");
        const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" })),
          link = document.createElement("a");
        link.href = url;
        link.download = "AS Shop-mixed-basket-order.txt";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        document.querySelector("#ecoBasketStatus").textContent =
          "Brief saved. Nothing has been sent or paid.";
      });
  };

  const ECO_CREATE_HERO = "/assets/as_shop/media/damaged/6cdec6d6956592e90474.base64.txt";
  const ecoShopLandingV5 = shopLanding;
  shopLanding = function () {
    let html = ecoShopLandingV5();
    const hero = window.SHN_TEMPLATES.render("as/10-application/hero-66", [
      window.SHN_TEMPLATES.text(ECO_CREATE_HERO),
    ]);
    return html.replace(/<section class="eco-shop-hero">[\s\S]*?<\/section>/, hero);
  };

  const AS_HERO_PETS = "/assets/as_shop/media/images/5e09f3a274fd2dd0f443.png";
  const AS_HERO_FAMILY = "/assets/as_shop/media/images/0a76cb018ed496c94997.png";
  const AS_HERO_SLIDES = [
    {
      id: "pets",
      label: "Custom pet keychains",
      kicker: "01 / AS Shop · PHOTO TO OBJECT",
      title: "Your pet.<br>Made real.",
      copy: "A favourite photo becomes a little companion you can carry. Choose a ready design or create one around your own pet.",
      href: "/shop",
      cta: "Explore the Shop ↗",
      secondary: "/shop/pets",
      secondaryText: "See pet keychains",
      image: `<img class="as-slide-image" src="${AS_HERO_PETS}" alt="Three complete custom pet keychain figurines in a modern 3D-printing studio" loading="eager">`,
    },
    {
      id: "family",
      label: "Family figurines",
      kicker: "02 / AS Shop · MADE FROM YOUR PHOTO",
      title: "Your people.<br>In miniature.",
      copy: "Turn a family moment into a playful, personal figure. We review the photo and details with you before it is made.",
      href: "/shop/family",
      cta: "Explore family figures ↗",
      secondary: "/shop",
      secondaryText: "Visit the Shop",
      image: `<img class="as-slide-image" src="${AS_HERO_FAMILY}" alt="A complete family figurine set made from a family photograph in a warm design studio" loading="lazy">`,
    },
    {
      id: "printing",
      label: "3D printing",
      kicker: "03 / AS INDUSTRIES · ADDITIVE MAKING",
      title: "From model.<br>To matter.",
      copy: "Prototype a part, test a fit, or bring a one-off product into the physical world with 3D printing.",
      href: "/services/3d-printing/workspace",
      cta: "Start a 3D print ↗",
      secondary: "/services",
      secondaryText: "Explore services",
      image: image(
        "cinema-print",
        "Precision 3D printed objects and manufacturing equipment",
        "as-slide-image",
      ),
    },
    {
      id: "laser",
      label: "Laser cutting",
      kicker: "04 / AS INDUSTRIES · PRECISION FABRICATION",
      title: "Precision in<br>every cut.",
      copy: "Shape detailed profiles from sheet material, then move from a drawing to a finished component.",
      href: "/services/laser-cutting",
      cta: "Explore laser cutting ↗",
      secondary: "/services",
      secondaryText: "All services",
      image: image(
        "cinema-laser",
        "Precision laser cutting in an industrial workshop",
        "as-slide-image",
      ),
    },
    {
      id: "ideas",
      label: "Product ideas",
      kicker: "05 / AS INDUSTRIES · DESIGN TO PRODUCTION",
      title: "Have an idea?<br>Let’s make it.",
      copy: "From a sketch or a reference photo to a designed, tested object. Tell us what you have in mind.",
      href: "/engineering/start",
      cta: "Start with an idea ↗",
      secondary: "/partners",
      secondaryText: "Meet our partners",
      image: image("cinema-studio", "Product design and manufacturing studio", "as-slide-image"),
    },
  ];
  const asPreviousHome = home;
  home = function () {
    const old = asPreviousHome();
    const carousel = window.SHN_TEMPLATES.render("as/10-application/carousel-67", [
      window.SHN_TEMPLATES.text(
        AS_HERO_SLIDES.map((slide, i) =>
          window.SHN_TEMPLATES.render("as/10-application/carousel-68", [
            window.SHN_TEMPLATES.text(i === 0 ? "is-active" : ""),
            window.SHN_TEMPLATES.text(i),
            window.SHN_TEMPLATES.text(i + 1),
            window.SHN_TEMPLATES.text(AS_HERO_SLIDES.length),
            window.SHN_TEMPLATES.text(slide.label),
            window.SHN_TEMPLATES.text(i !== 0),
            window.SHN_TEMPLATES.text(i !== 0 ? "inert" : ""),
            window.SHN_TEMPLATES.text(slide.image),
            window.SHN_TEMPLATES.text(slide.kicker),
            window.SHN_TEMPLATES.text(i === 0 ? "h1" : "h2"),
            window.SHN_TEMPLATES.text(slide.title),
            window.SHN_TEMPLATES.text(i === 0 ? "h1" : "h2"),
            window.SHN_TEMPLATES.text(slide.copy),
            window.SHN_TEMPLATES.text(slide.href),
            window.SHN_TEMPLATES.text(slide.cta),
            window.SHN_TEMPLATES.text(slide.secondary),
            window.SHN_TEMPLATES.text(slide.secondaryText),
          ]),
        ).join(""),
      ),
      window.SHN_TEMPLATES.text(
        AS_HERO_SLIDES.map(
          (slide, i) =>
            `<button type="button" data-as-go="${i}" aria-label="Show ${slide.label}" aria-pressed="${i === 0}"></button>`,
        ).join(""),
      ),
      window.SHN_TEMPLATES.text(AS_HERO_SLIDES.length),
    ]);
    return old.replace(/<section class="cinema-hero">[\s\S]*?<\/section>/, carousel);
  };
  const asPreviousBind = bind;
  bind = function () {
    asPreviousBind();
    const root = document.getElementById("asHomeCarousel");
    if (!root) return;
    const slides = [...root.querySelectorAll(".as-home-slide")],
      dots = [...root.querySelectorAll("[data-as-go]")],
      counter = root.querySelector("#asHomeSlideNumber"),
      pause = root.querySelector(".as-home-pause"),
      motion = matchMedia("(prefers-reduced-motion: reduce)");
    let active = 0,
      paused = motion.matches;
    const show = (n) => {
      active = (n + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const on = i === active;
        slide.classList.toggle("is-active", on);
        slide.setAttribute("aria-hidden", String(!on));
        slide.inert = !on;
      });
      dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === active)));
      counter.textContent = String(active + 1).padStart(2, "0");
    };
    root.querySelector("[data-as-prev]").onclick = () => show(active - 1);
    root.querySelector("[data-as-next]").onclick = () => show(active + 1);
    dots.forEach((dot) => (dot.onclick = () => show(Number(dot.dataset.asGo))));
    pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? "▶" : "Ⅱ";
    pause.setAttribute("aria-label", paused ? "Resume automatic slides" : "Pause automatic slides");
    pause.onclick = () => {
      paused = !paused;
      pause.setAttribute("aria-pressed", String(paused));
      pause.setAttribute(
        "aria-label",
        paused ? "Resume automatic slides" : "Pause automatic slides",
      );
      pause.textContent = paused ? "▶" : "Ⅱ";
    };
    const timer = setInterval(() => {
      const content = slides[active];
      if (!paused && !document.hidden && !content.contains(document.activeElement))
        show(active + 1);
    }, 6500);
    const oldDispose = dispose;
    dispose = () => {
      clearInterval(timer);
      oldDispose();
    };
  };

  const AS_SHOP_SPOTLIGHT = "/assets/as_shop/media/images/824d2094bc95443b843d.png";
  const asHomeBeforeShop = home;
  home = function () {
    const html = asHomeBeforeShop();
    const spotlight = window.SHN_TEMPLATES.render("as/10-application/spotlight-69", [
      window.SHN_TEMPLATES.text(AS_SHOP_SPOTLIGHT),
    ]);
    const marker = '<section class="wrap section everyday">';
    const start = html.indexOf(marker);
    if (start < 0) return html;
    const end = html.indexOf("</section>", start);
    if (end < 0) return html;
    return html.slice(0, start) + spotlight + html.slice(end + 10);
  };

  const AS_SN_LOGO = "/assets/as_shop/media/images/26e3439134f9bd39539d.png";
  window.setSiteLanguage = (value) => {
    lang = value;
    window.SITE_LANGUAGE = value;
    render();
  };
  /* Customer quote and buying flow; geometry remains on the customer's device. */
  const CUSTOMER_PROFILES = [
    ["LIGHT", "Light", "سبک", 10, 2],
    ["STANDARD", "Medium", "متوسط", 20, 3],
    ["REINFORCED", "Strong", "محکم", 30, 4],
  ];
  state.print.material = "PLA";
  /** customerGeometry: application feature. Keep related handlers in this module. */
  function customerGeometry(model) {
    if (!model) return null;
    let area = 0,
      horizontal = 0;
    const bodies = new Map();
    /** triangle: application feature. Keep related handlers in this module. */
    function triangle(a, b, c, key) {
      const x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        u = c[0] - a[0],
        v = c[1] - a[1],
        w = c[2] - a[2],
        nx = y * w - z * v,
        ny = z * u - x * w,
        nz = x * v - y * u;
      area += Math.hypot(nx, ny, nz) / 2;
      horizontal += Math.abs(nz) / 2;
      const vol =
        (a[0] * (b[1] * c[2] - b[2] * c[1]) +
          a[1] * (b[2] * c[0] - b[0] * c[2]) +
          a[2] * (b[0] * c[1] - b[1] * c[0])) /
        6;
      bodies.set(key, (bodies.get(key) || 0) + vol);
    }
    if (model.parts)
      for (const p of model.parts) {
        const pos = p.positions,
          idx = p.indices;
        const point = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
        if (idx?.length)
          for (let i = 0; i + 2 < idx.length; i += 3)
            triangle(point(idx[i]), point(idx[i + 1]), point(idx[i + 2]), pos);
        else
          for (let i = 0; i + 8 < pos.length; i += 9)
            triangle(pos.slice(i, i + 3), pos.slice(i + 3, i + 6), pos.slice(i + 6, i + 9), pos);
      }
    else for (const tri of model.triangles || []) triangle(...tri, model);
    const volume = [...bodies.values()].reduce((sum, v) => sum + Math.abs(v), 0);
    return volume > 0 && Number.isFinite(area) ? { volume, area, horizontal } : null;
  }
  estimatedMassGrams = function (s) {
    if (!s.uploaded || !s.analyzed || s.reviewNeeded) return null;
    const model = s.renderModel || s.mesh;
    if (s.customerModel !== model) {
      s.customerModel = model;
      s.customerGeometry = customerGeometry(model);
    }
    const g = s.customerGeometry;
    if (!g) return null;
    const densities = {
      PLA: 1.24,
      PETG: 1.27,
      ABS: 1.04,
      ASA: 1.07,
      TPU: 1.21,
      NYLON: 1.14,
      PC: 1.2,
      CF_NYLON: 1.15,
    };
    const shell = Math.min(
      g.volume,
      Math.max(0, g.area - g.horizontal) * s.walls * 0.4 +
        g.horizontal * ((s.topLayers + s.bottomLayers) / 2) * 0.2,
    );
    return (
      ((shell + ((g.volume - shell) * s.density) / 100) / 1000) * (densities[s.material] || 1.24)
    );
  };
  estimate = function (type) {
    if (type !== "print") return null;
    const s = state.print,
      grams = estimatedMassGrams(s);
    if (grams === null) return null;
    return { grams, rate: 8000, unit: grams * 8000, total: grams * 8000 * s.qty };
  };
  const customerWorkspaceBefore = workspace;
  workspace = function (type) {
    return customerWorkspaceBefore(type)
      .replace(/<nav class="steps"[\s\S]*?<\/nav>/, "")
      .replace(/<div class="step-footer">[\s\S]*?<\/div>/, "")
      .replace(".stl,.obj,.step,.stp,.3mf", ".stl,.obj,.step,.stp,.3mf,.dxf,.svg,.pdf,.ai")
      .replace("STL · OBJ · STEP · 3MF", "STL · STEP · OBJ · 3MF · DXF")
      .replace(
        t(
          "No fixed file-size limit; available device memory matters.",
          "محدودیت ثابتی برای حجم فایل نیست؛ ظرفیت حافظهٔ دستگاه تعیین‌کننده است.",
        ),
        t(
          "Up to 250 MB. STL/OBJ dimensions are assumed to be millimeters.",
          "تا ۲۵۰ مگابایت. واحد STL و OBJ میلی‌متر فرض می‌شود.",
        ),
      );
  };
  /** customerQuote: application feature. Keep related handlers in this module. */
  function customerQuote(type) {
    const s = state[type],
      e = estimate(type);
    return `<section class="customer-estimate" aria-live="polite"><h3>${t("Your approximate estimate", "برآورد تقریبی شما")}</h3>${type === "print" ? `<div class="customer-totals"><div><small>${t("Weight per part", "وزن هر قطعه")}</small><strong>${e ? num(Math.round(e.grams * 10) / 10) + " " + t("g", "گرم") : "—"}</strong></div><div><small>${t("Total for", "جمع برای")} ${num(s.qty)} ${t("parts", "قطعه")}</small><strong>${e ? money(Math.round(e.total)) : "—"}</strong></div></div><p>${t("PLA reference rate: 8,000 Toman per gram. For other materials this is a comparison estimate; their actual rate is confirmed in the final quote.", "مبنای PLA: هر گرم ۸٬۰۰۰ تومان. برای مواد دیگر، این عدد صرفاً برآورد مقایسه‌ای است؛ نرخ واقعی در پیشنهاد نهایی تأیید می‌شود.")}</p><p>${e ? t("Approximate mesh estimate, not a slicer result. Supports, orientation, finishing and delivery may change the final price.", "این عدد از هندسهٔ مش تخمین زده شده و خروجی اسلایسر نیست. ساپورت، جهت چاپ، پرداخت و ارسال می‌توانند قیمت نهایی را تغییر دهند.") : t("Upload a valid solid model to see weight and price. Review-only files have no automatic estimate.", "برای نمایش وزن و قیمت، مدل حجمی معتبر انتخاب کنید. فایل‌های نیازمند بررسی، برآورد خودکار ندارند.")}</p>` : `<p>${t("Laser cutting is quoted after reviewing contours, units, material and thickness. The filament price per gram does not apply.", "قیمت برش لیزری پس از بررسی مسیرها، واحد، جنس و ضخامت اعلام می‌شود. تعرفهٔ گرم فیلامنت برای برش لیزری کاربرد ندارد.")}</p>`}</section>`;
  }
  materialEstimateCard = function () {
    return "";
  };
  config = function (type) {
    const s = state[type],
      print = type === "print",
      m = (print ? materials : metals).find((x) => x.id === s.material);
    const body = $("#configBody");
    if (!body) return;
    body.innerHTML = window.SHN_TEMPLATES.render("as/10-application/view-70", [
      window.SHN_TEMPLATES.text(t("Make your part, in three steps.", "ساخت قطعه در سه قدم.")),
      window.SHN_TEMPLATES.text(
        t(
          "1. Choose a file · 2. Choose the details · 3. Request a final quote",
          "۱. انتخاب فایل · ۲. انتخاب مشخصات · ۳. دریافت برآورد نهایی",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Material", "جنس")),
      window.SHN_TEMPLATES.text(materialPicker(type)),
      window.SHN_TEMPLATES.text(tx(m.desc || m.detail)),
      window.SHN_TEMPLATES.text(
        print
          ? window.SHN_TEMPLATES.render("as/10-application/view-71", [
              window.SHN_TEMPLATES.text(t("Colour", "رنگ")),
              window.SHN_TEMPLATES.text(colName(s.color)),
              window.SHN_TEMPLATES.text(colors.find((x) => x[0] === s.color)?.[1]),
              window.SHN_TEMPLATES.text(t("Colour sample", "نمونهٔ رنگ")),
              window.SHN_TEMPLATES.text(palette(s.color)),
              window.SHN_TEMPLATES.text(t("How will you use it?", "برای چه کاربردی؟")),
              window.SHN_TEMPLATES.text(
                CUSTOMER_PROFILES.map(
                  ([id, en, fa, d, w]) =>
                    `<button type="button" data-profile="${id}" aria-pressed="${s.strength === id}"><strong>${t(en, fa)}</strong><span>${num(d)}% Gyroid · ${num(w)} ${t("walls", "دیواره")}</span><small>${id === "LIGHT" ? t("Visual models", "مدل نمایشی") : id === "STANDARD" ? t("Everyday use", "کاربرد روزمره") : t("More material; review load", "مواد بیشتر؛ بررسی بار")}</small></button>`,
                ).join(""),
              ),
              window.SHN_TEMPLATES.text(
                t(
                  "Starting profiles: 0.2 mm layers, 0.4 mm nozzle. Strength also depends on geometry, material and print direction.",
                  "تنظیم اولیه: لایهٔ ۰٫۲ و نازل ۰٫۴ میلی‌متر. استحکام به هندسه، جنس و جهت چاپ هم بستگی دارد.",
                ),
              ),
            ])
          : `<label class="field">${t("Sheet thickness (mm)", "ضخامت ورق (میلی‌متر)")}<input id="thickness" type="number" min="0.01" step="any" value="${s.thickness}"></label>`,
      ),
      window.SHN_TEMPLATES.text(t("Quantity", "تعداد")),
      window.SHN_TEMPLATES.text(s.qty),
      window.SHN_TEMPLATES.text(customerQuote(type)),
      window.SHN_TEMPLATES.text(t("Receive an exact quote", "دریافت قیمت دقیق")),
      window.SHN_TEMPLATES.text(
        t(
          "Enter your phone or email. Within 24 hours of receiving your file and brief, we will send the exact price and the required number of business days. Production starts after your approval.",
          "شماره تلفن یا ایمیلتان را وارد کنید. ظرف ۲۴ ساعت پس از دریافت فایل و شرح درخواست، قیمت دقیق و تعداد روزهای کاری موردنیاز را اعلام می‌کنیم. ساخت پس از تأیید شما شروع می‌شود.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Phone or email", "شماره تلفن یا ایمیل")),
      window.SHN_TEMPLATES.text(escape(s.contact || "")),
      window.SHN_TEMPLATES.text(
        t("Application, deadline or notes (optional)", "کاربرد، زمان موردنیاز یا توضیح (اختیاری)"),
      ),
      window.SHN_TEMPLATES.text(escape(s.notes || "")),
      window.SHN_TEMPLATES.text(t("Prepare my quote request ↓", "آماده‌کردن درخواست برآورد ↓")),
      window.SHN_TEMPLATES.text(
        t(
          "Save this request and share it with the studio together with the original file. This offline page does not send files.",
          "درخواست را ذخیره کنید و همراه فایل اصلی برای مجموعه بفرستید. این صفحهٔ آفلاین فایل‌ها را ارسال نمی‌کند.",
        ),
      ),
    ]);
    $$("[data-material]").forEach(
      (b) =>
        (b.onclick = () => {
          s.material = b.dataset.material;
          config(type);
          drawPreview(type);
        }),
    );
    $$("[data-color]").forEach(
      (b) =>
        (b.onclick = () => {
          s.color = b.dataset.color;
          config(type);
          drawPreview(type);
        }),
    );
    $$("[data-profile]").forEach(
      (b) =>
        (b.onclick = () => {
          const p = CUSTOMER_PROFILES.find((x) => x[0] === b.dataset.profile);
          Object.assign(s, {
            strength: p[0],
            density: p[3],
            walls: p[4],
            infill: "gyroid",
            topLayers: 5,
            bottomLayers: 5,
            nozzle: "0.4",
            quality: "STANDARD",
          });
          config(type);
        }),
    );
    $("#quantity").oninput = (e) => {
      s.qty = Math.max(1, Math.min(10000, Math.round(Number(e.target.value) || 1)));
      $("#customerQuote").innerHTML = customerQuote(type);
    };
    if (!print)
      $("#thickness").oninput = (e) => {
        s.thickness = e.target.value;
      };
    $("#customerContact").oninput = (e) => (s.contact = e.target.value);
    $("#customerNotes").oninput = (e) => (s.notes = e.target.value);
    $("#customerContactForm").onsubmit = (e) => {
      e.preventDefault();
      const contact = (s.contact || "").trim(),
        normalized = contact
          .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
          .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) &&
        !/^\+?[\d\s()-]{7,20}$/.test(normalized)
      ) {
        $("#customerMessage").textContent = t(
          "Enter a valid phone number or email.",
          "شماره تلفن یا ایمیل معتبر وارد کنید.",
        );
        return;
      }
      if (!s.uploaded) {
        $("#customerMessage").textContent = t(
          "Choose your file first.",
          "ابتدا فایل قطعه را انتخاب کنید.",
        );
        return;
      }
      const estimateNow = estimate(type);
      const brief = {
        file: s.file,
        process: type,
        material: s.material,
        color: print ? s.color : undefined,
        profile: print ? s.strength : undefined,
        printSettings: print ? advancedValues(s) : undefined,
        infill: print ? s.density : undefined,
        walls: print ? s.walls : undefined,
        quantity: s.qty,
        thickness: print ? undefined : s.thickness,
        approximateWeightGrams: estimateNow?.grams,
        referenceRateTomanPerGram: print ? 8000 : undefined,
        approximateTotalToman: estimateNow?.total,
        contact: normalized,
        notes: s.notes,
        notice: t(
          "Attach the original file. Final price and business days are confirmed within 24 hours after receipt.",
          "فایل اصلی را پیوست کنید. قیمت نهایی و تعداد روزهای کاری ظرف ۲۴ ساعت پس از دریافت اعلام می‌شود.",
        ),
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(brief, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "AS-quote-request.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $("#customerMessage").textContent = t(
        "Request prepared. Share it and your original file with the studio to receive the final quote.",
        "درخواست آماده شد. برای دریافت برآورد نهایی، آن را همراه فایل اصلی برای مجموعه بفرستید.",
      );
    };
  };
  let customerPendingFile = null;
  const customerUploadBefore = upload;
  upload = async function (type, file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (type === "print" && ["dxf", "svg", "pdf", "ai"].includes(ext)) {
      customerPendingFile = file;
      location.hash = "#/services/laser-cutting/workspace";
      return;
    }
    if (type === "print" && ext === "3mf") {
      if (!file.size || file.size > MAX_MODEL_BYTES) {
        toast(
          t("Choose a non-empty file up to 250 MB.", "فایل غیرخالی تا ۲۵۰ مگابایت انتخاب کنید."),
        );
        return;
      }
      disposeSolidViewer();
      Object.assign(state.print, {
        file: file.name,
        uploaded: true,
        analyzed: false,
        reviewNeeded: true,
        mesh: null,
        renderModel: null,
        customerGeometry: null,
      });
      $("#fileName").textContent = file.name;
      $("#fileStatus").textContent = t(
        "3MF accepted for engineering review; no automatic estimate.",
        "فایل 3MF برای بررسی مهندسی پذیرفته شد؛ برآورد خودکار ندارد.",
      );
      $("#modelCanvas").hidden = true;
      $("#previewFallback").hidden = false;
      config(type);
      return;
    }
    await customerUploadBefore(type, file);
    if (state[type].uploaded) config(type);
  };
  const customerBindWorkspaceBefore = bindWorkspace;
  bindWorkspace = function (type) {
    customerBindWorkspaceBefore(type);
    if (type === "laser" && customerPendingFile) {
      const file = customerPendingFile;
      customerPendingFile = null;
      upload(type, file);
    }
  };
  /** customerBundles: application feature. Keep related handlers in this module. */
  function customerBundles() {
    return window.SHN_TEMPLATES.render("as/10-application/customerBundles-72", [
      window.SHN_TEMPLATES.text(
        t("Choose your keychain bundle", "بستهٔ جاکلیدی‌تان را انتخاب کنید"),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Mix any pictured designs. Prices are for the complete bundle, not each piece. Custom designs and shipping are quoted separately.",
          "از میان طرح‌های آماده، ترکیب دلخواهتان را بسازید. قیمت‌ها برای کل بسته‌اند. طرح اختصاصی و هزینهٔ ارسال جداگانه بررسی می‌شوند.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        [1, 2, 3]
          .map(
            (n) =>
              `<button data-bundle-target="${n}"><small>${num(n)} ${t("keychains", "جاکلیدی")}</small><strong>${ecoToman(ecoPetPrice(n))}</strong><span>${n === 1 ? t("One favourite design", "یک طرح دلخواه") : t("Save", "صرفه‌جویی") + " " + ecoToman(n * 350000 - ecoPetPrice(n))}</span><b>${t("Choose designs", "انتخاب طرح‌ها")} ↗</b></button>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Choose designs → Check your basket → Share the order brief → Confirm availability, delivery and payment.",
          "انتخاب طرح‌ها ← بررسی سبد ← ارسال شرح سفارش ← تأیید موجودی، زمان تحویل و پرداخت.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Review my basket", "بررسی سبد من")),
    ]);
  }
  const customerPetShopBefore = petShop;
  petShop = function () {
    const html = customerPetShopBefore();
    const end = html.indexOf("</section>");
    return html.slice(0, end + 10) + customerBundles() + html.slice(end + 10);
  };
  const customerShopBefore = shopLanding;
  shopLanding = function () {
    const html = customerShopBefore();
    const end = html.indexOf("</section>");
    return html.slice(0, end + 10) + customerBundles() + html.slice(end + 10);
  };
  const customerPetDetailBefore = petDetail;
  petDetail = function (id) {
    return customerPetDetailBefore(id) + customerBundles();
  };
  const customerBadgeBefore = ecoBasketBadge;
  ecoBasketBadge = function () {
    customerBadgeBefore();
    const el = $("#customerBundleProgress");
    if (el) {
      const count = ecoBasketCount(),
        target = Number(localStorage.getItem("as-bundle-target") || 0);
      el.textContent =
        t("In your basket: ", "در سبد شما: ") +
        num(count) +
        " · " +
        ecoToman(count ? ecoPetPrice(count) : 0) +
        (target > count
          ? " · " +
            t("Choose ", "انتخاب کنید: ") +
            num(target - count) +
            " " +
            t("more", "جاکلیدی دیگر")
          : "");
    }
  };
  const customerBindBefore = bind;
  bind = function () {
    customerBindBefore();
    $$("[data-bundle-target]").forEach(
      (b) =>
        (b.onclick = () => {
          localStorage.setItem("as-bundle-target", b.dataset.bundleTarget);
          if (!$("#ecoPetGrid")) {
            location.hash = "#/shop/pets";
            return;
          }
          ecoBasketBadge();
          $("#ecoPetGrid").scrollIntoView({ behavior: "smooth", block: "start" });
        }),
    );
    ecoBasketBadge();
  };
  window.CUSTOMER_TEST = {
    geometry: customerGeometry,
    profiles: CUSTOMER_PROFILES,
    weight: estimatedMassGrams,
    estimate,
  };

  /* Keep the original site components; only separate the shop's routing and navigation. */
  const separatedShop = window.CONNECTED_SITE === "shop" || window.AS_SITE === "shop";
  const originalSplitLogo = logo;
  logo = function () {
    return separatedShop ? originalSplitLogo().replace("INDUSTRIES", "SHOP") : originalSplitLogo();
  };
  /** splitShopLinks: application feature. Keep related handlers in this module. */
  function splitShopLinks(root) {
    root.querySelectorAll('a[href^="#/"]').forEach((link) => {
      const route = link.getAttribute("href").slice(1);
      const shopRoute = /^\/(shop|nixa)(\/|$)/.test(route);
      if (!separatedShop && shopRoute) link.setAttribute("href", "AS-Shop.html#" + route);
      else if (
        separatedShop &&
        !shopRoute &&
        !/^\/(partners|account|contact|consultation|about|cart|quotes|request-sent)(\/|$)/.test(route) &&
        route !== "/"
      )
        link.setAttribute("href", "AS-Industries-Offline-v8.html#" + route);
    });
  }
  const originalSplitShell = shell;
  shell = function () {
    originalSplitShell();
    if (separatedShop) {
      $("#mainNav").innerHTML = [
        ["/shop", "SHOP"],
        ["/shop/pets", t("Pet keychains", "جاکلیدی حیوانات")],
        ["/shop/family", t("Family figurines", "فیگور خانوادگی")],
        ["/shop/kitchen", t("Kitchen", "آشپزخانه")],
        ["/partners", t("Partners", "پارتنرها")],
      ]
        .map(([r, label]) => a(r, label))
        .join("");
      $("#siteHeader .brand").setAttribute("aria-label", "AS Shop");
    } else {
      const entry = $('#mainNav a[href="#/shop"]');
      if (entry) entry.textContent = "AS SHOP";
    }
    splitShopLinks($("#siteHeader"));
    splitShopLinks($("#siteFooter"));
  };
  const originalSplitBind = bind;
  bind = function () {
    originalSplitBind();
    splitShopLinks($("#app"));
    if (separatedShop) document.title = "AS Shop";
  };
  /* Shop products live in AS Shop; retain the existing industrial carousel design. */
  if (!separatedShop) {
    AS_HERO_SLIDES.splice(
      0,
      AS_HERO_SLIDES.length,
      ...AS_HERO_SLIDES.filter((slide) => !/^\/shop/.test(slide.href)),
    );
    const originalIndustryHome = home;
    home = function () {
      return originalIndustryHome().replace(
        /<section class="as-shop-spotlight"[\s\S]*?<\/section>/,
        "",
      );
    };
  }
  const originalSplitPartners = partnersPage;
  partnersPage = function () {
    let html = originalSplitPartners()
      .replace("Two studios.<br>One connected journey.", t("Partners", "پارتنرها"))
      .replace("ENGINEERING / FABRICATION / SHOP", "ENGINEERING / FABRICATION")
      .replace(
        "Prototyping, 3D printing, custom parts and personal products.",
        t(
          "Prototyping, 3D printing and custom parts.",
          "نمونه‌سازی، چاپ سه‌بعدی و ساخت قطعات اختصاصی.",
        ),
      );
    html = html.replace("${logo()}", logo());
    html = html.replace(
      /<div class="eco-partner-logo"><span class="as-wordmark" dir="ltr">AS<span>SHOP<\/span><\/span><\/div>/,
      '<div class="eco-partner-logo"><span class="as-wordmark" dir="ltr">AS<span>INDUSTRIES</span></span></div>',
    );
    html = html.replace(
      /<a href="#\/shop"[^>]*>Explore AS Shop ↗<\/a>/,
      '<a class="button primary" href="AS-Industries-Offline-v8.html#/">' +
        t("Visit AS Industries ↗", "ورود به AS Industries ↗") +
        "</a>",
    );
    const card = window.SHN_TEMPLATES.render("as/10-application/card-73", [
      window.SHN_TEMPLATES.text(t("SHOP / PERSONAL PRODUCTS", "فروشگاه / محصولات شخصی")),
      window.SHN_TEMPLATES.text(
        t(
          "Pet keychains, photo figurines and kitchen products.",
          "جاکلیدی حیوانات، فیگور از روی عکس و محصولات آشپزخانه.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Visit AS Shop ↗", "ورود به AS Shop ↗")),
    ]);
    return html.replace("</article></section>", "</article>" + card + "</section>");
  };
  const originalSplitEcosystem = ecosystemPartners;
  ecosystemPartners = function () {
    return originalSplitEcosystem()
      .replace("Engineering, manufacturing & shop", "Engineering & manufacturing")
      .replace("Two studios.<br>One connected path.", t("Partners", "پارتنرها"))
      .replace(
        "</div></div></section>",
        `<a href="AS-Shop.html#/shop" class="partner-logo-card"><span><span class="as-wordmark" dir="ltr">AS<span>SHOP</span></span><small>${t("Keychains & personal products", "جاکلیدی و محصولات شخصی")}</small></span><b>↗</b></a></div></div></section>`,
      );
  };

  ecoPetPrice = function (n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    return n === 0 ? 0 : n === 1 ? 350000 : n === 2 ? 500000 : n === 3 ? 700000 : n * 200000;
  };
  Object.assign(window.SITE_FA, {
    "Your little collection.": "سبد خرید شما",
    "From your photos": "از عکس حیوان شما",
    "to a little companion.": "تا جاکلیدی اختصاصی",
    "Choose your keychain bundle": "تعداد جاکلیدی را انتخاب کنید",
    "Choose designs": "انتخاب طرح‌ها",
    "Simple quantity pricing": "قیمت بر اساس تعداد",
    "Mix & match bundle pricing": "قیمت بر اساس تعداد",
    "Original product reference · the complete keychain and ring":
      "تصویر محصول همراه با حلقهٔ جاکلیدی",
    "See how your pet could become a keychain.": "از عکس حیوانتان جاکلیدی بسازید",
    "Your pet goes here": "عکس حیوانتان را انتخاب کنید",
    "YOUR PHOTO → YOUR MINIATURE": "از عکس تا جاکلیدی",
    "Your people.": "عکس خانوادگی شما،",
    "In miniature.": "به شکل فیگور",
    "Little things.": "جاکلیدی و فیگور",
    "Made to keep.": "برای خودتان یا هدیه",
    "3D printed with care": "ساخته‌شده با چاپ سه‌بعدی",
    "Photo-to-object requests": "ساخت از روی عکس",
    "One favourite design": "یک طرح دلخواه",
    "All keychains": "همهٔ جاکلیدی‌ها",
    "Prepare your request": "ثبت مشخصات سفارش",
  });
  function picturedBundle(n) {
    return `<div class="bundle-pictures" aria-label="${num(n)} ${t("keychains", "جاکلیدی")}">${ECO_PETS_V3.slice(
      0,
      n,
    )
      .map((p) => ecoTile(p.id))
      .join("")}</div>`;
  }
  customerBundles = function () {
    return window.SHN_TEMPLATES.render("as/10-application/view-74", [
      window.SHN_TEMPLATES.text(
        t("Choose how many keychains you want", "تعداد جاکلیدی را انتخاب کنید"),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Mix any ready designs. Each price below is the total for the bundle.",
          "می‌توانید طرح‌های مختلف را با هم انتخاب کنید. مبلغ زیر هر تصویر، قیمت کل بسته است.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        [1, 2, 3, 4]
          .map(
            (n) =>
              `<button type="button" data-bundle-target="${n}">${picturedBundle(n)}<span class="bundle-label">${n === 4 ? t("4 or more keychains", "۴ جاکلیدی یا بیشتر") : num(n) + " " + t("keychain" + (n > 1 ? "s" : ""), "جاکلیدی")}</span><strong>${ecoToman(ecoPetPrice(n))}</strong><small>${n === 4 ? t("4 = 800,000 Toman · Each additional piece: 200,000 Toman", "۴ عدد = ۸۰۰٬۰۰۰ تومان · هر عدد بیشتر: ۲۰۰٬۰۰۰ تومان") : t("Total bundle price", "قیمت کل بسته")}</small><b>${t("Choose designs", "انتخاب طرح‌ها")} ↗</b></button>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "From 4 pieces: 200,000 Toman each. Shipping and custom designs are quoted separately.",
          "از ۴ عدد به بالا، قیمت هر جاکلیدی ۲۰۰٬۰۰۰ تومان است. هزینهٔ ارسال و طرح اختصاصی جداگانه محاسبه می‌شود.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Review basket", "بررسی سبد خرید")),
    ]);
  };
  const refineShopLanding = shopLanding;
  shopLanding = function () {
    return refineShopLanding().replace(
      /<section class="eco-creation-hero">[\s\S]*?<\/section>/,
      window.SHN_TEMPLATES.render("as/10-application/view-75", [
        window.SHN_TEMPLATES.text(
          t("Pet keychains.<br>Made for you.", "جاکلیدی حیوانات،<br>با طرح دلخواه شما."),
        ),
        window.SHN_TEMPLATES.text(
          t(
            "Choose a ready design, or send photos of your pet for a custom keychain. See bundle prices before choosing.",
            "یک طرح آماده انتخاب کنید یا برای ساخت جاکلیدی اختصاصی، عکس حیوانتان را بفرستید. قیمت بسته‌ها را پیش از انتخاب ببینید.",
          ),
        ),
        window.SHN_TEMPLATES.text(t("Choose a keychain", "انتخاب جاکلیدی")),
        window.SHN_TEMPLATES.text(t("Make one from my photo", "ساخت از روی عکس من")),
        window.SHN_TEMPLATES.text(ECO_CREATE_HERO),
        window.SHN_TEMPLATES.text(
          t("Complete pet keychains with metal rings", "جاکلیدی‌های کامل حیوانات با حلقهٔ فلزی"),
        ),
        window.SHN_TEMPLATES.text(t("Ready designs", "طرح‌های آماده")),
        window.SHN_TEMPLATES.text(t("Custom keychains", "جاکلیدی اختصاصی")),
        window.SHN_TEMPLATES.text(t("Photo figurines", "فیگور از روی عکس")),
      ]),
    );
  };
  const refineBasket = ecoBasketPage;
  ecoBasketPage = function () {
    return refineBasket().replace(
      /<div class="eco-basket-rate">[\s\S]*?<\/div>/,
      `<div class="eco-basket-rate">${[1, 2, 3].map((n) => `<span>${num(n)} ${t("keychains", "جاکلیدی")}</span><b>${ecoToman(ecoPetPrice(n))}</b>`).join("")}<span>${t("4 or more, each", "۴ عدد به بالا، هر عدد")}</span><b>${ecoToman(200000)}</b></div>`,
    );
  };
  const refineDetail = petDetail;
  petDetail = function (id) {
    return refineDetail(id).replace(
      /<p class="eco-tier-explain">[\s\S]*?<\/p>/,
      `<p class="eco-tier-explain">${t("1: 350,000 · 2: 500,000 · 3: 700,000 Toman. From 4 pieces: 200,000 Toman each.", "۱ عدد: ۳۵۰٬۰۰۰ · ۲ عدد: ۵۰۰٬۰۰۰ · ۳ عدد: ۷۰۰٬۰۰۰ تومان. از ۴ عدد به بالا: هر عدد ۲۰۰٬۰۰۰ تومان.")}</p>`,
    );
  };
  Object.assign(window.SITE_FA, {
    "Choose a design or photo": "انتخاب طرح یا ارسال عکس",
    "Share the essentials": "ثبت مشخصات سفارش",
    "We ask only for the details needed to understand your order.":
      "تعداد، رنگ دلخواه و اطلاعات تماس را وارد کنید.",
    "Confirm before making": "تأیید سفارش پیش از ساخت",
    "Production, delivery and payment are confirmed with you before anything is charged.":
      "قیمت نهایی و زمان تحویل را پیش از پرداخت با شما تأیید می‌کنیم.",
    "A ready pet keychain has a clear quantity price. A custom figure starts with a photo.":
      "از میان طرح‌های آماده انتخاب کنید. برای ساخت طرح اختصاصی، عکس بفرستید.",
    "Choose one or mix different designs in one basket. A custom figure starts with a photo.":
      "می‌توانید چند طرح مختلف را در یک سبد انتخاب کنید. برای طرح اختصاصی، عکس بفرستید.",
    "A little companion,": "جاکلیدی حیوانات،",
    "everywhere you go.": "با طرح دلخواه شما.",
    "A charming 3D-printed miniature with a metal key ring. Add one or more to your basket, then mix it with other designs for a shared bundle price.":
      "جاکلیدی ساخته‌شده با چاپ سه‌بعدی و حلقهٔ فلزی. تعداد را انتخاب کنید و به سبد اضافه کنید. قیمت بسته بر اساس تعداد کل جاکلیدی‌ها محاسبه می‌شود.",
    "Mix different animals or choose repeats. The bundle price follows the total number of pieces.":
      "می‌توانید طرح‌های مختلف یا چند عدد از یک طرح را انتخاب کنید. قیمت بر اساس تعداد کل جاکلیدی‌های سبد محاسبه می‌شود.",
    "Nothing in your basket yet.": "سبد خرید شما خالی است.",
    "Start with one favourite, then add any others you like.":
      "یک طرح انتخاب کنید و در صورت تمایل، طرح‌های دیگر را به سبد اضافه کنید.",
  });

  const ADVANCED_FIELDS = {
    density: [0, 100, 0.1, 20],
    walls: [1, 12, 1, 3],
    layerHeight: [0.05, 0.4, 0.01, 0.2],
    initialLayerHeight: [0.05, 0.4, 0.01, 0.2],
    nozzle: [0.2, 1.2, 0.1, 0.4],
    topLayers: [0, 30, 1, 5],
    bottomLayers: [0, 30, 1, 5],
    speed: [10, 300, 1, 60],
    nozzleTemperature: [150, 350, 1, 210],
    bedTemperature: [0, 120, 1, 60],
  };
  Object.assign(state.print, {
    layerHeight: 0.2,
    initialLayerHeight: 0.2,
    speed: 60,
    nozzleTemperature: 210,
    bedTemperature: 60,
  });
  const advancedLabels = window.SHN_DATA.get("as/10-application/advancedLabels-10");
  const patternNames = {
    gyroid: ["Gyroid", "جایروید (Gyroid)"],
    linear: ["Rectilinear", "خطی (Rectilinear)"],
    grid: ["Grid", "شبکه‌ای (Grid)"],
    honeycomb: ["Honeycomb", "لانه‌زنبوری (Honeycomb)"],
  };
  function advancedValues(s) {
    return Object.fromEntries(
      [...Object.keys(ADVANCED_FIELDS), "infill", "support"].map((k) => [k, s[k]]),
    );
  }
  /** advancedMarkup: application feature. Keep related handlers in this module. */
  function advancedMarkup(s) {
    return window.SHN_TEMPLATES.render("as/10-application/advancedMarkup-76", [
      window.SHN_TEMPLATES.text(s.advancedOpen ? "open" : ""),
      window.SHN_TEMPLATES.text(t("Advanced print settings", "تنظیمات پیشرفتهٔ چاپ")),
      window.SHN_TEMPLATES.text(t("Infill pattern", "الگوی ساختار داخلی (Infill)")),
      window.SHN_TEMPLATES.text(
        infills
          .map(
            ([id]) =>
              `<button type="button" class="infill-card ${s.infill === id ? "selected" : ""}" data-advanced-pattern="${id}" aria-pressed="${s.infill === id}">${infillSVG(id, s.density)}<strong>${t(...patternNames[id])}</strong></button>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(
        t(
          "Schematic pattern views, not sliced toolpaths for the uploaded model.",
          "تصاویر، نمای شماتیک الگوها هستند؛ مسیر چاپِ مدل آپلودشده را نشان نمی‌دهند.",
        ),
      ),
      window.SHN_TEMPLATES.text(
        Object.entries(ADVANCED_FIELDS)
          .map(
            ([k, [min, max, step, def]]) =>
              `<label class="field" for="advanced-${k}">${t(...advancedLabels[k])}<input id="advanced-${k}" data-advanced-field="${k}" type="number" min="${min}" max="${max}" step="${step}" value="${s[k] ?? def}" dir="ltr"></label>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(t("Support", "ساپورت")),
      window.SHN_TEMPLATES.text(
        [
          ["none", "No support", "بدون ساپورت"],
          ["auto", "Automatic, after review", "خودکار، پس از بررسی مدل"],
          ["tree", "Tree, if suitable", "درختی، در صورت مناسب بودن"],
        ]
          .map(
            ([v, en, fa]) =>
              `<option value="${v}" ${s.support === v ? "selected" : ""}>${t(en, fa)}</option>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(layerSVG(s.layerHeight)),
      window.SHN_TEMPLATES.text(
        t(
          "Temperature and speed depend on the material and printer. Your choices are saved for production review. Layer height is limited to 80% of nozzle diameter.",
          "دما و سرعت به جنس و دستگاه چاپ بستگی دارند. این انتخاب‌ها برای بررسی ساخت ذخیره می‌شوند. ارتفاع لایه حداکثر ۸۰٪ قطر نازل است.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Import settings (JSON)", "وارد کردن تنظیمات (JSON)")),
      window.SHN_TEMPLATES.text(t("Save settings (JSON)", "ذخیرهٔ تنظیمات (JSON)")),
    ]);
  }
  /** advancedRefresh: application feature. Keep related handlers in this module. */
  function advancedRefresh(s) {
    $("#customerQuote").innerHTML = customerQuote("print");
    $$("[data-profile]").forEach((b) =>
      b.setAttribute("aria-pressed", String(s.strength === b.dataset.profile)),
    );
    $$("[data-advanced-pattern]").forEach((b) => {
      b.classList.toggle("selected", s.infill === b.dataset.advancedPattern);
      b.setAttribute("aria-pressed", String(s.infill === b.dataset.advancedPattern));
      b.querySelector("svg").outerHTML = infillSVG(b.dataset.advancedPattern, s.density);
    });
    $("#advancedLayerDiagram").innerHTML = layerSVG(s.layerHeight);
  }
  const beforeAdvancedConfig = config;
  config = function (type) {
    beforeAdvancedConfig(type);
    if (type !== "print") return;
    const s = state.print,
      quantity = $("#quantity").closest("label");
    quantity.insertAdjacentHTML("beforebegin", advancedMarkup(s));
    $("#advancedMode").ontoggle = (e) => (s.advancedOpen = e.target.open);
    $$("[data-profile]").forEach((b) => {
      const previous = b.onclick;
      b.onclick = () => {
        Object.assign(s, {
          layerHeight: 0.2,
          initialLayerHeight: 0.2,
          speed: 60,
          nozzleTemperature: 210,
          bedTemperature: 60,
          support: "none",
        });
        previous();
      };
    });
    $$("[data-advanced-pattern]").forEach(
      (b) =>
        (b.onclick = () => {
          s.infill = b.dataset.advancedPattern;
          s.strength = "CUSTOM";
          advancedRefresh(s);
        }),
    );
    $$("[data-advanced-field]").forEach(
      (input) =>
        (input.oninput = () => {
          if (!input.value || !input.checkValidity()) return;
          const k = input.dataset.advancedField;
          s[k] = k === "nozzle" ? input.value : Number(input.value);
          s.strength = "CUSTOM";
          const cap = +(Number(s.nozzle) * 0.8).toFixed(3);
          for (const height of ["layerHeight", "initialLayerHeight"])
            if (s[height] > cap) {
              s[height] = cap;
              $("#advanced-" + height).value = cap;
            }
          advancedRefresh(s);
        }),
    );
    $("#advanced-support").onchange = (e) => {
      s.support = e.target.value;
      s.strength = "CUSTOM";
      advancedRefresh(s);
    };
    $("#advanced-export").onclick = () => {
      const blob = new Blob(
          [
            JSON.stringify(
              { format: "as-print-settings-v1", settings: advancedValues(s) },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "AS-print-settings.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    $("#advanced-import").onchange = async (e) => {
      try {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 100000) throw Error();
        const data = JSON.parse(await file.text()),
          values = data.settings || data,
          next = {};
        for (const [key, v] of Object.entries(values)) {
          if (ADVANCED_FIELDS[key]) {
            const [min, max, step] = ADVANCED_FIELDS[key],
              n = Number(v);
            if (!Number.isFinite(n) || n < min || n > max || (step === 1 && !Number.isInteger(n)))
              throw Error();
            next[key] = key === "nozzle" ? String(n) : n;
          } else if (key === "infill") {
            if (!patternNames[v]) throw Error();
            next[key] = v;
          } else if (key === "support") {
            if (!["none", "auto", "tree"].includes(v)) throw Error();
            next[key] = v;
          } else throw Error();
        }
        if (!Object.keys(next).length) throw Error();
        const merged = { ...s, ...next };
        if (
          merged.layerHeight > Number(merged.nozzle) * 0.8 ||
          merged.initialLayerHeight > Number(merged.nozzle) * 0.8
        )
          throw Error();
        Object.assign(s, next, { strength: "CUSTOM", advancedOpen: true });
        config(type);
        $("#advanced-status").textContent = t("Settings imported.", "تنظیمات وارد شدند.");
      } catch {
        $("#advanced-status").textContent = t(
          "Invalid settings file. Choose an AS settings JSON with valid values.",
          "فایل تنظیمات معتبر نیست. فایل JSON تنظیمات AS با مقادیر مجاز انتخاب کنید.",
        );
      }
    };
  };
  const beforeAdvancedWorkspace = workspace;
  workspace = function (type) {
    return beforeAdvancedWorkspace(type).replace(
      'class="config-panel"',
      'class="config-panel" tabindex="0" aria-label="' + t("Part settings", "تنظیمات قطعه") + '"',
    );
  };
  estimatedMassGrams = function (s) {
    if (!s.uploaded || !s.analyzed || s.reviewNeeded) return null;
    const model = s.renderModel || s.mesh;
    if (s.customerModel !== model) {
      s.customerModel = model;
      s.customerGeometry = customerGeometry(model);
    }
    const g = s.customerGeometry;
    if (!g) return null;
    const densities = {
      PLA: 1.24,
      PETG: 1.27,
      ABS: 1.04,
      ASA: 1.07,
      TPU: 1.21,
      NYLON: 1.14,
      PC: 1.2,
      CF_NYLON: 1.15,
    };
    const layer = Number(s.layerHeight) || 0.2,
      initial = Number(s.initialLayerHeight) || layer,
      top = s.topLayers * layer,
      bottom = s.bottomLayers ? initial + (s.bottomLayers - 1) * layer : 0;
    const shell = Math.min(
      g.volume,
      Math.max(0, g.area - g.horizontal) * s.walls * Number(s.nozzle || 0.4) +
        (g.horizontal * (top + bottom)) / 2,
    );
    return (
      ((shell + ((g.volume - shell) * s.density) / 100) / 1000) *
      (PRICING_CONFIG.printing.materials[s.material]?.density || densities[s.material] || 1.24)
    );
  };
  window.ADVANCED_TEST = { values: () => advancedValues(state.print) };
  const beforeAdvancedSlicerRows = slicerRows;
  slicerRows = function (s, type) {
    return beforeAdvancedSlicerRows(s, type).map((row) =>
      row[0] === t("Layer height", "ارتفاع لایه")
        ? [row[0], num(s.layerHeight || 0.2) + " " + t("mm", "میلی‌متر")]
        : row,
    );
  };
  window.CUSTOMER_TEST.weight = estimatedMassGrams;

  const AS_DEFAULT_RATES = {
    PLA: 8000,
    PETG: 16000,
    ABS: 18000,
    ASA: 20000,
    TPU: 28000,
    NYLON: 35000,
    PC: 40000,
    CF_NYLON: 48000,
    RESIN_STD: 35000,
    SLS_PA12: 50000,
    METAL_316L: 250000,
  };
  function materialRate(id) {
    return getMaterialRate(id) ?? AS_DEFAULT_RATES[id] ?? null;
  }
  estimate = function (type) {
    if (type !== "print") return null;
    const s = state.print,
      grams = estimatedMassGrams(s),
      rate = materialRate(s.material);
    return grams === null || rate === null
      ? null
      : { grams, rate, unit: grams * rate, total: grams * rate * s.qty };
  };
  customerQuote = function (type) {
    const s = state[type],
      e = estimate(type);
    return `<section class="customer-estimate" aria-live="polite"><h3>${t("Your approximate estimate", "برآورد تقریبی شما")}</h3>${type === "print" ? window.SHN_TEMPLATES.render("as/10-application/view-77", [window.SHN_TEMPLATES.text(t("Weight per part", "وزن هر قطعه")), window.SHN_TEMPLATES.text(e ? num(Math.round(e.grams * 10) / 10) + " " + t("g", "گرم") : "—"), window.SHN_TEMPLATES.text(t("Total for", "جمع برای")), window.SHN_TEMPLATES.text(num(s.qty)), window.SHN_TEMPLATES.text(t("parts", "قطعه")), window.SHN_TEMPLATES.text(e ? money(Math.round(e.total)) : "—"), window.SHN_TEMPLATES.text(escape(s.material)), window.SHN_TEMPLATES.text(t("Rate per gram", "نرخ هر گرم")), window.SHN_TEMPLATES.text(money(materialRate(s.material) || 0)), window.SHN_TEMPLATES.text(t("Provisional material-specific rates; final cost follows model and production review.", "نرخ‌های اولیه برای هر متریال جداگانه تعیین شده‌اند. قیمت نهایی پس از بررسی مدل و شرایط ساخت اعلام می‌شود.")), window.SHN_TEMPLATES.text(t("Approximate mesh weight, not a slicer result. Supports and finishing can change the final amount.", "وزن از هندسهٔ مدل تخمین زده می‌شود و خروجی اسلایسر نیست. ساپورت و پرداخت می‌توانند مبلغ نهایی را تغییر دهند."))]) : `<p>${t("Laser cutting is quoted after reviewing contours, material and thickness.", "قیمت برش لیزری پس از بررسی مسیرها، جنس و ضخامت اعلام می‌شود.")}</p>`}</section>`;
  };
  const companyInquiryConfig = () => ({
    ...store.get("as-inquiry-settings", {}),
    ...(window.AS_INQUIRY_CONFIG || {}),
  });
  const inquiryFiles = {};
  const captureInquiryUpload = upload;
  upload = async function (type, file) {
    await captureInquiryUpload(type, file);
    if (file) {
      const laser = ["dxf", "svg", "pdf", "ai"].includes(file.name.split(".").pop().toLowerCase());
      inquiryFiles[laser ? "laser" : type] = file;
    }
  };
  function normalizedPhone(value) {
    return value
      .trim()
      .replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
      .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c))
      .replace(/[\s()-]/g, "");
  }
  /** contactFields: application feature. Keep related handlers in this module. */
  function contactFields(prefix, s = {}) {
    return window.SHN_TEMPLATES.render("as/10-application/contactFields-78", [
      window.SHN_TEMPLATES.text(t("Phone number", "شماره تلفن")),
      window.SHN_TEMPLATES.text(prefix),
      window.SHN_TEMPLATES.text(escape(s.phone || "")),
      window.SHN_TEMPLATES.text(t("Email (optional)", "ایمیل (اختیاری)")),
      window.SHN_TEMPLATES.text(prefix),
      window.SHN_TEMPLATES.text(escape(s.email || "")),
      window.SHN_TEMPLATES.text(
        t("How can we reach this number?", "از کدام پیام‌رسان با این شماره تماس بگیریم؟"),
      ),
      window.SHN_TEMPLATES.text(
        [
          ["whatsapp", "WhatsApp", "واتساپ"],
          ["bale", "Bale", "بله"],
        ]
          .map(
            ([id, en, fa]) =>
              `<label><input type="radio" name="messenger" value="${id}" required ${s.messenger === id ? "checked" : ""}>${t(en, fa)}</label>`,
          )
          .join(""),
      ),
      window.SHN_TEMPLATES.text(s.messengerActive ? "checked" : ""),
      window.SHN_TEMPLATES.text(
        t(
          "This phone number is active on the selected messenger.",
          "این شماره در پیام‌رسان انتخاب‌شده فعال است.",
        ),
      ),
    ]);
  }
  /** collectContact: application feature. Keep related handlers in this module. */
  function collectContact(form) {
    const d = new FormData(form),
      phone = normalizedPhone(String(d.get("phone") || "")),
      email = String(d.get("email") || "").trim(),
      messenger = d.get("messenger");
    if (!/^\+?\d{7,15}$/.test(phone))
      throw Error(t("Enter a valid phone number.", "شماره تلفن معتبر وارد کنید."));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw Error(t("Enter a valid email address.", "ایمیل معتبر وارد کنید."));
    if (!["whatsapp", "bale"].includes(messenger) || !d.get("messengerActive"))
      throw Error(
        t(
          "Choose an active messenger for this number.",
          "پیام‌رسان فعال برای این شماره را انتخاب کنید.",
        ),
      );
    return { phone, email, messenger };
  }
  /** receiptPage: application feature. Keep related handlers in this module. */
  function receiptPage() {
    let receipt;
    try {
      receipt = JSON.parse(sessionStorage.getItem("as-inquiry-receipt") || "null");
    } catch {}
    return `<section class="wrap inquiry-receipt"><small>AS INDUSTRIES</small><h1>${receipt ? t("Your message was sent.", "پیام شما ارسال شد.") : t("No confirmed submission.", "درخواست تأییدشده‌ای ثبت نشده است.")}</h1><p>${receipt ? t("Your message was sent to AS Industries. We will review it and respond within 24 hours.", "پیام شما برای شرکت AS Industries ارسال شد. آن را بررسی می‌کنیم و تا ۲۴ ساعت آینده به شما پاسخ می‌دهیم.") : t("Please submit your request first.", "ابتدا درخواستتان را ارسال کنید.")}</p>${receipt ? `<p>${t("Reference", "کد پیگیری")}: <b dir="ltr">${escape(receipt.requestId)}</b></p>` : ""}<a class="button primary" href="#/">${t("Back to home", "بازگشت به صفحهٔ اصلی")}</a></section>`;
  }
  /** submitInquiry: application feature. Keep related handlers in this module. */
  async function submitInquiry(payload, file, status, button) {
    const cfg = companyInquiryConfig();
    if (!cfg.endpoint) {
      status.textContent = t(
        "Online sending is not connected yet. Your message has not been sent. Company email and the sending service need to be configured.",
        "ارسال آنلاین هنوز متصل نشده است؛ پیام شما ارسال نشده. ایمیل شرکت و سرویس ارسال باید در تنظیمات مدیر مشخص شوند.",
      );
      return false;
    }
    let endpoint;
    try {
      endpoint = new URL(cfg.endpoint);
      if (endpoint.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(endpoint.hostname))
        throw Error();
    } catch {
      status.textContent = t("The sending address is invalid.", "آدرس سرویس ارسال معتبر نیست.");
      return false;
    }
    if (cfg.email) payload.companyEmail = cfg.email;
    button.disabled = true;
    status.textContent = t("Sending…", "در حال ارسال…");
    try {
      if (file) {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        payload.attachment = {
          name: file.name,
          type: file.type || "application/octet-stream",
          data,
        };
      }
      const response = await fetch(endpoint.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) throw Error();
      const receipt = await response.json();
      if (receipt.ok !== true || !receipt.requestId) throw Error();
      sessionStorage.setItem(
        "as-inquiry-receipt",
        JSON.stringify({ requestId: String(receipt.requestId), time: Date.now() }),
      );
      location.hash = "#/request-sent";
      return true;
    } catch {
      status.textContent = t(
        "Sending could not be confirmed. Please try again; no successful submission has been recorded.",
        "ارسال پیام تأیید نشد. دوباره تلاش کنید؛ ارسال موفقی ثبت نشده است.",
      );
      return false;
    } finally {
      button.disabled = false;
    }
  }
  const beforeInquiryConfig = config;
  config = function (type) {
    beforeInquiryConfig(type);
    const s = state[type],
      form = $("#customerContactForm");
    form.innerHTML = window.SHN_TEMPLATES.render("as/10-application/view-79", [
      window.SHN_TEMPLATES.text(t("Send your request", "ارسال درخواست")),
      window.SHN_TEMPLATES.text(
        t(
          "We review your model and reply within 24 hours of receiving it.",
          "پس از دریافت فایل، آن را بررسی می‌کنیم و تا ۲۴ ساعت آینده پاسخ می‌دهیم.",
        ),
      ),
      window.SHN_TEMPLATES.text(contactFields("quote", s)),
      window.SHN_TEMPLATES.text(t("Request or notes", "درخواست یا توضیحات")),
      window.SHN_TEMPLATES.text(escape(s.notes || "")),
      window.SHN_TEMPLATES.text(t("Send to AS Industries", "ارسال به AS Industries")),
    ]);
    form.querySelectorAll("input,textarea").forEach((input) =>
      input.addEventListener("input", () => {
        s.phone = $("#quote-phone").value;
        s.email = $("#quote-email").value;
        s.messenger = form.querySelector("[name=messenger]:checked")?.value;
        s.messengerActive = form.querySelector("[name=messengerActive]").checked;
        s.notes = $("#customerNotes").value;
      }),
    );
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const status = $("#customerMessage");
      try {
        const contact = collectContact(form);
        if (!s.uploaded)
          throw Error(t("Choose your model file first.", "ابتدا فایل قطعه را انتخاب کنید."));
        const e = estimate(type);
        await submitInquiry(
          {
            kind: "quote",
            ...contact,
            message: s.notes || "",
            fileName: s.file,
            process: type,
            material: s.material,
            quantity: s.qty,
            printSettings: type === "print" ? advancedValues(s) : undefined,
            estimate: e,
          },
          inquiryFiles[type],
          status,
          form.querySelector("[type=submit]"),
        );
      } catch (error) {
        status.textContent = error.message;
      }
    };
  };
  /** quickContact: application feature. Keep related handlers in this module. */
  function quickContact() {
    return window.SHN_TEMPLATES.render("as/10-application/quickContact-80", [
      window.SHN_TEMPLATES.text(t("Quick contact", "ارتباط سریع با ما")),
      window.SHN_TEMPLATES.text(
        t(
          "Tell us what you need made, repaired or checked. We will review your request and contact you within 24 hours of receipt.",
          "بنویسید چه قطعه‌ای می‌خواهید بسازید، تعمیر کنید یا بررسی کنیم. پس از دریافت درخواست، تا ۲۴ ساعت آینده با شما تماس می‌گیریم.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Your request", "درخواست شما")),
      window.SHN_TEMPLATES.text(
        t("Describe your part, project or question…", "قطعه، پروژه یا پرسشتان را توضیح دهید…"),
      ),
      window.SHN_TEMPLATES.text(contactFields("quick")),
      window.SHN_TEMPLATES.text(t("Send request", "ارسال درخواست")),
    ]);
  }
  const beforeQuickHome = home;
  home = function () {
    const html = beforeQuickHome(),
      start = html.indexOf('<section class="wrap section seamless-services">'),
      end = html.indexOf("</section>", start);
    return end >= 0
      ? html.slice(0, end + 10) + quickContact() + html.slice(end + 10)
      : html + quickContact();
  };
  /** chatWidget: application feature. Keep related handlers in this module. */
  function chatWidget() {
    if (window.AS_TICKET_LINK) { window.AS_TICKET_LINK(); return; }
    if ($("#as-chat-toggle")) return;
    const toggle = document.createElement("button");
    toggle.id = "as-chat-toggle";
    toggle.type = "button";
    toggle.textContent = t("Send a message", "پیام به ما");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "as-chat");
    const panel = document.createElement("section");
    panel.id = "as-chat";
    panel.hidden = true;
    panel.innerHTML = window.SHN_TEMPLATES.render("as/10-application/chatWidget-81", [
      window.SHN_TEMPLATES.text(t("AS Industries assistant", "راهنمای AS Industries")),
      window.SHN_TEMPLATES.text(t("Close", "بستن")),
      window.SHN_TEMPLATES.text(
        t(
          "Describe your request. Add your contact details so the team can reply.",
          "درخواستتان را بنویسید و اطلاعات تماس را وارد کنید تا تیم ما پاسخ دهد.",
        ),
      ),
      window.SHN_TEMPLATES.text(t("Message", "پیام")),
      window.SHN_TEMPLATES.text(t("What do you need?", "چه کاری می‌خواهید انجام دهیم؟")),
      window.SHN_TEMPLATES.text(contactFields("chat")),
      window.SHN_TEMPLATES.text(t("Send to the team", "ارسال به تیم")),
    ]);
    document.body.append(toggle, panel);
    toggle.onclick = () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) panel.querySelector("textarea").focus();
    };
    $("#as-chat-close").onclick = () => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    };
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") $("#as-chat-close").click();
    });
    bindInquiryForm($("#asChatForm"), $("#chat-status"), "chat");
  }
  /** bindInquiryForm: application feature. Keep related handlers in this module. */
  function bindInquiryForm(form, status, kind) {
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      try {
        const contact = collectContact(form),
          message = new FormData(form).get("message").trim();
        if (!message) throw Error(t("Write your request.", "درخواستتان را بنویسید."));
        await submitInquiry(
          { kind, ...contact, message },
          null,
          status,
          form.querySelector("[type=submit]"),
        );
      } catch (error) {
        status.textContent = error.message;
      }
    };
  }
  const beforeInquiryBind = bind;
  bind = function () {
    beforeInquiryBind();
    bindInquiryForm($("#quickContactForm"), $("#quick-status"), "quick");
    if (!separatedShop) chatWidget();
  };
  const beforeInquiryAccount = accountPage;
  accountPage = function () {
    const html = beforeInquiryAccount();
    if (!adminUnlocked) return html;
    const cfg = companyInquiryConfig();
    return (
      html +
      window.SHN_TEMPLATES.render("as/10-application/view-82", [
        window.SHN_TEMPLATES.text(t("Company message delivery", "ارسال پیام‌های شرکت")),
        window.SHN_TEMPLATES.text(t("Company email", "ایمیل شرکت")),
        window.SHN_TEMPLATES.text(escape(cfg.email || "")),
        window.SHN_TEMPLATES.text(t("Sending service URL", "آدرس سرویس ارسال")),
        window.SHN_TEMPLATES.text(escape(cfg.endpoint || "")),
        window.SHN_TEMPLATES.text(t("Save delivery settings", "ذخیرهٔ تنظیمات ارسال")),
      ])
    );
  };
  const beforeInquiryBindAccount = bindAccount;
  bindAccount = function () {
    beforeInquiryBindAccount();
    if (adminUnlocked) {
      $$("[data-material-rate]").forEach((input) => {
        if (input.value === "") input.value = AS_DEFAULT_RATES[input.dataset.materialRate] || "";
      });
      const form = $("#inquirySettingsForm");
      if (form)
        form.onsubmit = (e) => {
          e.preventDefault();
          if (!form.reportValidity()) return;
          store.set("as-inquiry-settings", {
            email: $("#companyEmail").value.trim(),
            endpoint: $("#inquiryEndpoint").value.trim(),
          });
          $("#deliveryStatus").textContent = t(
            "Saved. The service must be running and connected to company email.",
            "ذخیره شد. سرویس باید فعال و به ایمیل شرکت متصل باشد.",
          );
        };
    }
  };
  window.INQUIRY_TEST = {
    rates: AS_DEFAULT_RATES,
    rate: materialRate,
    submit: submitInquiry,
    contact: collectContact,
  };
  const beforeWarmShopLanding = shopLanding;
  shopLanding = function () {
    return beforeWarmShopLanding().split(ECO_CREATE_HERO).join(window.SHOP_HERO_NEW);
  };
  picturedBundle = function (n) {
    return `<div class="bundle-pictures" aria-label="${num(n)} ${t("complete keychains", "جاکلیدی کامل")}">${Array.from({ length: n }, () => `<img src="${window.SHOP_KEYCHAIN_FULL}" alt="${t("Complete Pomeranian keychain with metal ring", "جاکلیدی کامل پامرانین با حلقهٔ فلزی")}" loading="lazy">`).join("")}</div>`;
  };
  const beforePicturedBundles = customerBundles;
  customerBundles = function () {
    return beforePicturedBundles().replace(
      "</div><p>",
      '</div><p class="bundle-image-note">' +
        t(
          "Images illustrate quantity. Choose your own designs next.",
          "تصویرها تعداد بسته را نشان می‌دهند؛ طرح‌های دلخواهتان را در مرحلهٔ بعد انتخاب کنید.",
        ) +
        "</p><p>",
    );
  };
  window.CUSTOMER_TEST.estimate = estimate;
  /** bindShopInquiry: application feature. Keep related handlers in this module. */
  function bindShopInquiry() {
    for (const id of ["ecoBasketForm", "ecoRequestForm"]) {
      const old = $("#" + id);
      if (!old) continue;
      if (id === "ecoRequestForm") continue;
      const form = old.cloneNode(true);
      old.replaceWith(form);
      const combined = form.querySelector("[name=contact]");
      if (combined) combined.closest("label").outerHTML = contactFields("shop-" + id);
      const button = form.querySelector("[type=submit]");
      if (button) button.textContent = t("Send request", "ارسال درخواست");
      form.querySelectorAll("p.micro").forEach((p) => {
        if (/Offline preview|does not place|does not send/i.test(p.textContent)) p.remove();
      });
      const status =
        form.querySelector("[role=status]") || form.appendChild(document.createElement("p"));
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      const photo = form.querySelector("input[type=file]");
      if (photo)
        photo.addEventListener("change", () => {
          const file = photo.files?.[0],
            preview = form.querySelector("#ecoReferencePreview");
          if (file && preview) {
            const r = new FileReader();
            r.onload = () => {
              preview.src = r.result;
              preview.hidden = false;
            };
            r.readAsDataURL(file);
          }
        });
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        try {
          const contact = collectContact(form),
            fields = Object.fromEntries(
              [...new FormData(form).entries()].filter(([k, v]) => typeof v === "string"),
            ),
            items = id === "ecoBasketForm" ? ecoBasketRead() : undefined;
          await submitInquiry(
            {
              kind: "quick",
              process: "shop",
              ...contact,
              message: JSON.stringify(fields),
              items,
              estimatedProductsToman: items ? ecoPetPrice(ecoBasketCount(items)) : undefined,
            },
            photo?.files?.[0] || null,
            status,
            button,
          );
        } catch (error) {
          status.textContent = error.message;
        }
      };
    }
  }
  const beforeShopInquiryBind = bind;
  bind = function () {
    beforeShopInquiryBind();
    if (separatedShop) {
      bindShopInquiry();
      chatWidget();
    }
  };

  const beforeLanguageBind = bind;
  bind = function () {
    beforeLanguageBind();
    for (const [route, en, fa] of [
      ["/shop/pets", "Pet keychains", "جاکلیدی حیوانات"],
      ["/shop/family", "Photo figurines", "فیگور از روی عکس"],
    ]) {
      const card = document.querySelector('.eco-category-grid .eco-cat[href="#' + route + '"]');
      if (card?.querySelector("h3")) card.querySelector("h3").textContent = t(en, fa);
    }
  };

  /* Revision 10: compact bundle chooser, separated hero, reference photo. */
  const r10Landing = shopLanding;
  function stripBundleSection(html) {
    return html.replace(/<section class="wrap customer-bundles">[\s\S]*?<\/section>/g, "");
  }
  shopLanding = function () {
    return stripBundleSection(r10Landing()).replace(
      t(
        "Choose a ready design, or send photos of your pet for a custom keychain. See bundle prices before choosing.",
        "یک طرح آماده انتخاب کنید یا برای ساخت جاکلیدی اختصاصی، عکس حیوانتان را بفرستید. قیمت بسته‌ها را پیش از انتخاب ببینید.",
      ),
      t(
        "Choose a ready keychain, or send a photo of your pet for a personal design.",
        "از میان جاکلیدی‌های آماده انتخاب کنید یا عکس حیوانتان را برای ساخت طرح اختصاصی بفرستید.",
      ),
    );
  };
  const r10Detail = petDetail;
  petDetail = function (id) {
    return stripBundleSection(r10Detail(id));
  };
  picturedBundle = function (n) {
    const captions = [
      ["One Pomeranian keychain", "یک جاکلیدی پامرانین"],
      ["Pomeranian and Chihuahua keychains", "جاکلیدی پامرانین و چیواوا"],
      ["Pomeranian, Chihuahua and Poodle keychains", "جاکلیدی پامرانین، چیواوا و پودل"],
      [
        "Pomeranian, Chihuahua, Poodle and French Bulldog keychains",
        "جاکلیدی پامرانین، چیواوا، پودل و بولداگ فرانسوی",
      ],
    ];
    return `<div class="bundle-pictures" data-pictured-count="${n}"><img src="${n === 1 ? window.SHOP_KEYCHAIN_FULL : window.SHOP_BUNDLE_IMAGES[n]}" alt="${t(...captions[n - 1])}" loading="lazy"></div>`;
  };
  const r10QuickContact = quickContact;
  quickContact = function () {
    return r10QuickContact().replace(
      contactFields("quick"),
      window.SHN_TEMPLATES.render("as/10-application/view-83", [
        window.SHN_TEMPLATES.text(t("Add a photo (optional)", "افزودن عکس (اختیاری)")),
        window.SHN_TEMPLATES.text(
          t(
            "A photo of your part, sketch or reference · JPG, PNG or WebP · up to 10 MB",
            "عکس قطعه، طرح یا نمونهٔ موردنظر · JPG، PNG یا WebP · حداکثر ۱۰ مگابایت",
          ),
        ),
        window.SHN_TEMPLATES.text(t("Your reference photo", "عکس مرجع شما")),
        window.SHN_TEMPLATES.text(t("Remove photo", "حذف عکس")),
      ]) + contactFields("quick"),
    );
  };
  /** referencePhotoError: application feature. Keep related handlers in this module. */
  function referencePhotoError(file) {
    if (!file) return "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return t("Choose a JPG, PNG or WebP image.", "یک عکس با فرمت JPG، PNG یا WebP انتخاب کنید.");
    if (file.size > 10 * 1024 * 1024)
      return t("The photo must be 10 MB or smaller.", "حجم عکس باید حداکثر ۱۰ مگابایت باشد.");
    return "";
  }
  bindInquiryForm = function (form, status, kind) {
    if (!form) return;
    const input = form.querySelector("[name=photo]"),
      preview = form.querySelector("#quick-photo-preview"),
      photoStatus = form.querySelector("#quick-photo-status");
    if (input) {
      let photoReadVersion = 0;
      const clearPreview = () => {
        photoReadVersion++;
        preview.hidden = true;
        preview.querySelector("img").removeAttribute("src");
      };
      input.onchange = () => {
        clearPreview();
        const file = input.files?.[0],
          error = referencePhotoError(file);
        input.setCustomValidity(error);
        photoStatus.textContent = error;
        if (file && !error) {
          const version = photoReadVersion,
            r = new FileReader();
          r.onload = () => {
            if (version !== photoReadVersion) return;
            preview.querySelector("img").src = r.result;
            preview.hidden = false;
            photoStatus.textContent = file.name;
          };
          r.onerror = () => {
            if (version === photoReadVersion)
              photoStatus.textContent = t(
                "The photo could not be opened. Please choose it again.",
                "عکس باز نشد؛ دوباره انتخابش کنید.",
              );
          };
          r.readAsDataURL(file);
        }
      };
      form.querySelector("#quick-photo-remove").onclick = () => {
        input.value = "";
        input.setCustomValidity("");
        clearPreview();
        photoStatus.textContent = "";
        input.focus();
      };
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      try {
        const contact = collectContact(form),
          message = String(new FormData(form).get("message") || "").trim(),
          file = input?.files?.[0] || null,
          error = referencePhotoError(file);
        if (error) throw Error(error);
        if (!message) throw Error(t("Write your request.", "درخواستتان را بنویسید."));
        await submitInquiry(
          { kind, ...contact, message },
          file,
          status,
          form.querySelector("[type=submit]"),
        );
      } catch (error) {
        status.textContent = error.message;
      }
    };
  };
  const r10Badge = ecoBasketBadge;
  ecoBasketBadge = function () {
    r10Badge();
    const el = $("#customerBundleProgress");
    if (el) {
      const count = ecoBasketCount(),
        target = Number(localStorage.getItem("as-bundle-target") || 0);
      el.textContent =
        t("In your basket: ", "در سبد شما: ") +
        num(count) +
        " · " +
        new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US").format(ecoPetPrice(count)) +
        " " +
        t("Toman", "تومان") +
        (target > count
          ? " · " +
            t("Choose ", "انتخاب کنید: ") +
            num(target - count) +
            " " +
            t("more keychains", "جاکلیدی دیگر")
          : "");
    }
  };
  window.REVISION10_TEST = {
    shopLanding,
    petShop,
    petDetail,
    quickContact,
    photoError: referencePhotoError,
    bindInquiryForm,
    price: ecoPetPrice,
  };

  window.AS_TEST = {
    materials,
    metals,
    catalog,
    state,
    estimate,
    discount,
    infillSVG,
    slicerRows,
    materialPicker,
    home,
    shahrniazPartner,
    nixa,
    comingSoon,
  };
  // Reuse the original visual layout while the API supplies products.
  const familyAndPetRequestPage = customRequest;
  customRequest = function () {
    const kind = new URLSearchParams(location.hash.split("?")[1] || "").get("type");
    return kind === "kitchen" ? originalShopRequestPage() : familyAndPetRequestPage();
  };
  window.AS_SHOP_SKIN = {listing: petShop, landing: shopLanding, detail: petDetail,
    tile: id => ECO_PET_TILE_MAP[id] ? ecoTile(id) : null,
    originalImage: id => ECO_PETS.find(p=>p.id===id)?.image};
  if (window.AS_SHOP_BACKEND) window.AS_SHOP_BACKEND.refresh = render;
  render();
})();
