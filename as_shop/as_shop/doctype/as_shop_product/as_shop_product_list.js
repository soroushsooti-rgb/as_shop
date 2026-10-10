/** Availability colors and operator-friendly filters in the product list. */
frappe.listview_settings["AS Shop Product"] = {
  add_fields: ["show_on_website", "manual_out_of_stock", "stock_qty"],
  get_indicator(doc) {
    if (!doc.show_on_website) return [__("Hidden"), "gray", "show_on_website,=,0"];
    if (doc.manual_out_of_stock || doc.stock_qty <= 0) return [__("Out of Stock"), "red", "stock_qty,<=,0"];
    return [__("In Stock"), "green", "stock_qty,>,0"];
  },
};
