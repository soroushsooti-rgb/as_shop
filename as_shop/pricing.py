"""Quantity prices use the total number of units in the basket, never client prices."""
from frappe.utils import flt

PRICE_FIELDS = ["price", "price_2", "price_3", "price_4_plus"]

def unit_price(product, quantity):
    field = "price_4_plus" if quantity >= 4 else "price_3" if quantity == 3 else "price_2" if quantity == 2 else "price"
    value = flt(product.get(field))
    return value if value > 0 else flt(product.get("price"))
