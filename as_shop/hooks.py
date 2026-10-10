"""App metadata. Assets and website routes belong only to this app."""
app_name = "as_shop"
app_title = "AS Shop"
app_publisher = "SHN"
app_description = "Independent AS Shop website"
app_email = ""
app_license = "Proprietary"

# Standard DocTypes are migrated by Frappe; setup runs once for initial products.
after_install = "as_shop.setup.after_install"
after_migrate = ["as_shop.setup.setup_shop"]
