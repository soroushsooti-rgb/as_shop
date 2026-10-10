"""Idempotent app setup. Seed the original designs once, never resurrect deletions."""

from pathlib import Path
import json

import frappe


def after_install():
    setup_shop()


def setup_shop():
    """Make Desk management discoverable and preserve later operator changes."""
    if not frappe.db.exists("Role", "AS Shop Manager"):
        frappe.get_doc({"doctype": "Role", "role_name": "AS Shop Manager", "desk_access": 1}).insert(ignore_permissions=True)
    if not frappe.db.exists("Workspace", "AS Shop"):
        shortcuts = [
            {"label": "Products", "type": "DocType", "link_to": "AS Shop Product", "doc_view": "List"},
            {"label": "Stock Entries", "type": "DocType", "link_to": "AS Shop Stock Entry", "doc_view": "List"},
        ]
        content = [{"id": "as-shop-heading", "type": "header", "data": {"text": "<b>AS Shop</b>", "col": 12}}]
        content += [{"id": "as-shop-" + str(i), "type": "shortcut", "data": {"shortcut_name": s["label"], "col": 4}} for i, s in enumerate(shortcuts)]
        frappe.get_doc({
            "doctype": "Workspace", "label": "AS Shop", "title": "AS Shop", "module": "AS Shop",
            "public": 1, "icon": "shopping-cart", "content": json.dumps(content), "shortcuts": shortcuts,
            "roles": [{"role": "System Manager"}, {"role": "AS Shop Manager"}],
        }).insert(ignore_permissions=True)
    if frappe.db.exists("Workspace", "AS Shop") and frappe.db.exists("DocType", "AS Shop Cart"):
        workspace = frappe.get_doc("Workspace", "AS Shop")
        if not any(row.link_to == "AS Shop Cart" for row in workspace.shortcuts):
            workspace.append("shortcuts", {"label": "Shopping Carts", "type": "DocType", "link_to": "AS Shop Cart", "doc_view": "List"})
            content = json.loads(workspace.content or "[]")
            content.append({"id": "as-shop-carts", "type": "shortcut", "data": {"shortcut_name": "Shopping Carts", "col": 4}})
            workspace.content = json.dumps(content)
            workspace.save(ignore_permissions=True)
    if not frappe.defaults.get_global_default("as_shop_catalog_seeded_v1"):
        seed_original_designs()
        frappe.defaults.set_global_default("as_shop_catalog_seeded_v1", "1")


def seed_original_designs():
    """Keep source prices/photos; leave stock zero until real quantities are entered."""
    public = Path(__file__).parent / "public"
    designs = json.loads((public / "data/as/10-application/ECO_PETS-8.json").read_text(encoding="utf-8"))
    translations = json.loads((public / "data/as/02-language-init/SITE_FA-2.json").read_text(encoding="utf-8"))
    for index, item in enumerate(designs):
        if item["id"] == "cream-persian" or frappe.db.exists("AS Shop Product", item["id"]):
            continue
        frappe.get_doc({
            "doctype": "AS Shop Product", "product_code": item["id"],
            "title": translations.get(item["name"], item["name"]), "title_en": item["name"],
            "category": "pets", "price": 350000, "show_on_website": 1, "stock_qty": 0,
            "sort_order": index, "cover_image": item["image"],
            "images": [{"image": item["image"], "alt_text": item["name"]}],
        }).insert(ignore_permissions=True)

