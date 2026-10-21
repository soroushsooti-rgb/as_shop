"""Orders, reservations and verified payments belong to AS Shop's native database."""
import hashlib
import hmac
import json
import re
import secrets
import time
from urllib.parse import urlencode, urlsplit, urlunsplit
import frappe
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, get_datetime, now_datetime, add_to_date
from as_shop.cart import get_owned_cart
from as_shop.pricing import unit_price
from as_shop import gateways
ORDER="AS Shop Order"
ATTEMPT="AS Shop Payment Attempt"
STOCK="AS Shop Stock Entry"
FULFILLMENT={"Preparing","Posted","Delivered"}
def table(name):
    return chr(96)+"tab"+name+chr(96)
def no_store():
    frappe.local.response["headers"]={"Cache-Control":"no-store"}
def save(doc):
    doc.flags.checkout_update=True
    doc.flags.ignore_permissions=True
    doc.insert(ignore_permissions=True) if doc.is_new() else doc.save(ignore_permissions=True)
    return doc
def event(doc,kind,message,actor):
    doc.append("events",{"event_type":kind,"message":message,"occurred_at":now_datetime(),"actor":actor})
def validate_order(doc):
    if doc.flags.checkout_update:
        return
    previous=doc.get_doc_before_save()
    if not previous:
        frappe.throw("Orders are created by checkout.")
    editable={"fulfillment_status","tracking_code","shipping_company","admin_notes"}
    protected=[field.fieldname for field in doc.meta.fields if field.fieldtype not in {"Section Break","Column Break","HTML","Table"} and field.fieldname not in editable]
    for key in protected:
        if previous.get(key)!=doc.get(key):
            frappe.throw("Payment, address and order amounts cannot be edited.")
    for child,keys in [("items",["product","product_code","title","title_en","image","quantity","unit_price","line_total","reservation_entry","release_entry"]),
                       ("events",["event_type","message","occurred_at","actor"])]:
        old=[{k:r.get(k) for k in keys} for r in previous.get(child)]
        new=[{k:r.get(k) for k in keys} for r in doc.get(child)]
        if old!=new:
            frappe.throw("Order items and payment history cannot be edited.")
    if doc.fulfillment_status not in FULFILLMENT:
        frappe.throw("Choose a valid fulfillment status.")
    if doc.fulfillment_status!=previous.fulfillment_status:
        if doc.payment_status!="Paid" or doc.needs_review or doc.is_test:
            frappe.throw("Fulfillment requires a verified payment and reserved stock.")
        if doc.fulfillment_status=="Posted":
            doc.posted_at=now_datetime();doc.delivered_at=None
        elif doc.fulfillment_status=="Delivered":
            doc.delivered_at=now_datetime()
        else:
            doc.posted_at=None;doc.delivered_at=None
        event(doc,"fulfillment",doc.fulfillment_status,frappe.session.user)
def lock_order(name):
    exists=frappe.db.sql("SELECT name FROM "+table(ORDER)+" WHERE name=%s FOR UPDATE",name)
    if not exists:
        frappe.throw("Order not found.",frappe.DoesNotExistError)
    return frappe.get_doc(ORDER,name)
def owned_order(name,customer):
    doc=lock_order(name)
    if doc.customer_id!=customer["id"]:
        frappe.throw("Order not found.",frappe.PermissionError)
    expire(doc)
    return doc
def public_order(doc,admin=False):
    fields=["name","creation","modified","payment_status","fulfillment_status","needs_review","tracking_code",
            "shipping_company","recipient_name","mobile","province","city","address","postal_code","customer_notes",
            "currency","language","is_test","subtotal","shipping_fee","total_amount","total_qty","expires_at","paid_at","posted_at","delivered_at","payment_reference"]
    result={f:doc.get(f) for f in fields}
    result["items"]=[{f:row.get(f) for f in ["product_code","title","title_en","image","quantity","unit_price","line_total"]} for row in doc.items]
    result["events"]=[{f:row.get(f) for f in ["event_type","message","occurred_at"]} for row in doc.events]
    if admin:
        result.update({f:doc.get(f) for f in ["customer_name","customer_email","admin_notes","reserved","active_attempt"]})
    return result
def movement(doc,row,kind,quantity):
    entry=frappe.get_doc({"doctype":STOCK,"product":row.product,"entry_type":kind,"quantity":quantity,
                         "notes":"Order "+doc.name+(" reservation" if kind=="Stock Out" else " reservation release")})
    entry.flags.ignore_permissions=True
    entry.insert(ignore_permissions=True)
    entry.submit()
    return entry.name
