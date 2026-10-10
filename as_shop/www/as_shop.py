"""Public AS Shop website context."""
from as_shop.integration import get_navigation_config
import json

no_cache = 1

def get_context(context):
    """Inject only public URLs; no credentials or business records."""
    context.no_cache = 1
    context.shn_integration = json.dumps(get_navigation_config(), ensure_ascii=False).replace("<", "\\u003c")
    return context
