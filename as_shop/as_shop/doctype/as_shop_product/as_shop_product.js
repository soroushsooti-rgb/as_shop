/** Start a stock movement from the product without exposing stock as free text. */
frappe.ui.form.on("AS Shop Product", {
  refresh(frm) {
    if (frm.is_new()) return;
    frm.add_custom_button(__("Stock Movement"), () => {
      frappe.new_doc("AS Shop Stock Entry", { product: frm.doc.name, entry_type: "Stock In" });
    });
    frm.add_custom_button(__("View on Website"), () => {
      window.open("/as-shop#/shop/product/" + encodeURIComponent(frm.doc.name), "_blank", "noopener");
    });
  },
});
