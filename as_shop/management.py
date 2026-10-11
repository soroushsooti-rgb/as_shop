"""Inventory management uses native Desk documents, controllers and permissions."""
import base64
import json
import math
import secrets
from html import escape
from io import BytesIO
import warnings
import frappe
from frappe.rate_limiter import rate_limit
from frappe.sessions import get_csrf_token
from frappe.utils import cint, flt, get_datetime, strip_html
from PIL import Image, ImageOps, UnidentifiedImageError

PRODUCT = "AS Shop Product"
STOCK = "AS Shop Stock Entry"
FIELDS = ["product_code", "title", "title_en", "category", "caption", "caption_en",
          "description", "description_en", "price", "price_2", "price_3", "price_4_plus",
          "show_on_website", "manual_out_of_stock", "sort_order", "cover_image"]
IMAGE_FIELDS = ["image", "caption", "caption_en", "alt_text"]
READ_ACTIONS = {"catalog", "product", "stock", "history", "participants", "print"}
WRITE_ACTIONS = {"product_save", "product_delete", "product_duplicate", "stock_save",
                 "stock_submit", "stock_cancel", "stock_delete", "stock_amend", "stock_set",
                 "image_upload", "comment", "share", "unshare", "assign", "unassign", "import"}

def permitted(doctype, action):
    return bool(frappe.has_permission(doctype, action))

def require_access():
    if frappe.session.user == "Guest":
        frappe.throw("Sign in to the shop management account.", frappe.AuthenticationError)
    info = frappe.db.get_value("User", frappe.session.user, ["enabled", "user_type"], as_dict=True)
    if not info or not info.enabled or info.user_type != "System User" or not permitted(PRODUCT, "read"):
        frappe.throw("Shop management permission is required.", frappe.PermissionError)
    frappe.local.response["headers"] = {"Cache-Control": "no-store"}

@frappe.whitelist(allow_guest=True, methods=["GET"])
def session():
    frappe.local.response["headers"] = {"Cache-Control": "no-store"}
    allowed = False
    if frappe.session.user != "Guest":
        info = frappe.db.get_value("User", frappe.session.user, ["enabled", "user_type"], as_dict=True)
        allowed = bool(info and info.enabled and info.user_type == "System User" and permitted(PRODUCT, "read"))
    return {"user": frappe.session.user if allowed else None, "csrf_token": get_csrf_token(),
            "permissions": {kind: {action: permitted(dt, action) if allowed else False
                for action in ["read", "write", "create", "delete", "submit", "cancel", "amend", "export", "print", "share"]}
                for kind, dt in [("product", PRODUCT), ("stock", STOCK)]},
            "verification": frappe.local.response.get("verification"), "tmp_id": frappe.local.response.get("tmp_id")}

@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=600)
def login(usr="", pwd="", otp=None, tmp_id=None):
    identifier = str(usr or "").strip()
    frappe.form_dict.usr = frappe.db.get_value("User", {"username": identifier}, "name") or identifier
    frappe.form_dict.pwd = pwd
    if otp:
        frappe.form_dict.otp = otp
    if tmp_id:
        frappe.form_dict.tmp_id = tmp_id
    frappe.local.login_manager.login()
    return session()

def load_doc(kind, name, permission="read", modified=None):
    doc = frappe.get_doc(STOCK if kind == "stock" else PRODUCT, name)
    doc.check_permission(permission)
    if modified and get_datetime(doc.modified) != get_datetime(modified):
        frappe.throw("This record changed. Reload it before saving.", frappe.TimestampMismatchError)
    return doc

def public_doc(doc):
    values = ["name", "modified", "creation", "owner", "docstatus"]
    if doc.doctype == PRODUCT:
        result = {f: doc.get(f) for f in values + FIELDS + ["stock_qty"]}
        result["images"] = [{f: row.get(f) for f in IMAGE_FIELDS} for row in doc.images]
        return result
    return {f: doc.get(f) for f in values + ["product", "entry_type", "quantity", "notes", "stock_change", "stock_before", "stock_after", "amended_from"]}

