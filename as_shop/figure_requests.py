"""Figure request API: submit and list, strictly scoped to the session user."""

import frappe
from frappe import _

FIGURE_REQUEST = "AS Shop Figure Request"


@frappe.whitelist(methods=["POST"])
def submit_figure_request(**kwargs):
    """Create a figure request owned by the logged-in user."""
    user = frappe.session.user
    if user in ("Guest", None):
        frappe.throw(_("Please sign in to submit a request"), frappe.PermissionError)

    request_type = (kwargs.get("type") or "").strip()
    valid_types = ("pet", "family", "kitchen", "nfc", "gadgets", "furniture", "idea")
    if request_type not in valid_types:
        frappe.throw(_("Invalid request type"))

    doc = frappe.get_doc(
        {
            "doctype": FIGURE_REQUEST,
            "request_type": request_type,
            "design_reference": (kwargs.get("design") or "").strip(),
            "full_name": (kwargs.get("name") or "").strip(),
            "contact": (kwargs.get("contact") or "").strip(),
            "preferred_size": (kwargs.get("size") or "Not sure yet").strip(),
            "quantity": kwargs.get("quantity") or 1,
            "details": (kwargs.get("details") or "").strip(),
            "reference_image": kwargs.get("reference_image"),
            "source_page": kwargs.get("source_page") or "shop-request-form",
            "status": "Open",
        }
    )
    doc.insert(ignore_permissions=False)
    return {"ok": True, "name": doc.name, "message": _("Your request has been saved")}


@frappe.whitelist(methods=["GET"])
def get_my_figure_requests():
    """Return ONLY the session user requests. Guests get nothing."""
    user = frappe.session.user
    if user in ("Guest", None):
        return {"ok": True, "requests": []}

    requests = frappe.get_all(
        FIGURE_REQUEST,
        filters={"owner": user},
        fields=[
            "name",
            "request_type",
            "design_reference",
            "full_name",
            "contact",
            "preferred_size",
            "quantity",
            "details",
            "reference_image",
            "status",
            "source_page",
            "creation",
            "modified",
        ],
        order_by="creation desc",
    )
    return {"ok": True, "requests": requests}
