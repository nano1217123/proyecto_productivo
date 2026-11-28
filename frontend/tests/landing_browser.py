"""Build the frontend with BACKEND_URL=http://127.0.0.1:19714 before running."""

import base64
from contextlib import ExitStack
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import shutil
import subprocess
import threading
import time
from urllib.error import HTTPError
from urllib.parse import parse_qs, quote, urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SITE = "http://127.0.0.1:19725"
DRIVER = "http://127.0.0.1:19727"


def request(url, method="GET", data=None):
    body = None if data is None else json.dumps(data).encode()
    with urlopen(Request(url, body, {"Content-Type": "application/json"}, method=method), timeout=10) as response:
        return response.read()


def wait(check):
    last = None
    for _ in range(100):
        try:
            if result := check():
                return result
        except OSError as error:
            last = error
        time.sleep(.15)
    raise AssertionError(f"Tiempo de espera agotado: {last}")


class Links(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.hrefs = set()
        self.ids = set()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a" and "href" in attrs:
            self.hrefs.add(attrs["href"])


class DemoAPI(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, status, data, cookie=None):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        path = urlsplit(self.path).path
        logged_in = "access_token=landing-fixture" in self.headers.get("Cookie", "")
        if path == "/api/perfil":
            if logged_in:
                self.reply(200, {"profile": {"idusuario": "demo", "nombres": "Alex", "tipo_usuario": "usuario_particular"}})
            else:
                self.reply(401, {"message": "Sin sesión"})
        elif path == "/api/pagos/opciones" and logged_in:
            self.reply(200, {"opciones": [{
                "plan": "suscripcion_particular", "periodo": "mensual", "disponible": True,
                "precio_usd_centavos": 1000, "monto_en_centavos": 4000000, "tasa_usd_cop": "4000", "moneda": "COP",
            }]})
        elif path == "/api/sedes":
            self.reply(200, {"sedes": [{"slug": "jj-poblado", "nombre": "JJ GYM El Poblado", "ubicacion": "Medellín"}]})
        else:
            self.reply(404, {})

    def do_POST(self):
        data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))) or "{}")
        if self.path == "/api/auth/login" and data.get("email") == "demo@example.com":
            self.reply(200, {}, "access_token=landing-fixture; Path=/; HttpOnly; SameSite=Lax")
        elif self.path == "/api/auth/register" and data.get("email") == "demo@example.com":
            self.reply(201, {})
        else:
            self.reply(401, {})


def verify_routes():
    html = request(SITE).decode()
    assert "Plataforma de entrenamiento y gestión deportiva" in html
    assert "index, follow" in html and "og:image" in html
    assert "USD\u00a010" in html and "USD\u00a0150" in html
    assert "<video" not in html
    links = Links(html)
    for href in links.hrefs:
        url = urlsplit(href)
        if url.fragment:
            assert url.fragment in links.ids, href
        elif url.path:
            assert request(SITE + quote(href, safe="/?=%&"))
    gyms = {parse_qs(urlsplit(href).query)["gym"][0]
            for href in links.hrefs if href.startswith("/login?gym=")}
    assert gyms == {"jj-poblado", "power-laureles", "fit-belén"}
    for path in ("/login", "/register", "/auth/callback"):
        assert b"noindex, nofollow" in request(SITE + path)
    for path in ("/dashboard", "/dashboard/pagos", "/dashboard/nutricion"):
        with urlopen(SITE + path, timeout=10) as response:
            assert urlsplit(response.url).path == "/login"
    print(f"HTML inicial: {len(html.encode())} bytes. Enlaces, sedes, precios, metadatos y rutas protegidas: correctos.")


