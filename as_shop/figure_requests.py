"""Figure request API: submit and list, strictly scoped to the session user."""

import frappe
from frappe import _
from frappe.utils.file_manager import save_file

FIGURE_REQUEST = "AS Shop Figure Request"


@frappe.whitelist(methods=["POST"])
def submit_figure_request(**kwargs):
    """Create a figure request owned by the logged-in user.
    Supports optional multipart upload via form field name: reference_image
    """
    user = frappe.session.user
    if user in ("Guest", None):
        frappe.throw(_("Please sign in to submit a request"), frappe.PermissionError)

    uploaded = frappe.request.files.get("reference_image") if getattr(frappe, "request", None) else None
    return create_request(kwargs, image_content=uploaded.read() if uploaded else None,
                          image_name=uploaded.filename if uploaded else None)


def create_request(kwargs, customer_id=None, image_content=None, image_name=None):
    if image_content:
        validate_image(image_content)
    request_type = (kwargs.get("type") or "").strip()
    valid_types = ("pet", "family", "kitchen", "nfc", "gadgets", "furniture", "idea")
    if request_type not in valid_types:
        frappe.throw(_("Invalid request type"))

    doc = frappe.get_doc(
        {
            "doctype": FIGURE_REQUEST,
            "request_type": request_type,
            "customer_id": customer_id,
            "design_reference": (kwargs.get("design") or "").strip(),
            "full_name": (kwargs.get("name") or "").strip(),
            "contact": (kwargs.get("contact") or "").strip(),
            "preferred_size": (kwargs.get("size") or "Not sure yet").strip(),
            "quantity": kwargs.get("quantity") or 1,
            "details": (kwargs.get("details") or "").strip(),
            "reference_image": None,
            "source_page": kwargs.get("source_page") or "shop-request-form",
            "status": "Open",
        }
    )
    doc.insert(ignore_permissions=True)

    if image_content:
        fdoc = save_file(fname=image_name, content=image_content, dt=FIGURE_REQUEST, dn=doc.name, df="reference_image", is_private=1)
        doc.db_set("reference_image", fdoc.file_url, update_modified=False)
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
        ignore_permissions=True,
    )
    return {"ok": True, "requests": requests}


def validate_image(content):
    from io import BytesIO
    from PIL import Image, UnidentifiedImageError
    if len(content) > 5 * 1024 * 1024:
        frappe.throw(_("The reference image must be 5 MB or smaller."))
    try:
        with Image.open(BytesIO(content)) as image:
            if image.format not in {"PNG", "JPEG", "WEBP"}:
                raise ValueError()
            image.verify()
    except (UnidentifiedImageError, ValueError, OSError):
        frappe.throw(_("Choose a JPEG, PNG or WebP image."))


def shared_service(action, payload, customer):
    """Called only after the checkout bridge verifies its signed envelope."""
    import base64
    customer_id = customer["id"]
    if action == "figure_submit":
        raw = payload.get("image")
        if raw and len(raw) > 7 * 1024 * 1024:
            frappe.throw(_("The reference image must be 5 MB or smaller."))
        content = base64.b64decode(raw, validate=True) if raw else None
        return create_request(payload.get("fields") or {}, customer_id, content, payload.get("filename"))
    if action == "figure_admin":
        filters = {"request_type": "family"}
    elif action in {"figure_mine", "figure_image"}:
        filters = {"customer_id": customer_id}
    elif action == "figure_admin_image":
        filters = {}
    else:
        frappe.throw(_("Unknown figure request operation."))
    if action in {"figure_image", "figure_admin_image"}:
        filters["name"] = payload.get("name")
        reference = frappe.db.get_value(FIGURE_REQUEST, filters, "reference_image")
        if not reference:
            frappe.throw(_("Image not found."), frappe.PermissionError)
        file = frappe.get_doc("File", {"file_url": reference, "attached_to_doctype": FIGURE_REQUEST,
                                      "attached_to_name": payload["name"]})
        content = file.get_content()
        import mimetypes
        return {"image": "data:" + (mimetypes.guess_type(file.file_name)[0] or "image/png") +
                ";base64," + base64.b64encode(content).decode()}
    rows = frappe.get_all(FIGURE_REQUEST, filters=filters,
        fields=["name","request_type","full_name","contact","preferred_size","quantity","details",
                "reference_image","status","creation"], order_by="creation desc",
        limit_start=max(0, frappe.utils.cint(payload.get("start"))), limit_page_length=21)
    return {"requests": rows[:20], "has_more": len(rows) > 20}