def reserve(doc):
    if doc.reserved:
        return
    for row in sorted(doc.items,key=lambda item:item.product):
        product=frappe.db.sql("SELECT stock_qty FROM "+table("AS Shop Product")+" WHERE name=%s FOR UPDATE",row.product)
        if not product or cint(product[0][0])<cint(row.quantity):
            frappe.throw("Requested quantity is not available.")
        row.reservation_entry=movement(doc,row,"Stock Out",cint(row.quantity))
        row.release_entry=None
    doc.reserved=1
def release(doc):
    if not doc.reserved:
        return
    for row in sorted(doc.items,key=lambda item:item.product):
        row.release_entry=movement(doc,row,"Stock In",cint(row.quantity))
    doc.reserved=0
def expire(doc):
    if doc.payment_status!="Paid" and doc.payment_status!="Expired" and doc.expires_at and get_datetime(doc.expires_at)<now_datetime():
        release(doc)
        doc.payment_status="Expired"
        event(doc,"payment","Expired","System")
        save(doc)
def expire_reservations():
    names=frappe.get_all(ORDER,filters={"payment_status":["in",["Awaiting Payment","Failed"]],"expires_at":["<",now_datetime()]},pluck="name",limit_page_length=200)
    for name in names:
        frappe.db.savepoint("order_expiry")
        try:
            expire(lock_order(name))
            frappe.db.commit()
        except Exception:
            frappe.db.rollback(save_point="order_expiry")
            frappe.log_error(title="AS order reservation expiry",message="Order "+name+" needs expiry review.")
def signed_request(envelope,signature):
    secret=frappe.conf.get("as_checkout_bridge_secret")
    if not secret:
        frappe.throw("Checkout connection is not configured.",frappe.PermissionError)
    if not isinstance(envelope,str) or len(envelope)>7*1024*1024:
        frappe.throw("Invalid checkout request.",frappe.PermissionError)
    expected=hmac.new(secret.encode(),envelope.encode(),hashlib.sha256).hexdigest()
    if not isinstance(signature,str) or not hmac.compare_digest(expected,signature):
        frappe.throw("Invalid checkout signature.",frappe.PermissionError)
    data=json.loads(envelope)
    if len(envelope)>100000 and data.get("action")!="figure_submit":
        frappe.throw("Invalid checkout request.",frappe.PermissionError)
    if data.get("issuer")!=frappe.conf.get("as_checkout_issuer","as-industries") or abs(time.time()-float(data.get("timestamp") or 0))>90:
        frappe.throw("Checkout request expired.",frappe.PermissionError)
    nonce=str(data.get("nonce") or "")
    if not re.fullmatch(r"[a-f0-9]{32}",nonce) or not frappe.cache.set(frappe.cache.make_key("as-checkout:"+nonce),"1",nx=True,ex=180):
        frappe.throw("Checkout request already used.",frappe.PermissionError)
    customer=data.get("customer") or {}
    if not customer.get("id"):
        frappe.throw("Customer identity is required.",frappe.PermissionError)
    return data
def shipping(values):
    if not isinstance(values,dict):
        frappe.throw("Enter a valid delivery address.")
    result={key:str(values.get(key) or "").strip() for key in ["recipient_name","mobile","province","city","address","postal_code","customer_notes"]}
    for field in ("recipient_name","province","city","address"):
        if not 2<=len(result[field])<=({"address":1000}.get(field,140)):
            frappe.throw("Complete the recipient name, province, city and address.")
    translate=str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩","01234567890123456789")
    mobile=re.sub(r"[\s()-]","",result["mobile"].translate(translate))
    if mobile.startswith("+98"):mobile="0"+mobile[3:]
    elif mobile.startswith("98"):mobile="0"+mobile[2:]
    if not re.fullmatch(r"09[0-9]{9}",mobile):
        frappe.throw("Enter a valid Iranian mobile number.")
    result["mobile"]=mobile
    result["postal_code"]=result["postal_code"].translate(translate).replace(" ","").replace("-","")
    if not re.fullmatch(r"[0-9]{10}",result["postal_code"]):
        frappe.throw("Enter a ten-digit postal code.")
    if len(result["customer_notes"])>1000:
        frappe.throw("Keep delivery notes under 1,000 characters.")
    return result