def verify_browser(resources):
    firefox = os.environ.get("FIREFOX_BIN") or shutil.which("firefox")
    geckodriver = os.environ.get("GECKODRIVER_BIN") or shutil.which("geckodriver")
    assert firefox and geckodriver, "Configura FIREFOX_BIN y GECKODRIVER_BIN."
    log = resources.enter_context(open("/tmp/jj-landing-driver.log", "w"))
    driver = subprocess.Popen([geckodriver, "--port", "19727"], stdout=log, stderr=log)
    resources.callback(driver.terminate)
    wait(lambda: request(DRIVER + "/status"))
    caps = {"alwaysMatch": {
        "browserName": "firefox",
        "moz:firefoxOptions": {"binary": firefox, "args": ["-headless"], "prefs": {
            "network.proxy.type": 1,
            "network.proxy.http": "127.0.0.1", "network.proxy.http_port": 9,
            "network.proxy.ssl": "127.0.0.1", "network.proxy.ssl_port": 9,
            "network.proxy.no_proxies_on": "localhost, 127.0.0.1",
            "ui.prefersReducedMotion": 1,
        }}
    }}
    session = json.loads(request(DRIVER + "/session", "POST", {"capabilities": caps}))["value"]["sessionId"]

    def wd(path, method="GET", body=None):
        try:
            return json.loads(request(f"{DRIVER}/session/{session}{path}", method, body))["value"]
        except HTTPError as error:
            raise AssertionError(error.read().decode()) from error

    def js(script, *args):
        return wd("/execute/sync", "POST", {"script": script, "args": list(args)})

    def select(selector):
        return js("return document.querySelector(arguments[0])", selector)

    def keys(selector, key):
        element = next(iter(select(selector).values()))
        wd(f"/element/{element}/value", "POST", {"text": key})

    def fill(selector, value):
        js("""
            const input = document.querySelector(arguments[0]);
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, arguments[1]);
            input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        """, selector, value)

    resources.callback(lambda: wd("", "DELETE"))
    wd("/window/rect", "POST", {"width": 1440, "height": 1040})
    wd("/url", "POST", {"url": SITE})
    wait(lambda: js("return document.fonts.status === 'loaded' && document.querySelector('.ll-hero-visual img').naturalWidth"))
    keys("body", "\ue004")
    assert js("return document.activeElement.classList.contains('ll-skip')")
    keys(".ll-skip", "\ue007")
    assert js("return document.activeElement.id === 'contenido'")
    widths = [320, 390, 768, 1024, 1440]
    screenshots = os.environ.get("LANDING_SCREENSHOTS")
    if screenshots:
        target = Path(screenshots)
        target.mkdir(parents=True, exist_ok=True)
        wd("/url", "POST", {"url": SITE})
        wait(lambda: js("return document.fonts.status === 'loaded' && document.querySelector('.ll-hero-visual img').naturalWidth"))
        (target / "escritorio.png").write_bytes(base64.b64decode(wd("/screenshot")))

    for width in widths:
        frame = js("""
            document.querySelector('iframe')?.remove();
            const frame = document.createElement('iframe');
            frame.style.cssText = 'position:fixed;inset:0;z-index:100;height:900px;border:0;width:' + arguments[0] + 'px';
            frame.src = '/';
            document.body.append(frame);
            return frame;
        """, width)
        wd("/frame", "POST", {"id": frame})
        wait(lambda: select(".ll-hero h1"))
        assert js("return innerWidth === arguments[0] && document.documentElement.scrollWidth <= arguments[0]", width), width
        assert js("return matchMedia('(prefers-reduced-motion: reduce)').matches")
        if width == 390:
            wait(lambda: js("return document.fonts.status === 'loaded' && document.querySelector('.ll-hero-visual img').naturalWidth"))
            if screenshots:
                wd("/frame/parent", "POST", {})
                element = next(iter(frame.values()))
                (target / "celular.png").write_bytes(base64.b64decode(wd(f"/element/{element}/screenshot")))
                wd("/frame", "POST", {"id": frame})
            keys(".ll-mobile-menu summary", "\ue007")
            assert js("return document.querySelector('.ll-mobile-menu').open")
            keys(".ll-mobile-menu summary", "\ue00c")
            assert not js("return document.querySelector('.ll-mobile-menu').open")
            keys(".ll-mobile-menu summary", "\ue007")
            keys(".ll-mobile-menu a[href='#planes']", "\ue007")
            wait(lambda: js("return location.hash === '#planes' && !document.querySelector('.ll-mobile-menu').open"))
            keys(".ll-faq summary", "\ue007")
            assert js("return document.querySelector('.ll-faq details').open")
            assert js("return document.querySelector('output b').textContent === '24,2'")
            fill("#weight", "80")
            wait(lambda: js("return document.querySelector('output b').textContent === '27,7'"))
            fill("#height", "10")
            wait(lambda: js("return document.querySelector('output b').textContent === '—'"))
            assert js("return document.querySelector('#height').getAttribute('aria-invalid') === 'true'")
            for button in range(1, 6):
                selector = f".ll-screen-controls button:nth-child({button})"
                keys(selector, "\ue007")
                wait(lambda: js("return document.querySelector(arguments[0]).getAttribute('aria-pressed') === 'true' && document.querySelector('.ll-screen img').naturalWidth", selector))
            images = js("return [...document.images].map(image => image.getAttribute('src')).filter(Boolean)")
            for image in images:
                assert request(SITE + image), image
        wd("/frame/parent", "POST", {})
    print("Firefox: 320, 390, 768, 1024 y 1440 px; teclado, menú, FAQ, IMC, selector e imágenes correctos.")

    def recaptcha_fixture():
        js("window.grecaptcha = { ready: callback => callback(), execute: () => Promise.resolve('local-fixture') }")

    wd("/url", "POST", {"url": SITE + "/register?gym=jj-poblado"})
    wait(lambda: select("#nombres"))
    recaptcha_fixture()
    for selector, value in {"#nombres": "Alex", "#apellidos": "Demo", "#email": "demo@example.com",
                            "#password": "ClaveDemo123", "#confirmPassword": "ClaveDemo123"}.items():
        fill(selector, value)
    keys("form button[type=submit]", "\ue007")
    wait(lambda: js("return location.pathname === '/verify-otp' && new URLSearchParams(location.search).get('gym') === 'jj-poblado'"))

    wd("/url", "POST", {"url": SITE + "/login?gym=jj-poblado"})
    wait(lambda: select("#email"))
    recaptcha_fixture()
    fill("#email", "demo@example.com")
    fill("#password", "ClaveDemo123")
    keys("form button[type=submit]", "\ue007")
    wait(lambda: js("return location.pathname === '/dashboard' && new URLSearchParams(location.search).get('gym') === 'jj-poblado'"))
    wd("/url", "POST", {"url": SITE + "/dashboard/pagos"})
    selector = "button[aria-label^='Continuar con']"
    wait(lambda: select(selector))
    keys(selector, "\ue007")
    wait(lambda: js("return document.body.innerText.includes('Pagar con Wompi')"))
    cancel = js("return [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cancelar')")
    wd("/element/" + next(iter(cancel.values())) + "/value", "POST", {"text": "\ue007"})
    wait(lambda: select(selector))
    print("Con API simulada: registro hacia OTP, ingreso con sede y confirmación/cancelación de pago verificados.")


with ExitStack() as resources:
    api = ThreadingHTTPServer(("127.0.0.1", 19714), DemoAPI)
    threading.Thread(target=api.serve_forever, daemon=True).start()
    resources.callback(api.server_close)
    resources.callback(api.shutdown)
    log = resources.enter_context(open("/tmp/jj-landing-next.log", "w"))
    next_server = subprocess.Popen(
        ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "19725"],
        cwd=ROOT, stdout=log, stderr=log, env={**os.environ, "BACKEND_URL": "http://127.0.0.1:19714"},
    )
    resources.callback(next_server.terminate)
    wait(lambda: request(SITE))
    verify_routes()
    verify_browser(resources)
