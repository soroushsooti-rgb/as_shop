import frappe
from frappe import _
from frappe.model.document import Document

OPEN_STATUSES = ("Open", "In Review", "Quoted", "In Production")

class ASShopFigureRequest(Document):
    def validate(self):
        self.full_name = (self.full_name or "").strip()
        self.contact = (self.contact or "").strip()
        if not self.contact:
            frappe.throw(_("Contact information is required"))
        if not self.quantity or int(self.quantity) < 1:
            frappe.throw(_("Quantity must be at least 1"))

        existing = frappe.db.exists(
            "AS Shop Figure Request",
            {
                "owner": self.owner,
                "request_type": self.request_type,
                "status": ("in", OPEN_STATUSES),
                "name": ("!=", self.name or ""),
            },
        )
        if existing:
            frappe.throw(
                _("You already have an open {0} request: {1}").format(
                    self.request_type, existing
                )
            )
