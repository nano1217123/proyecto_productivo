# Rediseño de la landing pública de J&J GYM

## Diagnóstico y propuesta

La ruta pública era `frontend/src/app/page.jsx`. La portada dependía de un video remoto en reproducción automática, mezclaba una serif con Barlow y dedicaba la segunda columna al IMC. El carrusel y las tarjetas repetían las mismas sedes. Por debajo del breakpoint de escritorio desaparecían los enlaces de navegación. El resultado del IMC usaba lenguaje de diagnóstico y la interfaz filtraba caracteres a mano. La versión publicada devolvió HTTP 200 y conservaba «Módulo de autenticación» como título y «Login y registro» como descripción. [Versión publicada de referencia](https://proyecto-productivo-tjvz-two.vercel.app/)

Las nueve imágenes de la raíz guiaron la composición, la jerarquía de los planes, los acentos morados, el marco del producto y el cierre deportivo. Se recuperaron `#b56cff`, `#d7adff` y `#321d47` de los tokens globales. Barlow Condensed unifica los títulos y Barlow conserva su función en los textos.

El inventario verificó los módulos de registro, rutinas, historial, nutrición, progreso, catálogo y modo casa en las rutas del dashboard. Las reseñas se consultan con sesión. Clientes, información de sedes, membresías y reportes tienen permisos definidos por rol y asignación. La autenticación existente maneja credenciales, Google y verificación OTP. El parámetro `gym` se propaga por los enlaces correspondientes.

## Implementación

| Área | Archivo o directorio | Resultado |
| --- | --- | --- |
| Ruta y metadatos | `frontend/src/app/page.jsx` | Página pública prerenderizada con título, descripción, URL canónica, Open Graph, Twitter y favicon. |
| Encabezado, portada e indicadores | `frontend/src/features/landing/intro.jsx`, `mobile-menu.jsx` | Navegación fija, menú por teclado, fotografía con una vista real del registro y cifras derivadas del catálogo local. |
| Producto, perfiles y sedes | `product.jsx`, `showcase.jsx` | Ocho funciones verificadas, cinco capturas reales con datos ficticios, dos experiencias y una cuadrícula de tres sedes. |
| Contenido comercial | `commercial.jsx`, `content.mjs` | Tres pasos, planes mensuales de USD 10 y USD 150, FAQ, llamada final y pie de página. |
| Calculadora IMC | `bmi-calculator.jsx` | Reutiliza `calculateBmi` y `getBmiStatus`. Los límites existentes de 1–300 kg y 50–250 cm se anuncian en las etiquetas de ayuda. El resultado reacciona a valores decimales, vacíos y fuera de rango. |
| Estilos y recursos | `elements.jsx`, `landing.css`, `frontend/public/landing/`, `frontend/Dockerfile` | Cuadrículas mobile-first, imágenes WebP, tipografía WOFF2 local con licencia y copia de recursos públicos en la imagen standalone. |
| Indexación de cuenta y dashboard | `frontend/src/app/(auth)/layout.jsx`, `auth/layout.jsx`, `dashboard/layout.jsx` | `noindex, nofollow` para las familias de autenticación y dashboard. |

La portada pasa de una columna en móvil a dos en tablet y escritorio. Los enlaces del menú cierran el desplegable y llevan el foco al encabezado de destino. La página ofrece salto al contenido, enfoque visible, controles de al menos 44 px, preguntas con desplegables nativos y anuncios del IMC y de la demostración. Los cambios de selección se identifican con estado semántico. Las imágenes que ilustran sedes se identifican como referencias.

Los precios se presentan con los formateadores del módulo de pagos. Como el catálogo de pagos requiere sesión y el frontend se construye por separado, la landing usa valores de referencia cuya paridad con el backend se comprueba en una prueba automatizada. El Plan Individual enlaza al registro y el Plan Gimnasio al área existente de suscripciones. Un visitante sin sesión entra por el flujo de ingreso. Los permisos y las asignaciones aplican al contratar.

## Rendimiento

La portada descarga una fotografía de **21 710 bytes** en su variante pequeña o **54 026 bytes** en su variante grande. La miniatura del producto pesa **7 934 bytes** y sólo se solicita en tablet y escritorio. El archivo de Barlow Condensed pesa **22 464 bytes**. Se retiraron el video automático y el carrusel. Las imágenes inferiores usan carga diferida y dimensiones reservadas.

El HTML local sin compresión pasó de **17 120** a **61 020 bytes**, con más contenido disponible en la respuesta inicial. Esta comparación mide tamaño de HTML. No se hizo una medición comparable del video transferido, Lighthouse ni métricas de campo. La hoja de fuentes y el script de Tailwind del layout global siguen siendo dependencias compartidas del resto de la aplicación.

Las fotografías de portada, Poblado y Belén retomaron recursos de la landing anterior. Las imágenes de Laureles y propietarios también son ilustrativas. [Portada](https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e) · [Poblado](https://images.unsplash.com/photo-1534438327276-14e5300c3a48) · [Belén](https://images.unsplash.com/photo-1517838277536-f5f99be501cd) · [Laureles](https://images.unsplash.com/photo-1571902943202-507ec2618e8f) · [Propietarios](https://images.unsplash.com/photo-1540497077202-7c8a3999166f)

## Capturas

| Escritorio | Celular |
| --- | --- |
| [Portada en Firefox a 1440 px](landing/escritorio.webp) | [Portada en Firefox a 390 px](landing/celular.webp) |

Las cinco vistas del selector proceden de la interfaz real de Next.js con respuestas locales ficticias. No se utilizaron cuentas de producción.

## Límites y pendientes

- La tarjeta de Fit Lab Belén conserva `/login?gym=fit-belén`, incluido el acento de la landing anterior. El catálogo del backend identifica esa sede con `fit-belen`. Se comprobó el enlace exacto y la carga de login. La discrepancia puede impedir resolver la sede durante el ingreso. Corregir el identificador público requiere la autorización solicitada para cambios en acceso a sedes.
- El catálogo de sedes confirma los nombres y barrios. Los servicios que aparecían en el antiguo carrusel no constan en el catálogo. Las reseñas requieren autenticación. Por ello se muestran los datos de ubicación verificados, sin calificaciones ni recuentos públicos.
- No se encontraron rutas públicas de contacto, privacidad o términos. El pie contiene enlaces de navegación y cuenta existentes.
- La prueba de suscripciones recorre la confirmación y cancelación con API simulada. La validación de credenciales, correo, Google y transacciones en una instalación real queda fuera de la prueba local.

## Validación local

| Comprobación | Resultado |
| --- | --- |
| Landing pública, enlaces, navegación, SEO y rutas protegidas | Correctos. Se verificaron `/`, ingreso, registro, los tres parámetros `gym`, todos los enlaces de la página y la redirección de visitantes sin sesión desde el dashboard. |
| Firefox a 320, 390, 768, 1024 y 1440 px | Correcto. Sin desbordamiento horizontal. En vista móvil se verificaron teclado, cierre con Escape, navegación por anclas, FAQ y salto al contenido. |
| IMC, imágenes y demostración | Correctos. Se verificaron 24,2 con 70 kg y 170 cm, 27,7 con 80 kg y 170 cm, y rechazo de altura fuera de rango. Se comprobaron la fotografía estática y las cinco vistas. |
| Cuenta y suscripción con API simulada | Correctas. Registro hacia OTP, ingreso con `gym` y apertura y cancelación de la confirmación de pago. La prueba termina antes de enviar la solicitud de checkout. |
| Suites frontend y backend | 13/13 unidades de ejecución en frontend y 79/79 pruebas de backend. |
| Integraciones PostgreSQL local desechable | 5/5 de entrenamiento, rutinas, historial, progreso y nutrición. Las dos integraciones de métricas que requieren Docker quedaron pendientes por permisos del socket. |
| Suites existentes de navegador | Pasaron `home_browser.py`, `training_browser.py` y `nutrition_browser.py`. |
| Compilación, tipos y sintaxis de cambios | `npm --prefix frontend run build`, `npm --prefix backend run typecheck` y `git diff --check` pasaron. Los paquetes no definen un script de lint. |

Para repetir la prueba de la landing con la API local de prueba, ejecuta desde la raíz:

```sh
BACKEND_URL=http://127.0.0.1:19714 npm --prefix frontend run build
LANDING_SCREENSHOTS=/tmp/jj-landing-capturas python3 frontend/tests/landing_browser.py
```

El script usa Firefox y Geckodriver. Admite `FIREFOX_BIN` y `GECKODRIVER_BIN` para instalaciones con ejecutables en rutas especiales.

La rama local es `feature/public-landing-redesign`. Los commits de implementación son `913274e` y `0e5269c`. El último commit de la rama incorpora el informe, las capturas y las pruebas automatizadas.