def snapshot(cart):
    if not cart.items:
        frappe.throw("The basket is empty.")
    names=sorted({row.product for row in cart.items})
    records={}
    for name in names:
        rows=frappe.db.sql("SELECT name,product_code,title,title_en,cover_image,price,price_2,price_3,price_4_plus,stock_qty,show_on_website,manual_out_of_stock FROM "+table("AS Shop Product")+" WHERE name=%s FOR UPDATE",name,as_dict=True)
        if rows:records[name]=rows[0]
    total_qty=sum(cint(row.quantity) for row in cart.items)
    items=[]
    for row in cart.items:
        product=records.get(row.product)
        qty=cint(row.quantity)
        if not product or not product.show_on_website or product.manual_out_of_stock or qty<=0 or cint(product.stock_qty)<qty:
            frappe.throw("Some basket products are no longer available.")
        price=unit_price(product,total_qty)
        if price<=0:
            frappe.throw("A product does not have a purchasable price.")
        items.append({"product":product.name,"product_code":product.product_code,"title":product.title,
                      "title_en":product.title_en,"image":product.cover_image,"quantity":qty,
                      "unit_price":price,"line_total":price*qty})
    return items,total_qty,sum(item["line_total"] for item in items)
def preview(payload):
    cart=get_owned_cart(payload.get("cart_token"))
    existing=frappe.db.get_value(ORDER,{"cart":cart.name},"name")
    if cart.status!="Open":
        return {"closed":True,"settings":gateways.public_settings()}
    items,quantity,subtotal=snapshot(cart)
    settings=gateways.public_settings()
    return {"closed":False,"items":[{k:v for k,v in row.items() if k!="product"} for row in items],"total_qty":quantity,
            "subtotal":subtotal,"shipping_fee":settings["shipping_fee"],"total_amount":subtotal+settings["shipping_fee"],
            "currency":"Toman","settings":settings}
def request_new_order(payload,customer):
    if customer["id"]=="Guest":
        frappe.throw("Sign in before placing an order.",frappe.AuthenticationError)
    config=gateways.settings()
    if not gateways.public_settings()["ready"]:
        frappe.throw("Online payment is not configured yet.")
    gateways.validate_settings(config)
    delivery=shipping(payload.get("shipping"))
    cart=get_owned_cart(payload.get("cart_token"),lock=True)
    existing=frappe.db.get_value(ORDER,{"cart":cart.name},"name")
    if existing:
        doc=owned_order(existing,customer)
        attempt=frappe.get_doc(ATTEMPT,doc.active_attempt) if doc.active_attempt else None
        return {"order":public_order(doc),"redirect_url":attempt.redirect_url if attempt and attempt.status=="Pending" and doc.payment_status=="Awaiting Payment" else None}
    if cart.status!="Open":
        frappe.throw("This basket has already been checked out.")
    items,quantity,subtotal=snapshot(cart)
    doc=frappe.get_doc({"doctype":ORDER,"customer_id":customer["id"],"customer_name":customer.get("name"),
        "customer_email":customer.get("email"),"cart":cart.name,"currency":"Toman","language":payload.get("language") if payload.get("language") in {"fa","en"} else "fa","is_test":cint(config.sandbox),"subtotal":subtotal,
        "shipping_fee":config.shipping_fee or 0,"total_amount":subtotal+(config.shipping_fee or 0),"total_qty":quantity,
        "payment_status":"Awaiting Payment","fulfillment_status":"Preparing","expires_at":add_to_date(now_datetime(),minutes=cint(config.reservation_minutes or 20)),
        "items":items,**delivery})
    event(doc,"payment","Awaiting Payment",customer["id"])
    save(doc)
    reserve(doc)
    callback_token=secrets.token_urlsafe(32)
    attempt=frappe.get_doc({"doctype":ATTEMPT,"order":doc.name,"provider":config.provider,"sandbox":config.sandbox,
        "amount_rial":gateways.amount_rial(doc.total_amount),"status":"Initiating",
        "callback_token_hash":hashlib.sha256(callback_token.encode()).hexdigest(),"gateway_key":gateways.credential(config)})
    save(attempt)
    doc.active_attempt=attempt.name
    cart.status="Submitted";cart.save(ignore_permissions=True)
    # Commit reservation and attempt before the external request; callbacks can arrive independently.
    save(doc)
    frappe.db.commit()
    callback=config.public_shop_url.rstrip("/")+"/api/method/as_shop.orders.callback?"+urlencode({"attempt":attempt.name,"token":callback_token})
    try:
        authority,redirect=gateways.request_payment(attempt,callback,doc.mobile)
    except gateways.GatewayRejected as error:
        doc=lock_order(doc.name);release(doc);doc.payment_status="Failed"
        attempt=frappe.get_doc(ATTEMPT,attempt.name);attempt.status="Failed";attempt.gateway_code=error.code
        event(doc,"payment","Failed","Gateway");save(attempt);save(doc)
        return {"order":public_order(doc),"redirect_url":None,"message":"The gateway rejected the payment request."}
    except gateways.GatewayUnavailable:
        attempt=frappe.get_doc(ATTEMPT,attempt.name);attempt.status="Review";save(attempt)
        return {"order":public_order(doc),"redirect_url":None,"message":"The gateway did not respond. The order is saved; check its status before trying again."}
    doc=lock_order(doc.name)
    attempt=frappe.get_doc(ATTEMPT,attempt.name)
    attempt.authority=authority;attempt.redirect_url=redirect;attempt.status="Pending";save(attempt)
    return {"order":public_order(doc),"redirect_url":redirect}
