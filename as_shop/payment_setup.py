"""Initialize payment defaults without enabling a gateway or changing products."""
import json
from urllib.parse import urlsplit,urlunsplit
import frappe
from as_shop.integration import get_navigation_config
def setup_payments():
    if not frappe.db.exists("DocType","AS Shop Payment Settings"):
        return
    doc=frappe.get_single("AS Shop Payment Settings")
    urls=get_navigation_config()["app_urls"]
    changed=False
    defaults={"provider":"Zarinpal","reservation_minutes":20}
    shop=urlsplit(urls["shop"])
    defaults["public_shop_url"]=urlunsplit((shop.scheme,shop.netloc,"","",""))
    defaults["customer_website_url"]=urls["as"]
    for field,value in defaults.items():
        if not doc.get(field):
            doc.set(field,value);changed=True
    if changed:doc.save(ignore_permissions=True)
    if not frappe.db.exists("Workspace","AS Shop"):
        return
    workspace=frappe.get_doc("Workspace","AS Shop")
    changed=False
    for label,doctype,view in [("Orders","AS Shop Order","List"),("Payment Settings","AS Shop Payment Settings","")]:
        if not any(row.link_to==doctype for row in workspace.shortcuts):
            workspace.append("shortcuts",{"label":label,"type":"DocType","link_to":doctype,"doc_view":view})
            content=json.loads(workspace.content or "[]")
            content.append({"id":"as-shop-"+doctype.lower().replace(" ","-"),"type":"shortcut","data":{"shortcut_name":label,"col":4}})
            workspace.content=json.dumps(content);changed=True
    if changed:workspace.save(ignore_permissions=True)