def catalog():
    products = frappe.get_list(PRODUCT, fields=["name", "modified", "stock_qty"] + FIELDS,
                order_by="sort_order asc, creation asc", limit_page_length=0)
    images = frappe.get_all("AS Shop Product Image", filters={"parent": ["in", [p.name for p in products]], "parenttype": PRODUCT},
        fields=["parent", "idx"] + IMAGE_FIELDS, order_by="idx asc", limit_page_length=0) if products else []
    by_parent = {}
    for image in images:
        by_parent.setdefault(image.parent, []).append({f: image.get(f) for f in IMAGE_FIELDS})
    for product in products:
        product["images"] = by_parent.get(product.name, [])
    return {"products": products,
            "categories": (frappe.get_meta(PRODUCT).get_field("category").options or "").splitlines(),
            "permissions": session()["permissions"]}

def stock_list(product=None):
    if not permitted(STOCK, "read"):
        return []
    return frappe.get_list(STOCK, filters={"product": product} if product else {},
        fields=["name", "modified", "creation", "product", "entry_type", "quantity", "notes",
                "docstatus", "stock_change", "stock_before", "stock_after", "amended_from"],
        order_by="creation desc", limit_page_length=1000)

def history(payload):
    doc = load_doc(payload.get("kind"), payload["name"])
    comments = frappe.get_all("Comment", filters={"reference_doctype": doc.doctype, "reference_name": doc.name},
        fields=["name", "creation", "comment_by", "owner", "content", "comment_type"], order_by="creation desc", limit_page_length=100)
    for row in comments:
        row.content = strip_html(row.content or "")
    return {"versions": frappe.get_all("Version", filters={"ref_doctype": doc.doctype, "docname": doc.name},
                fields=["name", "creation", "owner", "data"], order_by="creation desc", limit_page_length=100),
            "comments": comments,
            "shares": frappe.get_all("DocShare", filters={"share_doctype": doc.doctype, "share_name": doc.name}, fields=["user", "read", "write", "submit", "share"]),
            "assignments": frappe.get_all("ToDo", filters={"reference_type": doc.doctype, "reference_name": doc.name, "status": "Open"}, fields=["allocated_to", "description", "name"])}

def whole(value, positive=False):
    try:
        if isinstance(value, bool):
            raise ValueError()
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        frappe.throw("Enter a valid whole number.")
    if not math.isfinite(number) or number != cint(number) or (positive and number < 0):
        frappe.throw("Enter a valid whole number.")
    return cint(number)

def save_product(payload):
    values = payload.get("values") or {}
    if not isinstance(values, dict) or set(values) - set(FIELDS + ["images"]):
        frappe.throw("Unsupported product fields.")
    if payload.get("name"):
        doc = load_doc("product", payload["name"], "write", payload.get("modified"))
    else:
        if not permitted(PRODUCT, "create"):
            frappe.throw("Product creation is not permitted.", frappe.PermissionError)
        doc = frappe.new_doc(PRODUCT)
    for field, value in values.items():
        if field == "images":
            if not isinstance(value, list) or len(value) > 100:
                frappe.throw("Choose a valid gallery with at most 100 images.")
            doc.set("images", [{f: row.get(f) for f in IMAGE_FIELDS} for row in value])
        else:
            if field in {"price", "price_2", "price_3", "price_4_plus"}:
                try:
                    value = float(value or 0)
                except (TypeError, ValueError, OverflowError):
                    frappe.throw("Enter a valid price in Toman.")
                if not math.isfinite(value) or value < 0:
                    frappe.throw("Enter a valid non-negative price in Toman.")
            elif field == "sort_order":
                value = whole(value or 0)
            doc.set(field, value)
    doc.insert() if doc.is_new() else doc.save()
    return doc