def verify_attempt(attempt_name,from_callback=False):
    attempt=frappe.get_doc(ATTEMPT,attempt_name)
    doc=lock_order(attempt.order)
    attempt=frappe.get_doc(ATTEMPT,attempt_name)
    if attempt.status=="Paid":
        return doc
    if doc.active_attempt!=attempt.name or not attempt.authority:
        return doc
    try:
        reference,code=gateways.verify_payment(attempt)
    except gateways.GatewayUnavailable:
        attempt.status="Review";save(attempt)
        return doc
    except gateways.GatewayRejected as error:
        # A read/reconciliation before payment cannot cancel a customer's pending checkout.
        if from_callback and doc.payment_status!="Paid":
            release(doc);doc.payment_status="Failed" if doc.payment_status!="Expired" else "Expired"
            attempt.status="Failed";event(doc,"payment","Failed","Gateway")
        attempt.gateway_code=error.code;save(attempt);save(doc)
        return doc
    if doc.payment_status=="Paid":
        return doc
    if doc.is_test:
        release(doc)
    elif not doc.reserved:
        frappe.db.savepoint("late_payment_stock")
        try:
            reserve(doc)
        except frappe.ValidationError:
            frappe.db.rollback(save_point="late_payment_stock")
            doc=frappe.get_doc(ORDER,doc.name);doc.needs_review=1
    doc.payment_status="Paid";doc.paid_at=now_datetime();doc.payment_reference=reference
    attempt.status="Paid";attempt.reference_id=reference;attempt.verified_at=now_datetime();attempt.gateway_code=code
    event(doc,"payment","Paid","Gateway");save(attempt);save(doc)
    return doc
@frappe.whitelist(allow_guest=True,methods=["POST"])
@rate_limit(limit=240,seconds=60)
def service(envelope,signature):
    no_store()
    data=signed_request(envelope,signature)
    action=data.get("action");payload=data.get("payload") or {};customer=data["customer"]
    if action=="preview":
        return preview(payload)
    if customer["id"]=="Guest":
        frappe.throw("Sign in first.",frappe.AuthenticationError)
    if action in {"figure_submit", "figure_mine", "figure_admin", "figure_image", "figure_admin_image"}:
        from as_shop.figure_requests import shared_service
        return shared_service(action, payload, customer)
    if action=="start":
        return request_new_order(payload,customer)
    if action in {"order","reconcile"}:
        doc=owned_order(payload["name"],customer)
        if action=="reconcile" and doc.active_attempt and doc.payment_status!="Paid":
            doc=verify_attempt(doc.active_attempt)
        return {"order":public_order(doc)}
    if action=="orders":
        start=max(0,cint(payload.get("start")))
        names=frappe.get_all(ORDER,filters={"customer_id":customer["id"]},pluck="name",order_by="creation desc",limit_start=start,limit_page_length=21)
        orders=[public_order(owned_order(name,customer)) for name in names[:20]]
        return {"orders":orders,"has_more":len(names)>20}
    frappe.throw("Unknown checkout operation.")
