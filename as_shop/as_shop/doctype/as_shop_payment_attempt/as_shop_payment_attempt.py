import frappe
from frappe.model.document import Document
class ASShopPaymentAttempt(Document):
    def validate(self):
        if not self.flags.checkout_update:
            frappe.throw("Payment attempts are managed by checkout.")
