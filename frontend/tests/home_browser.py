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
base = "http://127.0.0.1:19715"
driver = "http://127.0.0.1:19717"


from datetime import datetime
from zoneinfo import ZoneInfo
today = datetime.now(ZoneInfo("America/Bogota")).date().isoformat()
mode = "new"
routine_ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"]
last_id = "00000000-0000-4000-8000-000000000003"
active = None
def workout(name, identifier):
    return {"id": identifier, "estado": "en_curso", "revision": 0,
            "sesion": {"nombre": name, "notas": "", "ejercicios": []}}
class API(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass
    def reply(self, body, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
    def do_GET(self):
        path, _, query = self.path.partition("?")
        profile = {"idusuario": "browser-test", "nombres": "Emiliano", "apellidos": "Prueba",
                   "tipo_usuario": "cliente" if mode == "client" else "admin" if mode == "admin" else "usuario_particular",
                   "sede": "jj-poblado" if mode == "client" else None}
        routines = [{"id": id, "nombre": name, "dias": [date.fromisoformat(today).isoweekday()]}
                    for id, name in zip(routine_ids, ["Piernas", "Espalda"])] if mode == "scheduled" else []
        latest_date = today if mode == "completed" else (date.fromisoformat(today)-timedelta(days=2)).isoformat()
        last = {"id": last_id, "nombre": "Sesión reciente", "fecha": latest_date, "series": 3,
                "ejercicios": 1, "duracion": 1200, "records": 1, "grupos": ["Piernas"]}
        days = [{"fecha": latest_date, "sesiones": 2, "series": 3, "tiempo": 1200}]
        if path == "/api/perfil":
            self.reply({"profile": profile})
        elif path.endswith("/activa"):
            self.reply({"sesion": active})
        elif path.endswith("/rutinas/planificacion"):
            self.reply(routines)
        elif path.endswith("/rutinas"):
            self.reply({"rutinas": routines})
        elif path.startswith("/api/rutinas/"):
            self.reply({"rutina": {"ejercicios": [{"grupo_nombre": "Piernas", "plan": {"series": 3, "repeticiones": 10}}]}})
        elif path.endswith("/entrenamientos/resumen-inicio"):
            self.reply({"total": 2, "ultimo": last, "dias": days} if mode in ("completed", "client") else {"total": 0, "ultimo": None, "dias": []})
        elif path.endswith("/nutricion/resumen-inicio"):
            if mode == "error":
                self.reply({"message": "Servidor de prueba"}, 500)
            else:
                self.reply({"configured": True, "goal": "mantener", "tracking": True, "protein": 85,
                            "reference": {"minimum": 120, "maximum": 150}} if mode == "client" else {"configured": False})
        elif path.endswith("/sedes"):
            self.reply({"sedes": [{"slug": "jj-poblado", "nombre": "JJ GYM El Poblado", "ubicacion": "Medellín"}]})
        elif path.endswith("/entrenamientos"):
            self.reply({"entrenamientos": []})
        elif path.endswith("/entrenamientos/actividad"):
            self.reply({"resumen": {}, "dias": [], "grupos": []})
        elif path.endswith("/entrenamientos/historial"):
            self.reply({"entrenamientos": [], "siguiente": False})
        elif path.endswith(last_id):
            self.reply({**last, **workout(last["nombre"], last_id), "mejoras": [], "primerasMarcas": [], "catalogo": {}})
        elif path.endswith("/ejercicios"):
            self.reply({"ejercicios": [], "grupos": []})
        else:
            self.reply({}, 404)
    def do_POST(self):
        global active
        path = self.path.split("?")[0]
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        name = "Sesión reciente" if path.endswith("/repetir") else "Piernas" if path.endswith("/iniciar") else body["contenido"]["nombre"]
        active = workout(name, body["id"])
        self.reply({"sesion": active})
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
    api = ThreadingHTTPServer(("127.0.0.1", 19714), API)
    threading.Thread(target=api.serve_forever, daemon=True).start()
    resources.callback(api.shutdown)
    for args, name in [
        (["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "19715"], "next"),
        ([geckodriver, "--port", "19717"], "driver"),
    ]:
        log = resources.enter_context(open(f"/tmp/jjgym_home_{name}.log", "w"))
        process = subprocess.Popen(args, cwd=root, stdout=log, stderr=log, env={**os.environ, "MOZ_HEADLESS": "1", "BACKEND_URL": "http://127.0.0.1:19714"})
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

    def has(value):
        try:
            wait_for(lambda: js("return document.body.innerText.toLowerCase().includes(arguments[0].toLowerCase())", value), value)
        except RuntimeError as error:
            raise RuntimeError(js("return location.href + ' ' + document.body.innerText")) from error
    def click(value):
        wait_for(lambda: js("""
            const target = [...document.querySelectorAll('main a,main button')].find(node => node.textContent.trim() === arguments[0] && !node.disabled);
            if (!target) return false; target.click(); return true;
        """, value), value)
    def navigate(path="/dashboard"):
        wd("/url", "POST", {"url": base + path})
    navigate("/login")
    wd("/cookie", "POST", {"cookie": {"name": "access_token", "value": "browser-fixture", "path": "/"}})
    wd("/window/rect", "POST", {"width": 1280, "height": 900})
    for width in [360, 768, 1150]:
        navigate("/login")
        frame = js("""
            document.querySelector('iframe')?.remove();
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;height:750px;border:0;width:' + arguments[0] + 'px';
            iframe.src='/dashboard'; document.body.append(iframe); return iframe;
        """, width)
        wd("/frame", "POST", {"id": frame})
        has("Comienza tu camino de entrenamiento")
        has("Configura tu objetivo nutricional")
        assert js("return window.innerWidth === arguments[0] && document.documentElement.scrollWidth <= window.innerWidth", width)
        assert js("return document.querySelectorAll('.home-calendar li').length") == 7
        wd("/frame/parent", "POST", {})
    navigate()
    click("Semana anterior")
    has("Semana actual")
    click("Semana actual")
    click("Iniciar entrenamiento libre")
    has("Entrenamiento libre")
    wait_for(lambda: active, "La API recibió la acción de inicio")
    navigate()
    has("Reanudar entrenamiento")
    click("Reanudar entrenamiento")
    wait_for(lambda: js("return location.pathname.endsWith('/entrenamientos')"), "Ruta de registro")
    has("Entrenamiento libre")
    wait_for(lambda: js("return !localStorage.getItem('jjgym:training:v1:browser-test')"), "Borrador sincronizado")
    active = None
    mode = "scheduled"
    navigate()
    has("Tu entrenamiento de hoy")
    assert js("return document.querySelector('.home-select select').options.length") == 2
    wait_for(lambda: js("return !!document.querySelector('.home-day.planned')"), "Rutina planificada")
    click("Iniciar entrenamiento")
    wait_for(lambda: active and active["sesion"]["nombre"] == "Piernas", "Inicio desde rutina")
    active = None
    mode = "completed"
    navigate()
    has("Entrenamiento registrado hoy")
    has("récord personal")
    click("Ver detalles")
    wait_for(lambda: js("return !!document.querySelector('dialog[open] .history-detail-heading')"), "Detalle del historial")
    navigate()
    wait_for(lambda: js("return !!document.querySelector('.home-day.done')"), "Actividad completada")
    js("document.querySelector('.home-day.done').click()")
    wait_for(lambda: js("return !!new URL(location.href).searchParams.get('dia')"), "Historial del día")
    navigate()
    click("Repetir entrenamiento")
    wait_for(lambda: active and active["sesion"]["nombre"] == "Sesión reciente", "Repetición desde historial")
    wait_for(lambda: js("return location.pathname.endsWith('/entrenamientos')"), "Ruta de la sesión repetida")
    active = None
    mode = "client"
    navigate()
    has("85 g")
    has("JJ GYM El Poblado")
    has("Plan y vigencia no disponibles")
    wait_for(lambda: js("return !!document.querySelector('.home-chart')"), "Gráfica")
    mode = "error"
    navigate()
    has("No pudimos cargar esta sección")
    has("Comienza tu camino de entrenamiento")
    mode = "admin"
    navigate()
    wait_for(lambda: js("return !!document.querySelector('main') && !document.querySelector('.home-dashboard')"), "Panel administrativo")
    print("Inicio en Firefox: 360, 768 y 1150 px, estados, navegación, inicio libre, rutina, reanudación, repetición, nutrición y panel administrativo.")