def set_stock(payload):
    doc = load_doc("product", payload["name"], "write")
    target = whole(payload["target"], positive=True)
    table = chr(96) + "tabAS Shop Product" + chr(96)
    before = cint(frappe.db.sql("SELECT stock_qty FROM " + table + " WHERE name=%s FOR UPDATE", doc.name)[0][0])
    if payload.get("expected") is not None and before != whole(payload["expected"], positive=True):
        frappe.throw("Stock changed. Reload the product before adjusting.", frappe.TimestampMismatchError)
    if target == before:
        return {"unchanged": True, "stock_qty": before}
    entry = frappe.get_doc({"doctype": STOCK, "product": doc.name, "entry_type": "Adjustment",
                "quantity": target-before, "notes": payload.get("notes") or "Stock adjustment from AS admin panel"})
    entry.insert()
    entry.submit()
    return public_doc(entry)

def save_stock(payload):
    values = payload.get("values") or {}
    if set(values) - {"product", "entry_type", "quantity", "notes"}:
        frappe.throw("Unsupported stock fields.")
    doc = load_doc("stock", payload["name"], "write", payload.get("modified")) if payload.get("name") else frappe.new_doc(STOCK)
    if doc.docstatus:
        frappe.throw("Only draft stock entries can be edited.")
    if values.get("product"):
        load_doc("product", values["product"])
    for field, value in values.items():
        doc.set(field, value)
    if "quantity" in values:
        doc.quantity = whole(values["quantity"])
    doc.insert() if doc.is_new() else doc.save()
    if payload.get("submit"):
        doc.submit()
    return public_doc(doc)

def upload_image(payload):
    doc = load_doc("product", payload["name"], "write")
    if not permitted("File", "create"):
        frappe.throw("Image upload is not permitted.", frappe.PermissionError)
    encoded = str(payload.get("content") or "")
    if len(encoded) > 7_000_000:
        frappe.throw("Choose an image smaller than 5 MB.")
    try:
        content = base64.b64decode(encoded, validate=True)
        if not content or len(content) > 5*1024*1024:
            raise ValueError()
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content), formats=["JPEG", "PNG", "WEBP"]) as original:
                if original.width*original.height > 20_000_000:
                    raise ValueError()
                original.load()
                image = ImageOps.exif_transpose(original)
                image.thumbnail((2048, 2048))
                image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB")
                image.info.clear()
                output = BytesIO()
                image.save(output, format="PNG", optimize=True)
    except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombWarning, Image.DecompressionBombError):
        frappe.throw("Choose a valid JPG, PNG or WebP image smaller than 5 MB.")
    file = frappe.get_doc({"doctype": "File", "file_name": "as-product-"+secrets.token_hex(8)+".png",
        "attached_to_doctype": PRODUCT, "attached_to_name": doc.name, "is_private": 0, "content": output.getvalue()})
    file.insert()
    return {"file_url": file.file_url, "name": file.name}

def record_action(action, payload):
    doc = load_doc(payload.get("kind"), payload["name"])
    if action == "comment":
        doc.add_comment("Comment", escape(str(payload.get("content") or "")[:10000]))
    elif action in {"share", "unshare"}:
        doc.check_permission("share")
        from frappe.share import add, remove
        user = str(payload.get("user") or "")
        if not user or user in {"Guest", "Administrator"}:
            frappe.throw("Choose a valid user.")
        if action == "share":
            add(doc.doctype, doc.name, user=user, read=1, write=cint(payload.get("write")),
                submit=cint(payload.get("submit")) if doc.doctype == STOCK else 0, notify=0)
        else:
            remove(doc.doctype, doc.name, user)
    elif action in {"assign", "unassign"}:
        doc.check_permission("write")
        from frappe.desk.form.assign_to import add, remove
        user = str(payload.get("user") or "")
        if action == "assign":
            add({"doctype": doc.doctype, "name": doc.name, "assign_to": [user],
                 "description": str(payload.get("description") or "")[:1000], "notify": 0})
        else:
            remove(doc.doctype, doc.name, user)
    return history({"kind": payload.get("kind"), "name": doc.name})

