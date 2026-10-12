from frappe.model.document import Document
from as_shop.gateways import validate_settings
class ASShopPaymentSettings(Document):
    def validate(self):
        validate_settings(self)
