/** Start a stock movement from the product without exposing stock as free text. */
frappe.ui.form.on("AS Shop Product", {
  refresh(frm) {
    if (frm.is_new()) return;
    if (frm.doc.manual_out_of_stock || Number(frm.doc.stock_qty || 0) <= 0) {
      frm.dashboard.set_headline_alert(__("To sell this product, submit a Stock In entry and uncheck Mark as Out of Stock."), "orange");
    } else { frm.dashboard.clear_headline(); }
    frm.add_custom_button(__("Set Stock Quantity"), () => {
      if (frm.is_dirty()) { frappe.msgprint(__("Save the product first.")); return; }
      frappe.prompt([
        {fieldname:"quantity",fieldtype:"Int",label:__("New Stock Quantity"),reqd:1,default:frm.doc.stock_qty},
        {fieldname:"notes",fieldtype:"Small Text",label:__("Reason"),reqd:1}
      ], async values => {
        if(!Number.isInteger(values.quantity)||values.quantity<0){frappe.msgprint(__("Enter a non-negative whole number."));return;}
        const current=await frappe.db.get_value("AS Shop Product",frm.doc.name,"stock_qty");
        const change=values.quantity-Number(current.message.stock_qty||0);
        if(!change){frappe.msgprint(__("Stock quantity is already correct."));return;}
        frappe.new_doc("AS Shop Stock Entry",{product:frm.doc.name,entry_type:"Adjustment",quantity:change,notes:values.notes});
        frappe.msgprint(__("Save and Submit the stock entry to apply this adjustment."));
      }, __("Set Stock Quantity"), __("Create Stock Adjustment"));
    });

    frm.add_custom_button(__("Stock Movement"), () => {
      frappe.new_doc("AS Shop Stock Entry", { product: frm.doc.name, entry_type: "Stock In" });
    });
    frm.add_custom_button(__("View on Website"), () => {
      window.open("/as-shop#/shop/product/" + encodeURIComponent(frm.doc.name), "_blank", "noopener");
    });
  },
});
