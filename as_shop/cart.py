"""Browser-owned server carts. Tokens are bearer secrets; only hashes are stored."""
import hashlib
import re
import secrets
import frappe
from frappe.utils import cint
from as_shop.pricing import unit_price

TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{48}$")

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

def get_owned_cart(token, lock=False):
    if not isinstance(token, str) or not TOKEN_RE.fullmatch(token):
        frappe.throw("Invalid cart token", frappe.PermissionError)
    rows = frappe.db.sql("SELECT name FROM `tabAS Shop Cart` WHERE cart_token_hash=%s" + (" FOR UPDATE" if lock else ""), token_hash(token))
    if not rows:
        frappe.throw("Cart not found", frappe.PermissionError)
    return frappe.get_doc("AS Shop Cart", rows[0][0])

def payload(doc):
    items=[]
    basket_quantity=sum(cint(row.quantity) for row in doc.items)
    for row in doc.items:
        p=frappe.db.get_value("AS Shop Product", row.product, ["product_code","title","title_en","cover_image","stock_qty","manual_out_of_stock","show_on_website","price","price_2","price_3","price_4_plus"], as_dict=True)
        qty=cint(row.quantity)
        available=bool(p and p.show_on_website and not p.manual_out_of_stock and cint(p.stock_qty)>=qty)
        price=unit_price(p, basket_quantity) if p and p.show_on_website else 0
        items.append({"product_code":row.product_code,"title":p.title if p and p.show_on_website else row.product_title,"title_en":p.title_en if p and p.show_on_website else "", "quantity":qty,"unit_price":price,"price":float(p.price) if p and p.show_on_website else 0,"price_2":float(p.price_2 or 0) if p and p.show_on_website else 0,"price_3":float(p.price_3 or 0) if p and p.show_on_website else 0,"price_4_plus":float(p.price_4_plus or 0) if p and p.show_on_website else 0,"line_total":price*qty if available else 0,"available":available,"product_available":bool(p and p.show_on_website and not p.manual_out_of_stock and cint(p.stock_qty)>0),"published":bool(p and p.show_on_website),"stock_qty":max(0,cint(p.stock_qty)) if p and p.show_on_website else 0})
    return {"name":doc.name,"status":doc.status,"currency":"Toman","items":items,"total_qty":sum(i["quantity"] for i in items),"total_amount":sum(i["line_total"] for i in items)}

@frappe.whitelist(allow_guest=True, methods=["POST"])
def get_cart(cart_token=None):
    """Create on the first request; subsequent reads require the existing token."""
    if cart_token:
        doc=get_owned_cart(cart_token)
        token=cart_token
    else:
        token=secrets.token_urlsafe(36)
        doc=frappe.get_doc({"doctype":"AS Shop Cart","cart_token_hash":token_hash(token),"token_last4":token[-4:],"status":"Open","currency":"Toman"})
        doc.insert(ignore_permissions=True)
    result=payload(doc);result["cart_token"]=token
    frappe.local.response_headers["Cache-Control"]="no-store"
    return result

@frappe.whitelist(allow_guest=True, methods=["POST"])
def set_cart_item(cart_token, product_code, quantity):
    """Absolute quantities make repeated requests idempotent. No client price is used."""
    doc=get_owned_cart(cart_token, lock=True)
    if doc.status!="Open":frappe.throw("This cart is closed")
    if not isinstance(product_code,str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",product_code):frappe.throw("Invalid product code")
    if not re.fullmatch(r"[0-9]{1,5}",str(quantity)) or int(quantity)>10000:frappe.throw("Quantity must be a whole number between 0 and 10000")
    qty=int(quantity)
    row=next((r for r in doc.items if r.product_code==product_code),None)
    if qty==0:
        if row:doc.remove(row)
    else:
        rows=frappe.db.sql("SELECT name, title, price, stock_qty, manual_out_of_stock, show_on_website FROM `tabAS Shop Product` WHERE product_code=%s FOR UPDATE",product_code,as_dict=True)
        if not rows or not rows[0].show_on_website:frappe.throw("Product is not available")
        p=rows[0]
        if p.manual_out_of_stock or cint(p.stock_qty)<qty:frappe.throw("Requested quantity is not available")
        if not row:
            if len(doc.items)>=100:frappe.throw("Cart is limited to 100 products")
            row=doc.append("items",{"product":p.name,"product_code":product_code})
        row.quantity=qty
    doc.save(ignore_permissions=True)
    result=payload(doc);result["cart_token"]=cart_token
    frappe.local.response_headers["Cache-Control"]="no-store"
    return result

@frappe.whitelist(allow_guest=True, methods=["POST"])
def clear_cart(cart_token):
    doc=get_owned_cart(cart_token,lock=True)
    if doc.status!="Open":frappe.throw("This cart is closed")
    doc.items=[];doc.save(ignore_permissions=True)
    result=payload(doc);result["cart_token"]=cart_token
    return result
