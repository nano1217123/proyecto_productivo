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
exercise = {"id": 1, "nombre": "Press con mancuernas", "grupo_slug": "pecho", "grupo_nombre": "Pecho", "equipo": "Mancuernas", "descripcion": "Baja con control.", "imagen_url": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"}
cardio = {"id": 2, "nombre": "Caminadora", "grupo_slug": "cardio", "grupo_nombre": "Cardio", "equipo": "Caminadora"}
routine = {"id": "training-browser", "nombre": "Rutina móvil", "dias": [], "archivada": False,
           "actualizadoEn": "2026-11-27T00:00:00Z", "ejercicios": [{"ejercicio_id": 1, "orden": 1,
           **exercise, "plan": {"tipo": "fuerza", "series": 2, "repeticiones": 8, "descanso": 2}}]}
routines = {routine["id"]: routine}
routine_error = False

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
            "/api/ejercicios": {"grupos": [{"slug": "pecho", "nombre": "Pecho", "ejercicios": [exercise]},
                {"slug": "cardio", "nombre": "Cardio", "ejercicios": [cardio]}]},
        }
        if path == "/api/rutinas":
            archived = "estado=archivadas" in self.path
            self.respond({"rutinas": [item for item in routines.values() if item["archivada"] == archived]})
        elif path.startswith("/api/rutinas/"):
            item = routines.get(path.split("/")[-1])
            self.respond({"rutina": item} if item else {"message": "Rutina no encontrada"}, 200 if item else 404)
        else:
            self.respond(values.get(path, {"sedes": []}))
    def routine_data(self, data, id, archived=False):
        catalog = {1: exercise, 2: cardio}
        return {**data, "id": id, "archivada": archived, "actualizadoEn": "2026-11-27T00:00:00Z",
                "ejercicios": [{**catalog[exercise_id], "ejercicio_id": exercise_id, "orden": i + 1, "plan": data["planes"][i]}
                               for i, exercise_id in enumerate(data["ejercicioIds"])]}
    def do_PATCH(self):
        id = self.path.split("/")[-2]
        routines[id]["archivada"] = self.json()["archivada"]
        self.respond({"archivada": routines[id]["archivada"]})
    def do_DELETE(self):
        del routines[self.path.split("/")[-1]]
        self.respond({})
    def do_POST(self):
        global active
        data = self.json()
        if self.path == "/api/rutinas":
            if routine_error:
                self.respond({"message": "No se pudo guardar la rutina"}, 503)
                return
            id = data["solicitudId"]
            routines[id] = self.routine_data(data, id)
            self.respond({"id": id}, 201)
        elif self.path.endswith("/iniciar"):
            active = {"id": data["id"], "estado": "en_curso", "revision": 0,
                      "iniciadoEn": "2026-11-27T00:00:00Z", "finalizadoEn": None,
                      "sesion": {"nombre": routine["nombre"], "notas": "", "ejercicios": [
                          {"ejercicio_id": 1, "tipo": "fuerza", "descanso": 2, "notas": "",
                           "objetivo": {"repeticiones": 8}, "series": [{"completada": False}, {"completada": False}]}]}}
            self.respond({"sesion": active})
        elif self.path == "/api/entrenamientos/activa":
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
        if self.path.startswith("/api/rutinas/"):
            id = self.path.split("/")[-1]
            routines[id] = self.routine_data(data, id, routines[id]["archivada"])
            self.respond({})
            return
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
                return js("const b = [...document.querySelectorAll('button,a,summary')].find(b => (b.textContent.trim() === arguments[0] || b.getAttribute('aria-label') === arguments[0]) && !b.disabled && b.getBoundingClientRect().height > 0); if (!b) return false; b.click(); return true", text)
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
        wait_for(lambda: js("const el = [...document.querySelectorAll('button,summary')].find(b => b.getAttribute('aria-label') === arguments[0] && !b.disabled && b.getBoundingClientRect().height > 0); if (!el) return false; el.click(); return true;", label), label)
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
    has("Rutina móvil")
    has("Ejercicios de hoy")
    assert js("return document.querySelectorAll('.training-session-metrics > div').length") == 3
    assert js("return document.querySelector('.training-exercise-toggle').getAttribute('aria-expanded')") == "true"
    action("Opciones de Press con mancuernas")
    has("2 s de descanso")
    action("Opciones de Press con mancuernas")
    fit()
    assert js("return window.innerWidth") == 380
    has("Objetivo · 8 reps")
    assert js("return document.querySelector('[aria-label^=Reps]').value") == ""
    field("Reps, serie 1 de Press con mancuernas", "8")
    click("+ Añadir ejercicios")
    has("Equipamiento")
    js("document.querySelector('dialog input[type=checkbox]').click()")
    click("Añadir (1)")
    wait_for(lambda: js("return document.querySelectorAll('.training-exercise').length === 2"), "Ejercicio añadido")
    assert js("return document.querySelectorAll('.training-exercise-toggle')[1].getAttribute('aria-expanded')") == "false"
    js("document.querySelectorAll('.training-exercise-toggle')[1].click()")
    action("Opciones de Press con mancuernas")
    click("Quitar ejercicio")
    wait_for(lambda: js("return document.querySelectorAll('.training-exercise').length === 1"), "Ejercicio eliminado")
    click("+ Añadir serie")
    action("Quitar serie 3 de Press con mancuernas")
    field("Peso (kg), serie 1 de Press con mancuernas", "42.5")
    action("Completar serie 1 de Press con mancuernas")
    action("Opciones del temporizador")
    click("Pausar")
    click("+15 s")
    click("−15 s")
    click("Reanudar")
    has("Descanso terminado")
    action("Desmarcar serie 1 de Press con mancuernas")
    action("Completar serie 1 de Press con mancuernas")
    has("Cambios guardados")
    network_error = True
    action("Opciones del entrenamiento")
    click("Nombre y notas")
    notes = js("return document.querySelector('textarea')")
    notes_key = next(iter(notes.values()))
    wd(f"/element/{notes_key}/value", "POST", {"text": "Nota recuperada"})
    has("Pendiente de sincronizar")
    js("location.reload()")
    wait_for(lambda: js("return [...document.querySelectorAll('button')].some(b => b.textContent.startsWith('Continuar'))"), "Sesión pendiente tras recargar")
    click("Continuar Rutina móvil")
    action("Opciones del entrenamiento")
    click("Nombre y notas")
    assert js("return document.querySelector('textarea').value") == "Nota recuperada"
    network_error = False
    click("Reintentar sincronización")
    has("Cambios guardados")
    click("Finalizar entrenamiento")
    wd("/alert/accept", "POST", {})
    has("Entrenamiento guardado")
    assert len(history) == 1 and len(history[0]["series"]) == 1
    click("Guardar como rutina")
    has("Guardar sesión como rutina")
    wait_for(lambda: js("return document.querySelector('input[maxlength=\"60\"]')?.value") == "Rutina móvil", "Nombre recuperado desde la sesión")
    has("Press con mancuernas")
    click("Volver a rutinas")
    has("Mis rutinas")
    fit()
    wait_for(lambda: js("return !!document.querySelector('.routine-featured .routine-cover')"), "Rutina destacada con imagen")
    click("Semana")
    has("Sin rutinas asignadas")
    click("Activas")
    click("+ Nueva rutina")
    has("Nombre de la rutina")
    def set_control(label, value):
        element = wait_for(lambda: js("""
          return [...document.querySelectorAll('label')].find(item =>
            item.childNodes[0]?.textContent.trim() === arguments[0])?.querySelector('input, select, textarea');
        """, label), label)
        key = next(iter(element.values()))
        if js("return arguments[0].tagName === 'SELECT'", element):
            js("arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', {bubbles:true}));", element, value)
        else:
            wd(f"/element/{key}/clear", "POST", {})
            if value:
                wd(f"/element/{key}/value", "POST", {"text": value})
    set_control("Nombre de la rutina", "Fuerza y bicicleta")
    assert js("return !document.querySelector('.routine-catalog-panel').open")
    click("+ Añadir ejercicios")
    set_control("Buscar ejercicios", "press")
    wait_for(lambda: js("return document.querySelectorAll('[aria-label^=Agregar]').length === 1"), "Búsqueda por nombre")
    action("Agregar Press con mancuernas")
    set_control("Buscar ejercicios", "")
    set_control("Equipamiento", "Caminadora")
    action("Agregar Caminadora")
    action("Subir Caminadora")
    set_control("Duración (s)", "120")
    set_control("Repeticiones objetivo / mín.", "8")
    set_control("Repeticiones máx.", "12")
    js("document.querySelector('[aria-label=Lunes]').click()")
    routine_error = True
    click("Guardar rutina")
    has("No se pudo guardar la rutina")
    routine_error = False
    click("Guardar rutina")
    wait_for(lambda: js("return !!document.querySelector('.routine-measures')"), "Detalle de la rutina guardada")
    saved = next(item for key, item in routines.items() if key != routine["id"])
    assert saved["planes"][1]["repeticionesMax"] == 12, saved["planes"]
    has("2. Press con mancuernas")
    has("Lunes")
    has("8–12")
    fit()
    original = next(key for key in routines if key != routine["id"])
    click("Opciones")
    click("Duplicar")
    has("Duplicar rutina")
    wait_for(lambda: (js("return document.querySelector('input[maxlength=\"60\"]')?.value") or "").endswith("(copia)"), "Nombre de la copia")
    set_control("Nombre de la rutina", "Copia ajustada")
    action("Bajar Caminadora")
    click("Guardar rutina")
    has("Copia ajustada")
    has("1. Press con mancuernas")
    assert routines[original]["ejercicioIds"] == [2, 1]
    click("Opciones")
    click("Editar")
    has("Editar rutina")
    has("Nombre de la rutina")
    set_control("Nombre de la rutina", "Cambio pendiente")
    click("Descartar")
    wd("/alert/dismiss", "POST", {})
    assert js("return document.querySelector('input[maxlength=\"60\"]').value") == "Cambio pendiente"
    click("Descartar")
    wd("/alert/accept", "POST", {})
    wait_for(lambda: js("return document.querySelector('.routine-header h1')?.textContent === 'Copia ajustada'"), "Edición descartada")
    click("Opciones")
    click("Editar")
    has("Nombre de la rutina")
    js("document.querySelector('[aria-label=Martes]').click()")
    js("[...document.querySelectorAll('ol > li')].find(item=>item.innerText.includes('Caminadora')).querySelector('button.routine-danger').click()")
    click("Guardar cambios")
    wait_for(lambda: js("return document.querySelector('.routine-header h1')?.textContent === 'Copia ajustada'"), "Edición guardada")
    has("Martes")
    copy = next(item for item in routines.values() if item["nombre"] == "Copia ajustada")
    assert copy["ejercicioIds"] == [1] and copy["dias"] == [1, 2]
    assert routines[original]["ejercicioIds"] == [2, 1] and routines[original]["dias"] == [1]
    click("Opciones")
    click("Archivar")
    has("Rutina archivada")
    click("Volver a rutinas")
    has("Mis rutinas")
    click("Archivadas")
    click("Copia ajustada")
    wait_for(lambda: js("return document.querySelector('.routine-header h1')?.textContent === 'Copia ajustada'"), "Detalle archivado")
    has("Rutina archivada")
    click("Restaurar")
    has("Rutina restaurada.")
    click("Opciones")
    click("Eliminar rutina")
    wd("/alert/accept", "POST", {})
    wait_for(lambda: js("return document.querySelector('.routine-header h1')?.textContent === 'Mis rutinas'"), "Listado después de eliminar")
    assert len(routines) == 2
    js("window.frameElement.style.width = '100%'")
    wait_for(lambda: js("return window.innerWidth >= 1200"), "Rutinas en escritorio")
    fit()
    click("Semana")
    has("Fuerza y bicicleta")
    wd("/url", "POST", {"url": base + "/dashboard/entrenamientos/historial?gym=jj-poblado"})
    has("Historial de entrenamientos")
    click("Repetir")
    click("Repetir Rutina móvil")
    has("Entrenamiento en curso")
    assert js("return document.querySelector('[aria-label^=\"Peso (kg)\"]').value") == "42.5"
    assert js("return !document.querySelector('button[aria-pressed=true]')")
    fit()
    action("Opciones del entrenamiento")
    click("Cancelar sesión")
    wd("/alert/accept", "POST", {})
    has("Iniciar entrenamiento libre")
    click("+ Iniciar entrenamiento libre")
    click("+ Añadir ejercicios")
    js("const entries = [...document.querySelectorAll('dialog label')]; entries.find(entry => entry.textContent.includes('Caminadora') && entry.querySelector('input[type=checkbox]')).querySelector('input').click()")
    click("Añadir (1)")
    has("Tiempo (s)")
    assert js("return !!document.querySelector('[aria-label^=\"Km, serie\"]')")
    print("Firefox 380px y escritorio: CRUD, filtros, orden, tipos, copia, archivo, semana, fallo HTTP e integración de entrenamiento verificados.")
