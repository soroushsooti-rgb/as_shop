"""Public URL configuration for a standalone SHN website.

This file is copied into each app as integration.py. It intentionally imports
no other SHN app, so installing one website never requires another package.
"""

from pathlib import Path
import json
from urllib.parse import urlsplit

import frappe


def public_url(value):
    """Accept a local route or an HTTP(S) URL, with no embedded credentials."""
    if not isinstance(value, str) or not value or any(c in value for c in "\r\n\x00"):
        raise ValueError("Invalid public application URL")
    parsed = urlsplit(value)
    if parsed.username or parsed.password:
        raise ValueError("Credentials cannot be included in public application URLs")
    if parsed.scheme:
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Only HTTP(S) application URLs are supported")
    elif not value.startswith("/") or value.startswith("//"):
        raise ValueError("Relative application URLs must start with one slash")
    return value


def get_navigation_config():
    """Merge public URL defaults with this Frappe site's explicit settings."""
    defaults = json.loads((Path(__file__).parent / "public/data/integration.json").read_text(encoding="utf-8"))
    urls = defaults["app_urls"].copy()
    for key, value in (frappe.conf.get("shn_app_urls") or {}).items():
        if key in urls:
            urls[key] = public_url(value)
    return {
        "app_id": defaults["app_id"],
        "app_urls": urls,
        "directory_url": public_url(frappe.conf.get("shn_directory_url") or defaults["directory_url"]),
    }
