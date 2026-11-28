# Quitar la imagen de un ejercicio

Desde la pestaña «Imágenes de ejercicios» del panel, un administrador puede quitar la imagen asignada a un ejercicio del catálogo. El ejercicio queda sin imagen y las pantallas muestran la imagen predeterminada.

## Comportamiento

- **Quién puede hacerlo:** `admin` y `super_admin`, los mismos roles que asignan imágenes. El catálogo es compartido, así que el cambio afecta a todas las sedes.
- **Qué cambia:** solo `ejercicios.imagen_url` del ejercicio indicado, que pasa a `NULL`.
- **Qué no cambia:**
  - El archivo de Cloudinary se conserva.
  - Otros ejercicios que usen la misma imagen la mantienen.
  - Los entrenamientos finalizados conservan su copia en `entrenamientos.catalogo_historico`.
- **Cambios simultáneos:** la petición incluye la imagen que vio el administrador al confirmar. Si otro administrador la reemplazó o la quitó entretanto, no se cambia nada y la respuesta es 409 con la imagen vigente; el panel la muestra al momento.
- **Imagen predeterminada:** el panel usa `public/ejercicio-sin-imagen.svg` cuando el ejercicio no tiene imagen o el archivo no carga (por ejemplo, un 404 de Cloudinary). En ese caso avisa de que no se pudo cargar el archivo y sigue ofreciendo «Quitar imagen».

## Contrato

`DELETE /api/ejercicios/:id/imagen`, con sesión y el cuerpo JSON `{ "imagenActual": "<URL que se mostró>" }`.

| Respuesta | Cuándo |
|---|---|
| `200 { message, imagenUrl: null }` | Se quitó la imagen. |
| `400` | `id` no es un entero positivo, o falta `imagenActual`, no es texto o hay campos extra. |
| `401` / `403` | Sin sesión, o el rol no es `admin` ni `super_admin`. |
| `404` | El ejercicio no existe. |
| `409 { message, imagenUrl }` | La imagen ya no es `imagenActual`. `imagenUrl` es la vigente (`null` si ya se quitó). |

La comprobación y el cambio van en un único `UPDATE ... WHERE id = $1 AND imagen_url = $2`. Así, de dos confirmaciones simultáneas solo una tiene efecto.

## Archivos

- **Backend:** `routes/ejercicios.routes.ts`, `controller/ejercicios.controller.ts`, `repositories/ejercicios.repository.ts` y `tests/ejercicioImagen.integration.ts`.
- **Frontend:** `features/admin/components/ImagesTab.jsx`, `features/admin/hooks/useImageAssignment.js` (más `useImageAssignment.quitar.test.mjs`), `features/admin/api/adminApi.js`, `features/exercises/components/ImagenEjercicio.jsx` y `public/ejercicio-sin-imagen.svg`.

## Pruebas

Las pruebas del hook no necesitan base de datos. Desde `frontend`:

```bash
node --experimental-test-module-mocks --test src/features/admin/hooks/useImageAssignment.quitar.test.mjs src/features/admin/hooks/useImageAssignment.test.mjs
```

La integración HTTP necesita una base PostgreSQL desechable en `127.0.0.1` llamada `jjgym_imagenes_test`, con todas las migraciones aplicadas. Crea cuentas, ejercicios y un entrenamiento de prueba, y los borra al terminar. Cloudinary se sustituye por funciones que fallan si se llaman. Desde `backend`:

```bash
JJGYM_IMAGENES_TEST_DATABASE=postgresql://usuario@127.0.0.1:5432/jjgym_imagenes_test?sslmode=disable \
  node --experimental-test-module-mocks --import tsx --test tests/ejercicioImagen.integration.ts
```

## Fuera de alcance

- Guardar el `public_id` de Cloudinary de cada imagen (requiere migración).
- Borrar archivos remotos sin uso.
- Usar la imagen predeterminada en las pantallas de los usuarios (catálogo, rutinas, entrenamiento).
