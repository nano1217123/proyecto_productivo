from contextlib import ExitStack
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
base = "http://127.0.0.1:19445"
driver = "http://127.0.0.1:19446"
active = None
history = []
network_error = False
exercise = {"id": 1, "nombre": "Press con mancuernas", "grupo_slug": "pecho", "grupo_nombre": "Pecho", "equipo": "Mancuernas", "descripcion": "Baja con control."}
cardio = {"id": 2, "nombre": "Caminadora", "grupo_slug": "cardio", "grupo_nombre": "Cardio", "equipo": "Caminadora"}
routine = {"id": "training-browser", "nombre": "Rutina móvil", "ejercicios": [{"ejercicio_id": 1, "plan": {"tipo": "fuerza", "series": 2, "repeticiones": 8, "descanso": 2}}]}

class API(BaseHTTPRequestHandler):
    def respond(self, value, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(value).encode())
    def log_message(self, *args):
        pass
    def json(self):
        return json.loads(self.rfile.read(int(self.headers["Content-Length"])))
    def do_GET(self):
        path = self.path.partition("?")[0]
        values = {
            "/api/perfil": {"profile": {"idusuario": "training-browser-user", "nombres": "Prueba", "tipo_usuario": "cliente", "sede": "jj-poblado"}},
            "/api/entrenamientos/activa": {"sesion": active}, "/api/entrenamientos": {"entrenamientos": history},
            "/api/rutinas": {"rutinas": [routine]}, "/api/rutinas/training-browser": {"rutina": routine},
            "/api/ejercicios": {"grupos": [{"slug": "pecho", "nombre": "Pecho", "ejercicios": [exercise]},
                {"slug": "cardio", "nombre": "Cardio", "ejercicios": [cardio]}]},
        }
        self.respond(values.get(path, {"sedes": []}))
    def do_POST(self):
        global active
        data = self.json()
        if self.path == "/api/entrenamientos/activa":
            active = {"id": data["id"], "sesion": data["contenido"], "estado": "en_curso", "revision": 0,
                      "iniciadoEn": "2026-11-27T00:00:00Z", "finalizadoEn": None}
            self.respond({"sesion": active})
        elif self.path.endswith("/finalizar"):
            assert data["revision"] == active["revision"]
            active["estado"] = "finalizado"
            active["finalizadoEn"] = "2026-11-27T00:10:00Z"
            active["sesion"]["ejercicios"] = [item for item in active["sesion"]["ejercicios"]
                if any(series["completada"] for series in item["series"])]
            done = []
            for item in active["sesion"]["ejercicios"]:
                item["series"] = [series for series in item["series"] if series["completada"]]
                done += [{**series, "id": str(pos), "tipo": item["tipo"], "ejercicio_id": item["ejercicio_id"],
                    "ejercicio_nombre": exercise["nombre"], "grupo": "Pecho", "numero_serie": pos + 1}
                    for pos, series in enumerate(item["series"])]
            history.append({**active, "nombre": active["sesion"]["nombre"], "fecha": "2026-11-27", "notas": "", "series": done})
            self.respond({"sesion": active})
            active = None
        elif self.path.endswith("/cancelar"):
            self.respond({"sesion": {**active, "estado": "cancelado", "sesion": None}})
            active = None
    def do_PUT(self):
        data = self.json()
        if network_error:
            self.respond({"message": "Conexión interrumpida durante la prueba"}, 503)
            return
        assert data["revision"] == active["revision"]
        active["sesion"] = data["contenido"]
        active["revision"] += 1
        self.respond({"sesion": active})

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
    api = ThreadingHTTPServer(("127.0.0.1", 19444), API)
    threading.Thread(target=api.serve_forever, daemon=True).start()
    resources.callback(api.shutdown)
    for args, name in [
        (["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "19445"], "next"),
        ([geckodriver, "--port", "19446"], "driver"),
    ]:
        log = resources.enter_context(open(f"/tmp/jjgym_training_{name}.log", "w"))
        process = subprocess.Popen(args, cwd=root, stdout=log, stderr=log, env={**os.environ, "MOZ_HEADLESS": "1", "BACKEND_URL": "http://127.0.0.1:19444"})
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
                return js("const b = [...document.querySelectorAll('button,a,summary')].find(b => b.textContent.trim() === arguments[0] && !b.disabled); if (!b) return false; b.click(); return true", text)
            except RuntimeError as error:
                if "unexpected alert open" in str(error):
                    return True
                raise
        wait_for(try_click, f"Click {text}")
    def has(text):
        wait_for(lambda: js("return document.body.innerText.includes(arguments[0])", text), f"Texto {text}")
    def field(label, value):
        locator = "[aria-label=" + json.dumps(label) + "]"
        element = wait_for(lambda: js("return document.querySelector(arguments[0])", locator), label)
        key = next(iter(element.values()))
        wd(f"/element/{key}/value", "POST", {"text": value})
    def action(label):
        wait_for(lambda: js("const el = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === arguments[0] && !b.disabled); if (!el) return false; el.click(); return true;", label), label)
    def fit():
        assert js("return document.documentElement.scrollWidth <= window.innerWidth")
    wd("/url", "POST", {"url": base + "/login"})
    wd("/cookie", "POST", {"cookie": {"name": "access_token", "value": "browser-fixture", "path": "/"}})
    wd("/window/rect", "POST", {"width": 1280, "height": 900})
    url = base + "/dashboard/entrenamientos?gym=jj-poblado"
    frame = js("""
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;width:380px;height:760px;border:0';
        frame.src = arguments[0];
        document.body.append(frame);
        return frame;
    """, url + "&rutina=training-browser")
    wd("/frame", "POST", {"id": frame})
    has("Registro de entrenamiento")
    click("Iniciar rutina")
    has("Rutina móvil")
    has("2 s de descanso")
    fit()
    assert js("return window.innerWidth") == 380
    assert js("return document.querySelector('[aria-label^=Reps]').value") == "8"
    click("+ Añadir ejercicios")
    has("Equipamiento")
    js("document.querySelector('dialog input[type=checkbox]').click()")
    click("Añadir (1)")
    wait_for(lambda: js("return document.querySelectorAll('.training-exercise').length === 2"), "Ejercicio añadido")
    js("const card = document.querySelectorAll('.training-exercise')[1]; [...card.querySelectorAll('button')].find(button => button.textContent === 'Quitar ejercicio').click()")
    wait_for(lambda: js("return document.querySelectorAll('.training-exercise').length === 1"), "Ejercicio eliminado")
    click("+ Añadir serie")
    action("Quitar serie 3 de Press con mancuernas")
    field("Peso (kg), serie 1 de Press con mancuernas", "42.5")
    action("Completar serie 1 de Press con mancuernas")
    click("Pausar")
    click("+15 s")
    click("−15 s")
    click("Reanudar")
    has("Descanso terminado")
    action("Desmarcar serie 1 de Press con mancuernas")
    action("Completar serie 1 de Press con mancuernas")
    has("Sincronizado")
    network_error = True
    click("Nombre y notas")
    notes = js("return document.querySelector('textarea')")
    notes_key = next(iter(notes.values()))
    wd(f"/element/{notes_key}/value", "POST", {"text": "Nota recuperada"})
    has("Pendiente de sincronizar")
    js("location.reload()")
    wait_for(lambda: js("return [...document.querySelectorAll('button')].some(b => b.textContent.startsWith('Continuar'))"), "Sesión pendiente tras recargar")
    click("Continuar Rutina móvil")
    click("Nombre y notas")
    assert js("return document.querySelector('textarea').value") == "Nota recuperada"
    network_error = False
    click("Reintentar sincronización")
    has("Sincronizado")
    click("Finalizar entrenamiento")
    wd("/alert/accept", "POST", {})
    has("Entrenamiento guardado")
    assert len(history) == 1 and len(history[0]["series"]) == 1
    click("Ver historial")
    has("Historial de entrenamientos")
    click("Repetir")
    click("Repetir Rutina móvil")
    has("Entrenamiento en curso")
    assert js("return document.querySelector('[aria-label^=\"Peso (kg)\"]').value") == "42.5"
    assert js("return !document.querySelector('button[aria-pressed=true]')")
    js("window.frameElement.style.width = '100%'")
    wait_for(lambda: js("return window.innerWidth") >= 1200, "Viewport de escritorio")
    fit()
    click("Cancelar sesión")
    wd("/alert/accept", "POST", {})
    has("Iniciar entrenamiento libre")
    click("+ Iniciar entrenamiento libre")
    click("+ Añadir ejercicios")
    js("const entries = [...document.querySelectorAll('dialog label')]; entries.find(entry => entry.textContent.includes('Caminadora') && entry.querySelector('input[type=checkbox]')).querySelector('input').click()")
    click("Añadir (1)")
    has("Tiempo (s)")
    assert js("return !!document.querySelector('[aria-label^=\"Km, serie\"]')")
    print("Firefox 380px/1280px: rutina, catálogo, series, descanso, recuperación 503, resumen, historial, repetición, cancelación y cardio verificados.")