def import_products(payload):
    rows = payload.get("rows")
    mode = payload.get("mode", "create")
    if not isinstance(rows, list) or not 1 <= len(rows) <= 100 or mode not in {"create", "update", "both"}:
        frappe.throw("Import up to 100 products with a valid mode.")
    saved = []
    for item in rows:
        values = {k: v for k, v in item.items() if k in FIELDS or k == "images"}
        code = str(values.get("product_code") or "")
        existing = frappe.db.exists(PRODUCT, {"product_code": code})
        if existing and mode == "create":
            frappe.throw("Product code already exists: "+code)
        if not existing and mode == "update":
            frappe.throw("Product does not exist: "+code)
        if isinstance(values.get("images"), str):
            values["images"] = json.loads(values["images"] or "[]")
        doc = save_product({"name": existing or None, "values": values, "modified": item.get("modified")})
        if item.get("stock_qty") not in (None, ""):
            set_stock({"name": doc.name, "target": item["stock_qty"]})
        saved.append(doc.name)
    return {"saved": saved}

@frappe.whitelist(methods=["GET"])
def read(action, payload=None):
    require_access()
    if action not in READ_ACTIONS:
        frappe.throw("Unknown inventory operation.")
    payload = frappe.parse_json(payload) or {}
    if action == "catalog":
        return catalog()
    if action == "product":
        doc = load_doc("product", payload["name"])
        return {"product": public_doc(doc), "stock": stock_list(doc.name)}
    if action == "stock":
        return {"entries": stock_list(payload.get("product"))}
    if action == "history":
        return history(payload)
    if action == "participants":
        return {"users": frappe.get_list("User", filters={"enabled": 1, "user_type": "System User"},
            fields=["name", "full_name"], limit_page_length=500) if permitted("User", "read") else []}
    if action == "print":
        doc = load_doc(payload.get("kind"), payload["name"], "print")
        return {"html": frappe.get_print(doc.doctype, doc.name, print_format="Standard", doc=doc)}

@frappe.whitelist(methods=["POST"])
def write(action, payload=None):
    require_access()
    if action not in WRITE_ACTIONS:
        frappe.throw("Unknown inventory operation.")
    payload = frappe.parse_json(payload) or {}
    if action == "product_save":
        doc = save_product(payload)
        if payload.get("stock_target") is not None:
            set_stock({"name": doc.name, "target": payload["stock_target"],
                "expected": payload.get("stock_expected"), "notes": payload.get("stock_notes")})
            doc = frappe.get_doc(PRODUCT, doc.name)
        return {"product": public_doc(doc)}
    if action == "product_delete":
        doc = load_doc("product", payload["name"], "delete", payload.get("modified"))
        frappe.delete_doc(PRODUCT, doc.name)
        return {"deleted": doc.name}
    if action == "product_duplicate":
        source = load_doc("product", payload["name"])
        values = {f: source.get(f) for f in FIELDS}
        values["product_code"] = payload["product_code"]
        values["show_on_website"] = 0
        values["images"] = [{f: row.get(f) for f in IMAGE_FIELDS} for row in source.images]
        return {"product": public_doc(save_product({"values": values}))}
    if action == "stock_save":
        return save_stock(payload)
    if action == "stock_set":
        return set_stock(payload)
    if action in {"stock_submit", "stock_cancel", "stock_delete", "stock_amend"}:
        permission = {"stock_submit":"submit","stock_cancel":"cancel","stock_delete":"delete","stock_amend":"amend"}[action]
        doc = load_doc("stock", payload["name"], permission, payload.get("modified"))
        if action == "stock_submit":
            doc.submit()
        elif action == "stock_cancel":
            doc.cancel()
        elif action == "stock_delete":
            frappe.delete_doc(STOCK, doc.name)
            return {"deleted":doc.name}
        else:
            if doc.docstatus != 2:
                frappe.throw("Only cancelled entries can be amended.")
            amended = frappe.copy_doc(doc)
            amended.docstatus = 0
            amended.amended_from = doc.name
            amended.insert()
            doc = amended
        return public_doc(doc)
    if action == "image_upload":
        return upload_image(payload)
    if action in {"comment","share","unshare","assign","unassign"}:
        return record_action(action,payload)
    return import_products(payload)
