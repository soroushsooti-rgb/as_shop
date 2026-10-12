import frappe
from frappe.model.document import Document
from as_shop.orders import validate_order
class ASShopOrder(Document):
    def validate(self):
        validate_order(self)
