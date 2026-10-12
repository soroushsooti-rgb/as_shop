/* مسئولیت این فایل: کاتالوگ واقعی فروشگاه، گالری، قیمت و سبد بر اساس API داک‌تایپ‌ها. */
(() => {
  "use strict";
  const endpoint = "/api/method/as_shop.api.get_catalog";
  const cartEndpoint = "/api/method/as_shop.api.get_cart";
  const itemEndpoint = "/api/method/as_shop.api.set_cart_item";
  const clearEndpoint = "/api/method/as_shop.api.clear_cart";
  const storageKey = "as-shop-cart-v1";
  const tokenKey = "as-shop-cart-token-v1";
  const categories = {
    pets: ["Pet keychains", "جاکلیدی حیوانات"], family: ["Family figures", "فیگور خانوادگی"],
    kitchen: ["Kitchen", "آشپزخانه"], nfc: ["NFC", "محصولات NFC"],
    gadgets: ["Gadgets", "گجت‌ها"], home: ["Home", "لوازم خانه"],
    furniture: ["Furniture", "مبلمان"], other: ["Other products", "سایر محصولات"],
  };
  let products = null;
  let pending = null;
  let failed = false;
  let loadedAt = 0;
  let currentPath = "/shop";
  let cart = readCart();
  let cartToken = readToken();
  let cartSync = Promise.resolve();
  const text = (en, fa) => window.SITE_LANGUAGE === "fa" ? fa : en;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const template = (name, values = []) => window.SHN_TEMPLATES.render("shop/" + name, values);
  const number = value => new Intl.NumberFormat(window.SITE_LANGUAGE === "fa" ? "fa-IR" : "en-US").format(value);
  const money = value => number(value) + " " + text("Toman", "تومان");
  const translated = (p, field) => window.SITE_LANGUAGE === "fa" ? p[field] || p[field + "_en"] || "" : p[field + "_en"] || p[field] || "";
  const title = p => translated(p, "title");
  const find = id => products?.find(p => p.product_code === id);
  const categoryTitle = id => text(...(categories[id] || categories.other));

  const basketQuantity = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const unitPrice = (p, qty) => Number(p[qty >= 4 ? "price_4_plus" : qty === 3 ? "price_3" : qty === 2 ? "price_2" : "price"]) || Number(p.price);

  /** The cart stores quantities, never trusted prices or stock values. */
  function readCart() {
    const result = Object.create(null);
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      for (const [id, qty] of Object.entries(stored || {})) {
        if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && Number.isSafeInteger(qty) && qty > 0) result[id] = qty;
      }
    } catch { /* A damaged or unavailable local store starts with an empty basket. */ }
    return result;
  }

  function saveCart() {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* Keep this tab usable. */ }
  }
  function readToken() {
    try { return localStorage.getItem(tokenKey) || ""; } catch { return ""; }
  }
  function saveToken(value) {
    cartToken = value || "";
    try { if (cartToken) localStorage.setItem(tokenKey, cartToken); else localStorage.removeItem(tokenKey); } catch { /* Keep this tab usable. */ }
  }
  function serverItems(payload) {
    const next = Object.create(null);
    for (const item of payload?.items || []) {
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.product_code || "") && Number.isInteger(item.quantity) && item.quantity > 0) next[item.product_code] = item.quantity;
    }
    return next;
  }
  function formBody(values) {
    return new URLSearchParams(Object.entries(values).map(([key,value]) => [key, String(value)])).toString();
  }
  async function cartRequest(url, values) {
    const response = await fetch(url, { method: "POST", credentials: "omit", cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: formBody(values) });
    if (!response.ok) { const error = new Error("Cart request rejected"); error.status = response.status; throw error; }
    const payload = await response.json();
    const data = payload.message || payload;
    if (!Array.isArray(data.items) || !data.cart_token) throw new Error("Invalid cart response");
    return data;
  }
  function applyServerCart(server) {
    saveToken(server.cart_token);
    cart = serverItems(server);
    for (const item of server.items || []) {
      const p = find(item.product_code);
      if (p) { for (const field of ["price","price_2","price_3","price_4_plus"]) p[field] = item[field] ?? p[field]; p.stock_qty = item.stock_qty; p.available = item.product_available ?? item.available; }
    }
    saveCart();
  }
  async function fetchCart(importLegacy = true) {
    const existing = cartToken;
    const legacy = !existing && importLegacy ? { ...cart } : {};
    let server;
    try { server = await cartRequest(cartEndpoint, existing ? {cart_token: existing} : {}); }
    catch (error) {
      if (!existing || error.status !== 403) throw error;
      saveToken(""); server = await cartRequest(cartEndpoint, {});
    }
    if (server.status !== "Open") {
      saveToken("");
      server = await cartRequest(cartEndpoint, {});
    }
    applyServerCart(server);
    // Existing local quantities are imported once; each item is validated by the server.
    for (const [id, qty] of Object.entries(legacy)) {
      try { applyServerCart(await cartRequest(itemEndpoint, {cart_token: cartToken, product_code: id, quantity: qty})); }
      catch { /* Unavailable old items cannot enter the server basket. */ }
    }
  }
  function syncItem(productCode, quantity, additive = false) {
    cartSync = cartSync.then(async () => {
      if (!cartToken) await fetchCart(false);
      // Calculate additions inside the queue, after the preceding server response.
      // Never announce or store a successful purchase before the server accepts it.
      const nextQuantity = additive ? (cart[productCode] || 0) + quantity : quantity;
      applyServerCart(await cartRequest(itemEndpoint, {cart_token: cartToken, product_code: productCode, quantity: nextQuantity}));
      return true;
    }).catch(async () => {
      await fetchCart(false).catch(() => undefined);
      window.alert(text("The basket update was not saved. Check availability and try again.", "تغییر سبد ذخیره نشد. موجودی را بررسی کنید و دوباره تلاش کنید."));
      return false;
    });
    return cartSync;
  }
  /** Reuse the original toast markup and CSS with server-confirmed quantities. */
  function showAdded(product) {
    let toast = document.getElementById("ecoBasketToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ecoBasketToast";
      toast.className = "eco-basket-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.append(toast);
    }
    const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const total = Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = find(id);
      return sum + (p?.available && qty <= p.stock_qty ? unitPrice(p, basketQuantity()) * qty : 0);
    }, 0);
    toast.innerHTML = `<strong>${escape(title(product))} ${text("added", "به سبد اضافه شد")}</strong><span>${escape(number(count))} ${text("piece(s)", "عدد")} · ${escape(money(total))}</span><a href="#/shop/basket">${text("View basket ↗", "مشاهده سبد ↗")}</a>`;
    toast.classList.add("show");
    clearTimeout(window.ecoToastTimer);
    window.ecoToastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
  }

  function clearServerCart() {
    cartSync = cartSync.then(async () => {
      if (!cartToken) return;
      applyServerCart(await cartRequest(clearEndpoint, {cart_token: cartToken}));
    }).catch(() => fetchCart(false));
    return cartSync;
  }

  function photo(p, image, caption = "", alt = "") {
    if (!image) return template("placeholder", [escape(title(p))]);
    return template("image", [escape(image), escape(alt || title(p)), escape(caption)]);
  }

  function availability(p) {
    return p.available ? text("In stock: ", "موجودی: ") + number(p.stock_qty) : text("Out of stock", "ناموجود");
  }

  function addButton(p) {
    const allowed = p.available && (cart[p.product_code] || 0) < p.stock_qty;
    return template("add-button", [escape(p.product_code), allowed ? "" : "disabled", escape(allowed ? text("+ Add to basket", "+ افزودن به سبد") : p.available ? text("Stock limit reached", "به سقف موجودی رسیدید") : text("Out of stock", "ناموجود"))]);
  }

  function card(p) {
    return template("card", [
      escape((title(p) + " " + translated(p, "caption")).toLowerCase()),
      escape(p.product_code), photo(p, p.cover_image || p.images[0]?.image),
      escape(categoryTitle(p.category)), escape(title(p)), escape(translated(p, "caption")),
      escape(money(p.price)), p.available ? "available" : "unavailable", escape(availability(p)),
      escape(p.product_code), escape(text("See details", "جزئیات محصول")), addButton(p),
    ]);
  }

  function listing(category) {
    const visible = category ? products.filter(p => p.category === category) : products;
    const links = [template("category", ["/shop", escape(text("All products", "همه محصولات"))])];
    for (const id of Object.keys(categories)) {
      if (products.some(p => p.category === id)) links.push(template("category", ["/shop/" + id, escape(categoryTitle(id))]));
    }
    return template("catalog", [
      escape(category ? categoryTitle(category) : text("AS Shop", "فروشگاه AS")),
      escape(text("Products, prices and availability from our current catalogue.", "محصولات، قیمت‌ها و موجودی از کاتالوگ فعلی فروشگاه.")),
      links.join(""), escape(text("Your basket", "سبد شما")), number(Object.values(cart).reduce((a, b) => a + b, 0)),
      escape(text("Search products", "جست‌وجوی محصولات")), escape(number(visible.length) + " " + text("products", "محصول")),
      visible.length ? visible.map(card).join("") : message(text("No published products in this category.", "محصولی برای نمایش در این دسته وجود ندارد.")),
    ]);
  }

  function detail(id) {
    const p = find(id);
    if (!p) return message(text("This product is not available on the website.", "این محصول در سایت قابل نمایش نیست."));
    const images = p.images.slice();
    if (p.cover_image && !images.some(row => row.image === p.cover_image)) images.unshift({ image: p.cover_image });
    return template("detail", [
      escape(text("Back to products", "بازگشت به محصولات")), escape(categoryTitle(p.category)), escape(title(p)),
      escape(translated(p, "caption")), escape(money(p.price)), p.available ? "available" : "unavailable", escape(availability(p)),
      escape(translated(p, "description")), addButton(p), escape(text("View basket", "مشاهده سبد")),
      images.length ? images.map(row => photo(p, row.image, translated(row, "caption"), row.alt_text)).join("") : photo(p, ""),
    ]);
  }

  function basket() {
    let total = 0;
    const lines = Object.entries(cart).map(([id, qty]) => {
      const p = find(id);
      const available = p?.available && qty <= p.stock_qty;
      const amount = available ? unitPrice(p, basketQuantity()) * qty : 0;
      total += amount;
      return template("basket-line", [
        escape(id), escape(p ? title(p) : text("Product removed from catalogue", "محصول از کاتالوگ حذف شده")),
        p ? photo(p, p.cover_image || p.images[0]?.image) : "",
        escape(p ? money(unitPrice(p, basketQuantity())) : "—"), number(qty), escape(id), qty,
        p?.available ? p.stock_qty : 0, p?.available ? "" : "disabled",
        escape(available ? money(amount) : text("Unavailable — remove or reduce quantity", "غیرقابل خرید؛ حذف کنید یا تعداد را کاهش دهید")),
        escape(id), escape(text("Remove", "حذف")),
      ]);
    });
    return template("basket", [
      escape(text("Your basket", "سبد شما")), lines.join("") || message(text("Your basket is empty.", "سبد شما خالی است.")),
      escape(text("Total for available items", "جمع اقلام قابل خرید")), escape(money(total)),
      escape(text("A basket does not reserve stock. No payment or confirmed order has been created.", "سبد، موجودی را رزرو نمی‌کند. پرداخت یا سفارش قطعی ثبت نشده است.")),
      escape(text("Continue shopping", "ادامه خرید")),
    ]);
  }

  function message(value) {
    return template("message", [escape(value)]);
  }

  /** Refresh with no browser cache; there is deliberately no old static fallback. */
  function load() {
    if (pending) return pending;
    pending = fetch(endpoint, { credentials: "omit", cache: "no-store", headers: { Accept: "application/json" } })
      .then(response => { if (!response.ok) throw new Error("Catalogue unavailable"); return response.json(); })
      .then(payload => {
        if (!Array.isArray(payload.message?.products)) throw new Error("Invalid catalogue");
        products = payload.message.products;
        loadedAt = Date.now();
        failed = false;
        return fetchCart();
      })
      .catch(() => { products = null; failed = true; })
      .finally(() => { pending = null; window.AS_SHOP_BACKEND.refresh?.(); });
    return pending;
  }

  function owns(path) {
    // Only product and basket routes belong to the managed catalogue.
    // Kitchen, Family and other editorial pages keep their original controllers.
    return ["/", "/shop", "/nixa", "/cart", "/shop/pets", "/shop/basket"].includes(path)
      || /^\/shop\/(pets|product)\/[^/]+$/.test(path);
  }

  /** Called by the original shell router, keeping its header, footer and language. */
  function mount(path, container) {
    currentPath = path;
    if (products !== null && Date.now() - loadedAt > 15000 && !pending) load();
    document.title = "AS Shop";
    if (products === null) {
      container.innerHTML = failed
        ? template("error", [escape(text("Products could not be loaded. Try again.", "دریافت محصولات ممکن نشد. دوباره تلاش کنید.")), escape(text("Retry", "تلاش دوباره"))])
        : message(text("Loading products…", "در حال دریافت محصولات…"));
      if (!failed) load();
    } else if (path === "/cart" || path === "/shop/basket") container.innerHTML = basket();
    else if (/^\/shop\/(pets|product)\/[^/]+$/.test(path)) container.innerHTML = detail(decodeURIComponent(path.split("/").pop()));
    else container.innerHTML = listing(path === "/nixa" ? "pets" : path.startsWith("/shop/") ? path.split("/")[2] : null);
    restorePresentation(container);
    if (["/cart","/shop/basket"].includes(path) && products !== null) {
      const summary=container.querySelector(".eco-basket-summary,.shop-total");
      if (summary) {
        const button=document.createElement("button");button.type="button";button.className="button primary";button.dataset.shopCheckout="1";
        button.textContent=text("Checkout & payment →","تکمیل خرید و پرداخت ←");
        button.disabled=!basketQuantity()||!Object.entries(cart).every(([id,qty])=>find(id)?.available&&find(id).stock_qty>=qty);
        summary.append(button);
      }
    }
    bind(container);
    const classicCount = document.getElementById("ecoBasketCount");
    if (classicCount) classicCount.textContent = number(Object.values(cart).reduce((a, b) => a + b, 0));
    const count = document.getElementById("cartCount");
    if (count) count.textContent = number(Object.values(cart).reduce((a, b) => a + b, 0));
  }


  /** Adapt the managed content to the original shop markup and stylesheet. */
  function restorePresentation(container) {
    const skin=window.AS_SHOP_SKIN;
    if(!skin)return;

    if(products!==null && ['/','/shop'].includes(currentPath)) {
      container.innerHTML=skin.landing();
      container.querySelectorAll('[data-bundle-target] strong').forEach(el=>el.textContent=text('Price calculated in your basket','قیمت در سبد محاسبه می‌شود'));
      container.querySelectorAll('[data-bundle-target] small').forEach(el=>{if(/Toman|تومان/.test(el.textContent))el.textContent=text('Quantity prices vary by product','قیمت تعدادی هر محصول متفاوت است');});
      container.querySelectorAll('[data-bundle-target]').forEach(button=>button.onclick=()=>{location.hash='#/shop/pets';});
      return;
    }
    if(products!==null && /^\/shop\/(pets|product)\/[^/]+$/.test(currentPath)) {
      const id=decodeURIComponent(currentPath.split('/').pop());const p=find(id);
      if(p) {
        container.innerHTML=skin.detail(skin.originalImage(id)?id:'pomeranian');
        const copy=container.querySelector('.eco-detail-copy');
        copy.querySelector('h1').textContent=title(p);
        const intro=copy.querySelector(':scope > p');if(intro&&(translated(p,'description')||translated(p,'caption')))intro.textContent=translated(p,'description')||translated(p,'caption');
        const metadata=copy.querySelector('.eco-breed-meta');if(metadata)metadata.textContent=translated(p,'caption')||categoryTitle(p.category);
        const price=container.querySelector('#ecoTotal,.eco-detail-price');if(price)price.textContent=money(p.price);
        const status=container.querySelector('.eco-tier-explain');if(status)status.textContent=availability(p);
        const button=container.querySelector('[data-eco-add]');if(button){button.removeAttribute('data-eco-add');button.dataset.shopAdd=id;button.disabled=!p.available;if(!p.available)button.textContent=text('Out of stock','ناموجود');}
        const qty=container.querySelector('#ecoQty');if(qty){qty.max=Math.min(10000,Math.max(0,p.stock_qty-(cart[id]||0)));qty.disabled=!p.available||Number(qty.max)<1;qty.value=qty.disabled?0:1;}
        container.querySelectorAll('#ecoQtyMinus,#ecoQtyPlus').forEach(b=>b.disabled=!!qty?.disabled);
        if(button&&qty?.disabled){button.disabled=true;if(p.available)button.textContent=text('Stock limit reached','به سقف موجودی رسیدید');}
        const tiers=document.createElement('p');tiers.className='eco-quantity-prices';
        tiers.textContent=[1,2,3,4].map(n=>number(n)+(n===4?'+':'')+' '+text('pieces in basket: ','عدد در سبد: ')+money(unitPrice(p,n))+' '+text('each','هر عدد')).join(' · ');
        qty?.closest('.eco-qty-row')?.before(tiers);
        updateDetailQuantity(container);
        const gallery=container.querySelector('.eco-detail > div:first-child');
        if(gallery){
          const back=gallery.querySelector('a.back-link')?.outerHTML||'';
          const rows=p.images.slice();if(p.cover_image&&!rows.some(row=>row.image===p.cover_image))rows.unshift({image:p.cover_image});
          if(p.cover_image!==skin.originalImage(id)||rows.length>1)gallery.innerHTML=back+rows.map(row=>`<img class="eco-original-photo" src="${escape(row.image)}" alt="${escape(row.alt_text||title(p))}" loading="lazy"><p class="eco-original-caption">${escape(translated(row,'caption'))}</p>`).join('');
        }
        const labels=container.querySelectorAll('.eco-detail-copy dl dd');if(labels[0])labels[0].textContent=translated(p,'caption')||categoryTitle(p.category);
      }
      return;
    }
    const isList=!['/cart','/shop/basket'].includes(currentPath)&&!/^\/shop\/(pets|product)\/[^/]+$/.test(currentPath);
    if(isList && products!==null) {
      const grid=container.querySelector('.shop-product-grid');
      if(grid) {
        const cards=grid.innerHTML;
        container.innerHTML=skin.listing();
        container.querySelector('#ecoPetGrid').innerHTML=cards;
        const count=container.querySelector('#ecoPetCount');
        const category=currentPath==='/nixa'?'pets':currentPath.startsWith('/shop/')?currentPath.split('/')[2]:null;
        const visible=category?products.filter(p=>p.category===category):products;
        if(count)count.textContent=number(visible.length)+' '+text('designs','طرح');
        container.querySelector('#ecoPetSearch')?.setAttribute('data-shop-search','');
        const price=container.querySelector('.eco-price-note');
        if(price)price.textContent=visible.length?text('From ','از ')+money(Math.min(...visible.map(p=>p.price))):'';
        container.querySelectorAll('a[href="#/shop/basket"]').forEach(a=>a.textContent=text('Your basket: ','سبد شما: ')+number(Object.values(cart).reduce((a,b)=>a+b,0))+' ↗');
        container.querySelectorAll('.eco-tier-explain,.eco-basket-rate').forEach(el=>el.remove());
      }
    }
    const classes={
      'shop-managed':'eco-shop', 'shop-card':'eco-product-card', 'shop-card-copy':'eco-product-copy',
      'shop-detail-layout':'eco-detail', 'shop-detail-copy':'eco-detail-copy',
      'shop-basket-line':'eco-basket-item', 'shop-line-content':'eco-product-copy',
      'shop-total':'eco-basket-summary','shop-message':'eco-note','shop-photo-placeholder':'eco-clean-photo'
    };
    for(const [from,to] of Object.entries(classes)) container.querySelectorAll('.'+from).forEach(el=>{el.classList.remove(from);el.classList.add(...to.split(' '));});
    container.querySelectorAll('.shop-photo').forEach(el=>{el.classList.remove('shop-photo');el.querySelector('img')?.classList.add('eco-original-photo');el.querySelector('figcaption')?.classList.add('eco-original-caption');});
    container.querySelectorAll('.eco-product-card').forEach((el,i)=>{
      const id=el.querySelector('[data-shop-add]')?.dataset.shopAdd; const p=find(id);
      const imageLink=el.querySelector(':scope > a');
      if(p&&imageLink&&p.cover_image===skin.originalImage(id)) {const tile=skin.tile(id);if(tile)imageLink.outerHTML=tile;}
      const copy=el.querySelector('.eco-product-copy');
      if(copy){
        const h=copy.querySelector('h2');if(h){const replacement=document.createElement('h3');replacement.textContent=h.textContent;h.replaceWith(replacement);}
        const price=copy.querySelector('.shop-price');const link=copy.querySelector('a');
        if(price&&link){const meta=document.createElement('div');meta.className='eco-product-meta';price.before(meta);meta.append(price,link);}
        copy.querySelector('[data-shop-add]')?.classList.add('eco-card-add');
      }
    });
    container.querySelectorAll('.eco-detail-copy [data-shop-add]').forEach(el=>el.classList.add('button','primary','eco-detail-add'));
    container.querySelectorAll('[data-shop-remove]').forEach(el=>el.parentElement.classList.add('eco-basket-controls'));
    const details=container.querySelector('.eco-detail');if(details&&!details.classList.contains('wrap'))details.classList.add('wrap');
    // Original scroll buttons and custom brief remain in the page.
    container.querySelectorAll('[data-eco-scroll]').forEach(button=>button.onclick=()=>document.getElementById(button.dataset.ecoScroll)?.scrollIntoView({behavior:'smooth'}));
  }

  /** All quantity changes use the latest stock snapshot, never a static price. */
  function updateDetailQuantity(container) {
    const qty=container.querySelector('#ecoQty');
    const p=find(decodeURIComponent(currentPath.split('/').pop()));
    if(!qty||!p)return;
    const count=qty.disabled?0:Math.min(Number(qty.max),Math.max(1,Math.floor(Number(qty.value)||1)));
    qty.value=count;
    const total=container.querySelector('#ecoTotal');
    if(total)total.textContent=money(unitPrice(p,count+basketQuantity())*count);
  }
  function bind(container) {
    container.onclick = event => {
      const add = event.target.closest("[data-shop-add], .eco-card-add[data-eco-add], .eco-detail-add[data-eco-add]");
      const remove = event.target.closest("[data-shop-remove]");
      const checkout=event.target.closest("[data-shop-checkout]");
      if (checkout) {
        event.preventDefault();if(checkout.disabled)return;checkout.disabled=true;
        cartSync.then(()=>fetchCart(false)).then(()=>{
          if(!basketQuantity())throw Error("The basket is empty");
          const route="/checkout?cart="+encodeURIComponent(cartToken);
          const url=window.SHN_NAVIGATION?.targetURL("as",route);
          if(!url)throw Error("Account website unavailable");
          location.assign(url);
        }).catch(()=>{checkout.disabled=false;window.alert(text("Checkout could not be opened. Refresh your basket.","صفحه پرداخت باز نشد؛ سبد را تازه‌سازی کنید."));});
        return;
      }
      if (add) {
        event.preventDefault();
        const p = find(add.dataset.shopAdd || add.dataset.ecoAdd);
        if (add.disabled || !p?.available || (cart[p.product_code] || 0) >= p.stock_qty) return;
        updateDetailQuantity(container);
        const requested=Math.max(1,Math.floor(Number(container.querySelector('#ecoQty')?.value)||1));
        syncItem(p.product_code, requested, true).then(saved => {
          mount(currentPath, container);
          if (saved) showAdded(p);
        });
      } else if (event.target.closest('#ecoQtyMinus,#ecoQtyPlus')) {
        const qty=container.querySelector('#ecoQty');if(!qty||qty.disabled)return;
        qty.value=Math.min(Number(qty.max),Math.max(1,Number(qty.value)+(event.target.closest('#ecoQtyPlus')?1:-1)));
        updateDetailQuantity(container);
      } else if (remove) {
        const id=remove.dataset.shopRemove; syncItem(id, 0).then(() => mount(currentPath, container));
      } else if (event.target.closest("[data-shop-retry]")) {
        failed = false; mount(currentPath, container);
      }
    };
    container.oninput = event => {
      if(event.target.matches("#ecoQty")){updateDetailQuantity(container);return;}
      if (!event.target.matches("[data-shop-search]")) return;
      const query = event.target.value.toLowerCase().trim();
      container.querySelectorAll("[data-shop-search-text]").forEach(card => { card.hidden = !card.dataset.shopSearchText.includes(query); });
    };
    container.onchange = event => {
      if(event.target.matches("#ecoQty")){updateDetailQuantity(container);return;}
      const input = event.target.closest("[data-shop-quantity]");
      if (!input) return;
      const p = find(input.dataset.shopQuantity);
      if (!p?.available) return;
      const quantity = Math.min(p.stock_qty, Math.max(1, Math.floor(Number(input.value) || 1)));
      syncItem(p.product_code, quantity).then(() => mount(currentPath, container));
    };
  }

  window.AS_SHOP_BACKEND = { owns, mount, reload() { products = null; failed = false; load(); this.refresh?.(); }, clearCart() { cart = Object.create(null); saveCart(); return clearServerCart().then(() => mount(currentPath, document.querySelector("#app"))); } };
  // Returning from Desk reloads product changes, publication flags and inventory.
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)window.AS_SHOP_BACKEND.reload();});
  window.addEventListener("focus", () => { cartToken = readToken() || cartToken; window.AS_SHOP_BACKEND.reload(); });
})();
