from contextlib import ExitStack
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parents[1]
firefox = os.environ.get("FIREFOX_BIN") or shutil.which("firefox")
geckodriver = os.environ.get("GECKODRIVER_BIN") or shutil.which("geckodriver")
assert firefox and geckodriver, "Configura FIREFOX_BIN y GECKODRIVER_BIN."
base = "http://127.0.0.1:19545"
driver = "http://127.0.0.1:19547"

today = "2026-11-27"
settings = None
entries = []
egg = {"id": 173424, "name": "Huevo", "category": "Animal", "state": "Cocido duro",
       "protein": 12.58, "carbs": 1.12, "fat": 10.61, "portion": 50, "units": {"g": 1, "unidad": 50, "porción": 50},
       "description": "Egg, whole, cooked, hard-boiled", "allergens": ["huevo"],
       "source": "https://fdc.nal.usda.gov/food-details/173424/nutrients", "reason": "Aporta proteína en una porción habitual."}

class API(BaseHTTPRequestHandler):
    def respond(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        if status != 204:
            self.wfile.write(json.dumps(data).encode())

    def log_message(self, *_):
        pass

    def body(self):
        return json.loads(self.rfile.read(int(self.headers["Content-Length"])))

    def do_GET(self):
        path, _, query = self.path.partition("?")
        if path == "/api/perfil":
            self.respond({"profile": {"idusuario": "browser-test", "nombres": "Prueba", "tipo_usuario": "cliente", "sede": "jj-poblado"}})
        elif path.endswith("/nutricion/perfil"):
            reference = {"day": today, "currentEstimate": {"minimum": 98, "maximum": 140}} if settings else None
            self.respond({"settings": settings, "weight": 70, "today": today, "reference": reference,
                          "methodSource": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/"})
        elif path.endswith("/nutricion/registros"):
            amount = round(sum(item["protein"] for item in entries), 2) if entries else None
            dates = [(date.fromisoformat(today) - timedelta(days=offset)).isoformat()
                     for offset in range(6 if "days=7" in query else 0, -1, -1)]
            daily = [{"day": day, "protein": amount if day == today else None} for day in dates]
            moments = [{"meal": item["meal"], "protein": item["protein"]} for item in entries]
            self.respond({"days": daily, "entries": entries, "meals": moments, "references": [],
                          "frequent": [], "average": amount, "daysRecorded": int(bool(entries)), "total": len(entries), "pageSize": 30})
        elif path.endswith("/nutricion/alimentos"):
            self.respond({"items": [] if "favorite=true" in query else [egg], "total": 1, "favorites": []})
        elif path.endswith("/nutricion/recomendaciones"):
            self.respond([egg])
        else:
            self.respond({"sedes": []})

    def do_PATCH(self):
        global settings
        if self.path.endswith("/perfil"):
            settings = {**self.body(), "updatedAt": today}
            self.respond(settings)
        else:
            self.save_entry(200)

    def save_entry(self, status):
        value = self.body()
        weight = egg["units"][value["unit"]] * value["quantity"]
        entry = {**value, "id": "example-entry", "snapshot": egg, "grams": weight, "protein": round(weight * egg["protein"] / 100, 2)}
        entries[:] = [entry]
        self.respond(entry, status)

    def do_POST(self):
        if "/aporte" in self.path:
            value = self.body()
            weight = egg["units"][value["unit"]] * value["quantity"]
            self.respond({"grams": weight, "protein": round(weight * egg["protein"] / 100, 2)})
        else:
            self.save_entry(201)

    def do_DELETE(self):
        entries.clear()
        self.respond(None, 204)

def request(url, method="GET", data=None):
    message = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(url, data=message, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            body = response.read()
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode()) from error
    return json.loads(body) if url.startswith(driver) else body

def wait_for(check, description):
    end = time.monotonic() + 20
    last = None
    while time.monotonic() < end:
        try:
            if result := check():
                return result
        except (RuntimeError, OSError) as error:
            last = error
        time.sleep(.15)
    raise RuntimeError(f"{description}: {last}")

with ExitStack() as resources:
    api = ThreadingHTTPServer(("127.0.0.1", 19544), API)
    threading.Thread(target=api.serve_forever, daemon=True).start()
    resources.callback(api.shutdown)
    for args, name in [
        (["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "19545"], "next"),
        ([geckodriver, "--port", "19547"], "driver"),
    ]:
        log = resources.enter_context(open(f"/tmp/jjgym_nutrition_{name}.log", "w"))
        process = subprocess.Popen(args, cwd=root, stdout=log, stderr=log, env={**os.environ, "MOZ_HEADLESS": "1", "BACKEND_URL": "http://127.0.0.1:19544"})
        resources.callback(process.terminate)
    wait_for(lambda: request(driver + "/status"), "Geckodriver")
    wait_for(lambda: request(base + "/login"), "Next")
    caps = {"alwaysMatch": {"browserName": "firefox", "unhandledPromptBehavior": "ignore",
        "moz:firefoxOptions": {"binary": firefox, "args": ["-headless"],
            "prefs": {"network.proxy.type": 1, "network.proxy.http": "127.0.0.1", "network.proxy.http_port": 9,
                      "network.proxy.ssl": "127.0.0.1", "network.proxy.ssl_port": 9,
                      "network.proxy.no_proxies_on": "localhost, 127.0.0.1"}}}}
    session = request(driver + "/session", "POST", {"capabilities": caps})["value"]["sessionId"]
    prefix = driver + "/session/" + session
    def wd(path, method="GET", body=None):
        return request(prefix + path, method, body)["value"]
    resources.callback(lambda: wd("", "DELETE"))
    def js(script, *args):
        return wd("/execute/sync", "POST", {"script": script, "args": list(args)})
    def click(text):
        def try_click():
            try:
                return js("const b = [...(document.querySelector('dialog[open]') || document.querySelector('.nut-shell')).querySelectorAll('button,a,summary')].find(b => b.textContent.trim() === arguments[0] && !b.disabled && b.getBoundingClientRect().height > 0); if (!b) return false; b.click(); return true", text)
            except RuntimeError as error:
                if "unexpected alert open" in str(error):
                    return True
                raise
        wait_for(try_click, f"Click {text}")
    def has(text):
        wait_for(lambda: js("return document.body.innerText.includes(arguments[0])", text), f"Texto {text}")
    def fit():
        assert js("return document.documentElement.scrollWidth <= window.innerWidth")

    wd("/url", "POST", {"url": base + "/login"})
    wd("/cookie", "POST", {"cookie": {"name": "access_token", "value": "browser-fixture", "path": "/"}})
    wd("/window/rect", "POST", {"width": 1280, "height": 900})
    url = base + "/dashboard/nutricion?gym=jj-poblado"
    frame = js("""
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;width:380px;height:760px;border:0';
        frame.src = arguments[0];
        document.body.append(frame);
        return frame;
    """, url)
    wd("/frame", "POST", {"id": frame})
    has("Configura tu perfil nutricional")
    has("Peso de Mi progreso")
    fit()
    def set_value(selector, value):
        js("""const input = document.querySelector(arguments[0]);
        const control = Object.getPrototypeOf(input);
        Object.getOwnPropertyDescriptor(control, 'value').set.call(input, arguments[1]);
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.dispatchEvent(new Event('change', {bubbles: true}));""", selector, value)
    set_value("input[name=birthYear]", "1990")
    set_value("select[name=activity]", "regular")
    click("Guardar configuración")
    has("Proteína de hoy")
    has("Registro semanal de proteína")
    wait_for(lambda: js("return document.querySelectorAll('.nut-week-bars li').length === 7"), "Siete días visibles")
    js("document.querySelector('[aria-label=\"Registrar alimento en desayuno\"]').click()")
    has("Elige un alimento para desayuno.")
    click("Detalles")
    has("Por 100 g")
    click("Registrar alimento")
    has("Confirmar registro")
    assert js("return document.querySelector('dialog select[name=meal]').value") == "Desayuno"
    set_value("dialog input[type=number]", "2")
    has("12,58 g de proteína en 100 g de alimento")
    click("Confirmar registro")
    has("Alimento registrado.")
    click("Resumen")
    has("12,58 g")
    wait_for(lambda: js("return !!document.querySelector('.nut-week-track[data-today=true] span')"), "Barra de hoy actualizada")
    click("Ver registros de hoy")
    click("Editar")
    set_value("dialog input[type=number]", "3")
    has("18,87 g")
    click("Confirmar registro")
    has("Registro actualizado.")
    click("Eliminar")
    wd("/alert/accept", "POST", {})
    has("Hoy todavía no hay registros.")
    assert js("return window.innerWidth") == 380
    fit()
    wd("/frame/parent", "POST", {})
    wd("/url", "POST", {"url": url})
    has("Proteína de hoy")
    assert js("return window.innerWidth") >= 1000
    click("Historial")
    has("Sin registros para este periodo y filtros.")
    fit()
    print("Firefox: configuración, detalle, registro, edición, eliminación e historial en 380 y 1280 px")
