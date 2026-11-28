# Suscripción SaaS por sede (RF-013 / RN-012)

El administrador de un gimnasio paga a JJ GYM, mes a mes, el software de cada sede que administra. El pago se hace con Wompi Checkout Web y la renovación es manual. **La sede solo se activa o se renueva cuando Wompi confirma el pago** y el backend lo verifica. Las membresías que los clientes pagan a su gimnasio no pasan por este flujo, y el plan del usuario particular no cambia.

## Precio

150 USD al mes por sede (`CATALOGO_PLANES` en `lib/pagosPrecios.ts`), convertidos a COP con `USD_COP_TASA` al crear cada intento. Con la tasa de prueba `4000`, el checkout cobra **$600.000 COP** (60.000.000 centavos). Cada intento guarda el precio en USD, la tasa y el importe final, y ese importe no se recalcula aunque la tasa cambie después.

## Flujo

1. El panel (`GET /api/pagos/opciones`) lista una opción por cada sede de `admin_sedes`, con el importe en COP y `suscripcion: { estado, vigente_hasta }`. El botón dice «Renovar» si la sede está activa y «Pagar» si nunca se pagó o ya venció.
2. `POST /api/pagos/wompi/checkout` comprueba que el admin administra la sede, crea el intento con `gym_slug` y `ambiente` y devuelve la URL firmada. **La sede beneficiaria es la de este intento**: el webhook, la conciliación y la URL de retorno nunca la deciden.
3. Wompi notifica el resultado por el webhook (`POST /api/pagos/wompi/webhook`). Si el aviso no llega, la página de resultado pide la conciliación (`POST /api/pagos/conciliar`). Los dos caminos usan la misma verificación (`verificarYAplicarTransaccion`):
   - firma del evento y ambiente (`environment` igual al de la configuración y al del intento);
   - consulta de la transacción a la API de Wompi con la llave privada;
   - referencia, importe y moneda de la transacción verificada iguales a los del intento.
4. Si el intento pasa a `APROBADO`, en la misma transacción de PostgreSQL se concede el período de la sede (ver «Garantías»).
5. La página de resultado (`GET /api/pagos/estado`) muestra qué sede se pagó y, cuando el backend lo confirma, la vigencia nueva. Un admin solo ve pagos de sedes que administra hoy; para cualquier otra responde 404.

## Regla de vigencia

- **Un mes calendario por pago aprobado.** El momento de aprobación es `finalized_at` de la transacción verificada con Wompi.
- **Primer pago, o sede vencida en el momento de la aprobación:** el período empieza en la aprobación (tipo `activacion` o `reactivacion`).
- **Sede vigente:** el período empieza en su vencimiento actual (tipo `renovacion`), así que pagar antes no hace perder días. Un pago aprobado antes del vencimiento, aunque se procese después, también renueva desde el vencimiento.
- **Zona horaria:** America/Bogota (UTC−5, sin horario de verano). Día y hora de vencimiento se calculan en hora de Colombia, y el panel los muestra en esa zona.
- **Finales de mes:** el vencimiento cae en el «día de corte», el día del mes de la activación o reactivación, con su misma hora. Si el mes no tiene ese día, vence el último día del mes, y el día de corte se mantiene en las renovaciones: 31 ene → 28 feb (29 en bisiesto) → 31 mar → 30 abr → 31 may. Un pago aprobado el 31 de enero a las 23:30 de Colombia (1 de febrero en UTC) vence el 28 de febrero a las 23:30.
- **Estado mostrado:** `activa` si `vigente_hasta` es posterior a ahora, `vencida` si ya pasó y `sin_suscripcion` si la sede no tiene períodos.

El código está en `lib/suscripcionSede.ts` y las pruebas en `tests/suscripcionSede.test.ts`.

## Garantías

| Situación | Cómo se garantiza |
|---|---|
| El mismo pago llega varias veces (webhook repetido, webhook y conciliación a la vez) | Solo el `UPDATE` condicional que pasa el intento a `APROBADO` concede el período, en la misma transacción. Además, `suscripciones_sede_periodos.pago_id` es único: aunque la aplicación lo intentara, la base rechaza un segundo período (probado quitando las dos protecciones de la aplicación). |
| Dos pagos válidos distintos de la misma sede a la vez | Cada concesión bloquea la fila de la sede en `suscripciones_sede` (`SELECT … FOR UPDATE`), así que los períodos se encadenan. Como respaldo, `(gym_slug, desde)` es único: dos períodos calculados sobre el mismo vencimiento no pueden guardarse los dos (probado quitando el cerrojo). |
| Wompi reporta dos transacciones aprobadas para una referencia | El intento conserva la primera, no se concede un segundo período y la otra queda en `pagos_transacciones_revision` (motivo `segunda_aprobacion`), con alerta en el log. El webhook responde 409, como antes. |
| El período usa la sede o el plan de otro intento | Clave foránea compuesta `(pago_id, gym_slug, plan)` hacia `pagos_intentos(id, gym_slug, plan)`, con `plan = 'suscripcion_sede'`. |
| Pago pendiente, rechazado o con error | No concede nada; la vigencia anterior no cambia. |
| Datos que no coinciden (importe, moneda, referencia o ambiente) | 409 o 422 sin cambios. |

