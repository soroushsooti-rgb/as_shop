"""Product editing rules. Public stock is changed only by submitted movements."""

import math
import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, cint


def validate_public_image(value):
    """Only this site's public uploads and packaged shop images are published."""
    if not value:
        return
    if not value.startswith(("/files/", "/assets/as_shop/media/")) or any(
        part in value for part in ("..", "\\", "\n", "\r", "?", "#")
    ):
        frappe.throw(_("Use a public uploaded image or an AS Shop media file."))


class ASShopProduct(Document):
    def validate(self):
        """Keep product URLs stable, prices valid, and stock backed by a ledger."""
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", self.product_code or ""):
            frappe.throw(_("Product Code must contain lowercase English letters, numbers and hyphens."))
        if not math.isfinite(flt(self.price)) or flt(self.price) < 0:
            frappe.throw(_("Price must be a finite non-negative amount in Toman."))
        previous = self.get_doc_before_save()
        if previous and self.product_code != previous.product_code:
            frappe.throw(_("Product Code cannot change after creation."))
        expected = cint(previous.stock_qty) if previous else 0
        if cint(self.stock_qty) != expected:
            frappe.throw(_("Change stock using an AS Shop Stock Entry."))
        if previous:
            # Preserve ledger changes committed since this form was loaded.
            current = frappe.db.sql(
                "SELECT stock_qty FROM `tabAS Shop Product` WHERE name=%s FOR UPDATE", self.name
            )
            self.stock_qty = cint(current[0][0])
        validate_public_image(self.cover_image)
        for item in self.images:
            validate_public_image(item.image)
