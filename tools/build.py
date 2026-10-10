"""Standalone builder, copied into each app; Python standard library only."""
from pathlib import Path
import json
import re


def read_json(public, relative):
    path = public / relative
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def build_application(root):
    """Build one app's own JSON, HTML templates, defaults and Frappe route."""
    root = Path(root)
    config = json.loads((root / "website.json").read_text(encoding="utf-8"))
    package = root / config["package"]
    public = package / "public"
    (public / "js").mkdir(parents=True, exist_ok=True)
    defaults = read_json(public, "data/integration.json")
    (public / "js/integration-defaults.js").write_text(
        "/** GENERATED from this app's data/integration.json. */\nwindow.SHN_DEFAULT_INTEGRATION = "
        + json.dumps(defaults, ensure_ascii=False) + ";\n", encoding="utf-8"
    )
    sources = read_json(public, "data/source-index.json")
    if sources:
        data = {key: read_json(public, relative) for key, relative in sources.items()}
        worker_key = next((key for key in data if "/AS_WORKER_SOURCE-" in key), None)
        if worker_key:
            data[worker_key] = (public / "workers/drawing-parser.js").read_text(encoding="utf-8")
            (public / sources[worker_key]).write_text(json.dumps(data[worker_key], ensure_ascii=False) + "\n", encoding="utf-8")
        bootstrap = '''/** GENERATED from this app's JSON sources. */
(() => {
  "use strict";
  const values = DATA;
  window.SHN_DATA = {get(key) {
    if (!Object.prototype.hasOwnProperty.call(values, key)) throw new Error("Missing SHN data: " + key);
    return JSON.parse(JSON.stringify(values[key]));
  }};
})();
'''.replace("const values = DATA;", "const values = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";")
        (public / "js/generated-data.js").write_text(bootstrap, encoding="utf-8")
    template_index = read_json(public, "data/template-index.json")
    if template_index:
        styles = read_json(public, "data/style-index.json")
        templates = {}
        for key, entry in template_index.items():
            template = (public / entry["file"]).read_text(encoding="utf-8")
            template = re.sub(r"^<!-- SHN_SOURCE[\s\S]*?-->\n", "", template)
            template = re.sub(r"\{\{shn-css:([^}]+)\}\}", lambda match: "<style>" + (public / styles[match[1]]).read_text(encoding="utf-8") + "</style>", template)
            templates[key] = template
        bootstrap = '''/** GENERATED from this app's HTML templates. */
(() => {
  "use strict";
  const templates = TEMPLATES;
  window.SHN_TEMPLATES = {
    text(value) { if (typeof value === "symbol") throw new TypeError("Cannot interpolate a symbol"); return String(value); },
    render(key, values) {
      if (!Object.prototype.hasOwnProperty.call(templates, key)) throw new Error("Missing SHN template: " + key);
      return templates[key].replace(/\\{\\{shn:(\\d+)\\}\\}/g, (_, index) => values[Number(index)]);
    }
  };
})();
'''.replace("const templates = TEMPLATES;", "const templates = " + json.dumps(templates, ensure_ascii=False) + ";")
        (public / "js/generated-templates.js").write_text(bootstrap, encoding="utf-8")
    page = (public / config["page"]).read_text(encoding="utf-8")
    split = page.index("<head>") + len("<head>")
    # Only public deployment JSON is interpreted by Jinja. The rest stays raw.
    route = "{# GENERATED from public/" + config["page"] + ". #}\n{% raw %}" + page[:split]
    route += '{% endraw %}\n<script id="shn-integration-config" type="application/json">{{ shn_integration | safe }}</script>\n{% raw %}'
    route += page[split:] + "\n{% endraw %}\n"
    (package / "www" / (config["route"] + ".html")).write_text(route, encoding="utf-8")
    print(config["package"], f"/{config['route']}", "JSON", len(sources), "templates", len(template_index))


if __name__ == "__main__":
    build_application(Path(__file__).resolve().parents[1])