## Migración `20261202120000_suscripciones_sede`

Es aditiva: no modifica ni borra datos.

- `pagos_intentos.ambiente` (`'test'` por defecto; los intentos existentes son de Sandbox) e índice único `(id, gym_slug, plan)` para las claves compuestas.
- `suscripciones_sede`: una fila por sede con `vigente_hasta`, `dia_corte` y `ultimo_pago_id`. También es el cerrojo de cada sede.
- `suscripciones_sede_periodos`: un período por pago aprobado (`activacion`, `renovacion` o `reactivacion`), con la transacción de Wompi, la aprobación y el rango. Es el historial de la sede.
- `pagos_transacciones_revision`: transacciones aprobadas que no concedieron vigencia.

**Pagos históricos:** se dejan como están. Ningún pago aprobado anterior a esta migración concede vigencia automáticamente. Si una base tiene pagos de sede ya `APROBADO`, su activación inicial debe decidirse y hacerse aparte. Al 28-11-2026: la rama Neon del backend no tiene pagos; la base local `jjgym_pagos` tiene 6 pagos de sede, todos `PENDIENTE`, y ninguno aprobado.

## Fuera de esta fase

- **Bloqueos de acceso:** el estado se muestra, pero una sede vencida no bloquea nada.
- **Anulaciones y reembolsos:** un pago aprobado que después pasa a `ANULADO` (VOIDED) conserva el período concedido. Falta definir si se revoca, se acorta o se revisa a mano.
- **Segunda aprobación de una referencia:** queda para revisión manual. No hay pantalla para resolverla ni reembolso automático.
- **Producción:** solo se admiten llaves de Sandbox (`ambiente = 'test'`). La tasa de conversión de producción está pendiente.
- **Renovación automática** (tokenización o cobros recurrentes).

## Pruebas

Las pruebas unitarias de la regla no necesitan base. Desde `backend`:

```bash
node --import tsx --test tests/suscripcionSede.test.ts
```

La integración usa una base PostgreSQL desechable en `127.0.0.1` llamada `jjgym_suscripciones_test`, con todas las migraciones aplicadas y **la zona horaria en GMT, como Neon**. El adaptador de Neon envía y lee las fechas sin zona, así que con otra zona se guardarían desplazadas. La prueba lo comprueba al empezar. Wompi se simula con un servidor HTTP local y el webhook se firma con un secreto de prueba.

```bash
psql -c "ALTER DATABASE jjgym_suscripciones_test SET timezone TO 'GMT'"
JJGYM_SUSCRIPCIONES_TEST_DATABASE=postgresql://usuario@127.0.0.1:5432/jjgym_suscripciones_test?sslmode=disable \
  node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/suscripcionSede.integration.ts
```

Desde `frontend`: `node --test src/features/payments/lib/payments.test.mjs`.

## Pendiente de verificar en Sandbox

No hay un entorno con URLs públicas HTTPS estables (frontend y webhook), así que no se probó de punta a punta con Wompi Sandbox real. Falta comprobar:

1. Abrir el checkout real de Sandbox desde «Pagar» o «Renovar» y pagar con la tarjeta de prueba aprobada.
2. Que Wompi entregue el evento `transaction.updated` al webhook público y que la vigencia se conceda una sola vez.
3. Que el retorno a `/dashboard/pagos/resultado?referencia=…&id=…` muestre la sede y la vigencia nueva.
4. Repetir con la tarjeta de prueba rechazada y comprobar que la vigencia no cambia.
5. Como respaldo sin webhook, que la conciliación desde la página de resultado aplique el mismo pago.

Hace falta configurar en el panel de Wompi Sandbox la URL de eventos `https://<dominio>/api/pagos/wompi/webhook` y definir `WOMPI_REDIRECT_URL` con el dominio público del frontend. Los dos dominios deben ser HTTPS y estables: los túneles rápidos se cayeron en pruebas anteriores.