@frappe.whitelist(allow_guest=True,methods=["GET"])
@rate_limit(limit=120,seconds=60)
def callback(attempt,token,Authority=None,Status=None,trackId=None,success=None,**kwargs):
    no_store()
    saved=frappe.get_doc(ATTEMPT,attempt)
    hashed=hashlib.sha256(str(token or "").encode()).hexdigest()
    authority=str(Authority if saved.provider=="Zarinpal" else trackId or "")
    if not hmac.compare_digest(hashed,str(saved.callback_token_hash or "")) or not saved.authority or authority!=saved.authority:
        frappe.throw("Invalid payment callback.",frappe.PermissionError)
    doc=verify_attempt(saved.name,from_callback=True)
    frappe.db.commit()
    base=gateways.settings().customer_website_url
    url=urlsplit(base)
    destination=urlunsplit((url.scheme,url.netloc,url.path,urlencode({"lang":doc.language or "fa"}),"/orders?"+urlencode({"order":doc.name})))
    frappe.local.response["type"]="redirect";frappe.local.response["location"]=destination
def require_admin():
    from as_shop.management import require_access
    require_access()
    if not frappe.has_permission(ORDER,"read"):
        frappe.throw("Order management permission is required.",frappe.PermissionError)
@frappe.whitelist(methods=["GET"])
def admin_read(action,payload=None):
    no_store();require_admin();payload=frappe.parse_json(payload) or {}
    if action=="orders":
        filters={}
        if payload.get("payment_status"):filters["payment_status"]=payload["payment_status"]
        if payload.get("fulfillment_status"):filters["fulfillment_status"]=payload["fulfillment_status"]
        query=str(payload.get("query") or "")[:140]
        or_filters={field:["like","%"+query+"%"] for field in ["name","recipient_name","mobile","tracking_code"]} if query else None
        start=max(0,cint(payload.get("start")))
        rows=frappe.get_list(ORDER,filters=filters,or_filters=or_filters,fields=["name","modified","creation","recipient_name","mobile","total_amount","payment_status","fulfillment_status","needs_review","is_test","tracking_code"],order_by="creation desc",limit_start=start,limit_page_length=26)
        return {"orders":rows[:25],"has_more":len(rows)>25,"can_write":bool(frappe.has_permission(ORDER,"write"))}
    if action=="order":
        doc=lock_order(payload["name"]);doc.check_permission("read");before=doc.payment_status;expire(doc)
        if before!=doc.payment_status:frappe.db.commit()
        return {"order":public_order(doc,True),"can_write":bool(frappe.has_permission(ORDER,"write",doc))}
    if action=="settings":
        doc=gateways.settings();doc.check_permission("read")
        return {"settings":{**gateways.public_settings(),"public_shop_url":doc.public_shop_url or "","customer_website_url":doc.customer_website_url or "",
            "has_credential":bool(doc.get_password("merchant_id",raise_exception=False))},"can_write":bool(frappe.has_permission(gateways.SETTINGS,"write"))}
    frappe.throw("Unknown order management operation.")
@frappe.whitelist(methods=["POST"])
def admin_write(action,payload=None):
    no_store();require_admin();payload=frappe.parse_json(payload) or {}
    if action=="settings":
        doc=gateways.settings();doc.check_permission("write")
        allowed={"enabled","provider","sandbox","public_shop_url","customer_website_url","shipping_fee","shipping_description","reservation_minutes","merchant_id"}
        values=payload.get("values") or {}
        if set(values)-allowed:frappe.throw("Unsupported payment settings.")
        for field,value in values.items():
            if field!="merchant_id" or value:doc.set(field,value)
        doc.save()
        return {"saved":True}
    doc=lock_order(payload["name"]);doc.check_permission("write")
    if payload.get("modified") and get_datetime(doc.modified)!=get_datetime(payload["modified"]):
        frappe.throw("Order changed. Reload it before saving.",frappe.TimestampMismatchError)
    if action=="reconcile":
        if doc.active_attempt:doc=verify_attempt(doc.active_attempt)
        if doc.payment_status=="Paid" and doc.needs_review and not doc.is_test:
            reserve(doc);doc.needs_review=0;event(doc,"stock","Stock allocated",frappe.session.user);save(doc)
        return {"order":public_order(doc,True)}
    if action=="fulfillment":
        values=payload.get("values") or {}
        if set(values)-{"fulfillment_status","tracking_code","shipping_company","admin_notes"}:
            frappe.throw("Unsupported order fields.")
        for field,value in values.items():
            doc.set(field,str(value or "")[:(3000 if field=="admin_notes" else 140)])
        doc.save()
        return {"order":public_order(doc,True)}
    frappe.throw("Unknown order management operation.")
