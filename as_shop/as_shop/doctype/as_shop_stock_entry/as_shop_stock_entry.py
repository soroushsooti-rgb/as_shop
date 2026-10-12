"""Auditable stock changes with a database lock against concurrent withdrawals."""

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt


class ASShopStockEntry(Document):
    def validate(self):
        """Draft movements do not alter stock. Quantities are whole pieces."""
        quantity = flt(self.quantity)
        if quantity != cint(quantity) or not quantity:
            frappe.throw(_("Quantity must be a non-zero whole number."))
        if self.entry_type != "Adjustment" and quantity < 0:
            frappe.throw(_("Stock In and Stock Out require a positive quantity."))

    def apply_change(self, change):
        """The product row stays locked until Frappe commits the document action."""
        result = frappe.db.sql(
            "SELECT stock_qty FROM `tabAS Shop Product` WHERE name=%s FOR UPDATE",
            self.product,
        )
        if not result:
            frappe.throw(_("Product does not exist."))
        before = cint(result[0][0])
        after = before + change
        if after < 0:
            frappe.throw(_("This movement would make stock negative. Current stock: {0}").format(before))
        # The ledger controller is the sole writer of this read-only product field.
        frappe.db.set_value("AS Shop Product", self.product, "stock_qty", after)
        return before, after

    def on_submit(self):
        """Only a submitted movement affects availability on the website."""
        change = cint(self.quantity) * (-1 if self.entry_type == "Stock Out" else 1)
        before, after = self.apply_change(change)
        self.db_set({"stock_change": change, "stock_before": before, "stock_after": after})

    def on_cancel(self):
        """Reverse the movement; reject reversal if subsequent issues used stock."""
        # Preserve earlier reservation movements even after a late payment allocates stock again.
        if frappe.db.exists("DocType", "AS Shop Order") and str(self.notes or "").startswith("Order "):
            order_name = str(self.notes).split(" ", 2)[1]
            if frappe.db.exists("AS Shop Order", order_name):
                frappe.throw(_("Order stock movements must be managed through the order."))
        if frappe.db.exists("DocType", "AS Shop Order Item"):
            for field in ("reservation_entry", "release_entry"):
                if frappe.db.exists("AS Shop Order Item", {field: self.name}):
                    frappe.throw(_("Order stock movements must be managed through the order."))
        self.apply_change(-cint(self.stock_change))

