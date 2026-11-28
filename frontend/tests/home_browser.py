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
weight_rows = {}
height_cm = None
weight_post_count = 0

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
        if status != 204:
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
        elif path == "/api/perfil/altura":
            self.reply({"alturaCm": height_cm})
        elif path == "/api/progreso/peso":
            rows = list(reversed(weight_rows.values()))
            self.reply({"ultimo": rows[0] if rows else None, "registros": rows, "puntos": rows[::-1],
                        "total": len(rows), "promedio": (sum(row["pesoActualKg"] for row in rows) / len(rows)) if rows else None})
        elif path == "/api/progreso/deporte":
            populated = mode in ("progress", "progress-error")
            count = 1 if populated else 0
            self.reply({"actividad": {"sesiones": count, "tiempo": 1200 if populated else None, "promedio": 1200 if populated else None,
                                     "semana": count, "mes": count, "primero": today if populated else None},
                        "frecuencia": [{"fecha": (date.fromisoformat(today) - timedelta(days=date.fromisoformat(today).weekday())).isoformat(), "sesiones": count}] if populated else [],
                        "meses": [{"fecha": today[:7] + "-01", "sesiones": count}] if populated else [],
                        "grupos": [{"grupo": "Pecho", "series": 2, "volumen": 560, "adicional": None}] if populated else [],
                        "ejercicios": [{"id": "3", "nombre": "Press de banca", "grupo": "Pecho", "imagen": None}] if populated else [],
                        "marcas": [{"id": last_id, "fecha": today, "ejercicio": "Press de banca", "tipo": "fuerza", "reps": 8, "valor": 70, "anterior": 68}] if populated else [],
                        "records": count})
        elif path == "/api/progreso/ejercicios/3":
            self.reply([{"fecha": today, "sesion": last_id, "tipo": "fuerza", "reps": 8, "peso": 70, "distancia": None, "duracion": None, "asistencia": None}])
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
            if mode in ("error", "progress-error"):
                self.reply({"message": "Servidor de prueba"}, 500)
            else:
                self.reply({"configured": True, "goal": "mantener", "tracking": True, "protein": 85,
                            "reference": {"minimum": 120, "maximum": 150}} if mode in ("client", "progress") else {"configured": False})
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
        global active, weight_post_count
        path = self.path.split("?")[0]
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if path == "/api/progreso/peso":
            weight_post_count += 1
            weight_rows.setdefault(body["id"], {"id": body["id"], "fecha": today + "T14:32:00Z",
                                                "pesoActualKg": body["pesoActualKg"], "pesoActualizadoEn": None})
            self.reply(None, 204)
            return
        name = "Sesión reciente" if path.endswith("/repetir") else "Piernas" if path.endswith("/iniciar") else body["contenido"]["nombre"]
        active = workout(name, body["id"])
        self.reply({"sesion": active})
    def do_PATCH(self):
        global height_cm
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.path == "/api/perfil/altura":
            height_cm = body["alturaCm"]
            self.reply({"alturaCm": height_cm})
        else:
            row = weight_rows[self.path.rsplit("/", 1)[-1]]
            row.update(pesoActualKg=body["pesoActualKg"], pesoActualizadoEn=today + "T15:10:00Z")
            self.reply(None, 204)
    def do_DELETE(self):
        del weight_rows[self.path.rsplit("/", 1)[-1]]
        self.reply(None, 204)

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

    mode = "new"
    for width in [360, 768, 1150]:
        navigate("/login")
        frame = js("""
            document.querySelector('iframe')?.remove();
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;height:750px;border:0;width:' + arguments[0] + 'px';
            iframe.src='/dashboard/particular'; document.body.append(iframe); return iframe;
        """, width)
        wd("/frame", "POST", {"id": frame})
        has("Mi progreso")
        has("Registra tu peso para empezar")
        has("Completar altura del perfil")
        assert js("return document.documentElement.scrollWidth <= window.innerWidth")
        assert js("""
            return getComputedStyle(document.querySelector(arguments[0])).display !== 'none';
        """, ".dashboard-sidebar-desktop" if width >= 1024 else ".dashboard-sidebar-mobile")
        if width < 1024:
            js("document.querySelector('.dashboard-sidebar-mobile summary').click()")
        assert js("""
            return [...document.querySelectorAll('.dashboard-sidebar nav a')].filter(a => a.getClientRects().length)
              .map(a => a.textContent.trim()).join('|');
        """) == "Inicio|Ejercicios en casa|Registrar entrenamiento|Mis rutinas|Historial|Nutrición|Mi progreso|Suscripción|Reseñas|Reportes"
        wd("/frame/parent", "POST", {})
    mode = "progress"
    navigate("/dashboard/particular")
    has("85 g")
    has("Press de banca")
    has("Récord · +2 kg")

    def input_dialog(value):
        wait_for(lambda: js("""
            const input = document.querySelector('dialog[open] input');
            if (!input) return false;
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, arguments[0]);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        """, value), value)
    click("Completar altura del perfil")
    input_dialog("175")
    click("Guardar registro")
    has("175 cm")
    click("+ Registrar peso")
    input_dialog("12,5")
    click("Guardar registro")
    has("Ingresa un peso válido")
    assert weight_post_count == 0
    input_dialog("75,5")
    js("""
        const button = document.querySelector('dialog[open] button[type=submit]');
        button.click(); button.click();
    """)
    has("Registro guardado")
    has("75,5 kg")
    assert weight_post_count == 1 and len(weight_rows) == 1
    wait_for(lambda: js("return !!document.querySelector('.recharts-line-dot')"), "Punto de peso")
    click("Seguimiento corporal")
    has("Historial de peso")
    wait_for(lambda: js("""
        const button = document.querySelector('.progress-list button');
        if (!button) return false; button.click(); return true;
    """), "Editar peso")
    input_dialog("76,25")
    click("Guardar registro")
    has("Registro actualizado")
    has("76,25 kg")
    wait_for(lambda: js("""
        const button = document.querySelector('.progress-list button:last-child');
        if (!button) return false; button.click(); return true;
    """), "Abrir confirmación")
    has("¿Quieres eliminar")
    click("Eliminar registro")
    has("Registro eliminado")
    has("No hay registros de peso en este periodo")
    assert not weight_rows
    click("Rendimiento deportivo")
    has("Evolución por ejercicio")
    has("Hay un solo registro")
    has("Máximo registrado")
    js("""
        const select = [...document.querySelectorAll('select')].find(node => node.value === 'semana');
        select.value = 'mes'; select.dispatchEvent(new Event('change', { bubbles: true }));
    """)
    wait_for(lambda: js("return [...document.querySelectorAll('select')].some(node => node.value === 'mes')"), "Frecuencia mensual")
    js("""
        const select = [...document.querySelectorAll('select')].find(node => node.value === '30');
        select.value = '7'; select.dispatchEvent(new Event('change', { bubbles: true }));
    """)
    wait_for(lambda: js("return [...document.querySelectorAll('select')].some(node => node.value === '7')"), "Periodo de siete días")
    mode = "progress-error"
    navigate("/dashboard/particular")
    has("Servidor de prueba")
    has("Press de banca")
    has("175 cm")
    print("Mi progreso en Firefox: estados vacíos, barra lateral, altura, peso decimal y validación, gráfica, historial, edición, eliminación, periodos, récords, ejercicio y nutrición con fallo parcial.")
