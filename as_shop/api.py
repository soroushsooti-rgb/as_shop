"""Public, read-only catalogue. Editing remains behind Frappe role permissions."""

import json

import frappe
from frappe.utils import cint, flt
from werkzeug.wrappers import Response

PUBLIC_FIELDS = [
    "name", "product_code", "title", "title_en", "category", "caption", "caption_en",
    "description", "description_en", "price", "price_2", "price_3", "price_4_plus", "cover_image", "stock_qty", "manual_out_of_stock",
]


def catalogue_data():
    """Filter publication on the server, including direct product requests."""
    products = frappe.get_all(
        "AS Shop Product", filters={"show_on_website": 1}, fields=PUBLIC_FIELDS,
        order_by="sort_order asc, creation asc",
    )
    images = frappe.get_all(
        "AS Shop Product Image",
        filters={"parenttype": "AS Shop Product", "parent": ["in", [p.name for p in products]]},
        fields=["parent", "image", "caption", "caption_en", "alt_text"], order_by="idx asc",
    ) if products else []
    gallery = {}
    for row in images:
        gallery.setdefault(row.pop("parent"), []).append(dict(row))
    for product in products:
        for field in ("price", "price_2", "price_3", "price_4_plus"):
            product[field] = flt(product.get(field))
        product["stock_qty"] = max(0, cint(product.stock_qty))
        product["available"] = bool(product.stock_qty > 0 and not cint(product.manual_out_of_stock))
        product["images"] = gallery.get(product.name, [])
        product["currency"] = "Toman"
    return {"products": products, "currency": "Toman", "api_version": 1}


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_catalog():
    """Return published products without caching deleted or hidden products."""
    if frappe.db.exists("DocType", "AS Shop Order"):
        from as_shop.orders import expire_reservations
        expire_reservations()
    response = Response(
        json.dumps({"message": catalogue_data()}, ensure_ascii=False), mimetype="application/json"
    )
    response.headers["Cache-Control"] = "no-store"
    return response



from as_shop.cart import get_cart, set_cart_item, clear_cart
