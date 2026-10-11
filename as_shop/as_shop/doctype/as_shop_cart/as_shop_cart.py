"""Recalculate cart snapshots and totals from products during every save."""
import re
import frappe
from frappe.model.document import Document
from frappe.utils import cint
from as_shop.pricing import unit_price

class ASShopCart(Document):
    def validate(self):
        previous=self.get_doc_before_save()
        if previous and self.cart_token_hash!=previous.cart_token_hash:
            frappe.throw("A cart token hash cannot be changed")
        self.currency="Toman"
        seen=set();self.total_qty=0;self.total_amount=0
        if len(self.items)>100:frappe.throw("Cart is limited to 100 products")
        basket_quantity=sum(cint(row.quantity) for row in self.items)
        for row in self.items:
            if not re.fullmatch(r"[0-9]{1,5}",str(row.quantity)) or not 1<=int(row.quantity)<=10000:frappe.throw("Item quantity must be a positive whole number")
            if row.product in seen:frappe.throw("Duplicate cart product")
            seen.add(row.product)
            p=frappe.db.get_value("AS Shop Product",row.product,["product_code","title","price","price_2","price_3","price_4_plus","show_on_website","stock_qty","manual_out_of_stock"],as_dict=True)
            if not p:frappe.throw("Cart product does not exist")
            row.product_code=p.product_code;row.product_title=p.title
            row.unit_price=unit_price(p, basket_quantity) if p.show_on_website else 0
            row.line_total=row.unit_price*cint(row.quantity) if p.show_on_website and not p.manual_out_of_stock and cint(p.stock_qty)>=cint(row.quantity) else 0
            self.total_qty+=cint(row.quantity);self.total_amount+=row.line_total
