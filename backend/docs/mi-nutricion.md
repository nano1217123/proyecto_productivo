# Mi nutrición

## Auditoría y alcance

La ruta existente del dashboard montaba una calculadora React con peso y estatura iniciales de 70 kg y 170 cm, tres multiplicadores según el objetivo, alimentos sin referencias trazables y un conjunto de selecciones en memoria. No había API ni tablas de nutrición. El IMC general permanece en el sitio donde tiene otros consumidores. El perfil de cuenta no almacena edad, estatura o peso. Las métricas de «Mi progreso» registran peso y aportan el último peso disponible al configurar nutrición. Cuando se corrige el peso desde nutrición, se guarda como métrica del día de Bogotá.

La pantalla conserva la navegación de Next.js, el cliente HTTP, la autenticación existente y el diseño oscuro con Barlow. «Mi progreso» consulta el resumen de nutrición mediante la misma API. Las rutinas y las sesiones de entrenamiento mantienen sus propios datos y responsabilidades. La actividad nutricional es declarada por el usuario.

## Metodología

La versión `issn-2017-v1` multiplica el peso en kg por 1,4 y por 2,0. Cada extremo se redondea al gramo. Así, con 70 kg el intervalo orientativo es 98–140 g/día. La barra expresa el porcentaje del extremo inferior y el historial solo compara con referencias de la fecha correspondiente. Los tres objetivos usan el mismo intervalo cuando el perfil cumple las condiciones. La proteína contribuye a la alimentación y a la recuperación. La variación de peso también depende de la energía total y otros factores.

La posición de ISSN describe ese rango para la mayoría de las personas sanas que hacen ejercicio. Esta versión aplica un alcance conservador de adultos de 18 a 64 años con entrenamiento regular declarado, sin circunstancias nutricionales especiales declaradas. Para minimizar los datos personales se solicita el año de nacimiento. Solo se estima si todas las edades posibles según ese año quedan en el intervalo admitido. Los límites operativos de peso para estimar, de 35 a 150 kg, son límites del producto para evitar extrapolaciones automáticas. Embarazo, lactancia, menores, actividad ocasional y condiciones que alteren las necesidades reciben orientación general y pueden consultar a un profesional. [Artículo de posición de ISSN](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/)

En producción la estimación permanece deshabilitada por defecto. Tras revisión profesional, la configuración `NUTRITION_METHOD_REVIEWED=issn-2017-v1` habilita esta versión exacta. Un cambio de versión requiere revisar y actualizar esa configuración.

## Catálogo y porciones

El catálogo incluye 20 alimentos con los nutrientes 1003, 1004 y 1005 del archivo CSV de USDA SR Legacy de abril de 2018. Cada alimento enlaza su identificador FDC. Las porciones volumétricas y en unidades provienen de `food_portion.csv` para la preparación indicada. La conversión de ml para leche se basa en el peso de 244 g de una taza de 236,588 ml. Si el catálogo no dispone de una equivalencia seleccionada, ofrece gramos y una porción de referencia de 100 g. No se equipara queso fresco mexicano y queso campesino colombiano.

- **USDA FoodData Central.** Fuente CC0, exportación descargable. SR Legacy es una edición final. Se usa una copia curada en el repositorio que funciona sin API, credenciales, cuotas ni caché. [Descargas USDA](https://fdc.nal.usda.gov/download-datasets/) · [Documentación](https://fdc.nal.usda.gov/data-documentation/)
- **ICBF TCAC.** Fuente con cobertura de preparaciones locales, candidata para enriquecer el catálogo tras verificar condiciones de reutilización y porciones. [ICBF](https://www.icbf.gov.co/tabla-de-composicion-de-alimentos-colombianos-tcac)
- **Etiquetas.** Son apropiadas para productos concretos y deben conservar marca, formulación, porción y revisión.

Las recomendaciones seleccionan categorías según el objetivo, consideran preferencias y alérgenos consignados y muestran una explicación. La selección usa aporte por porción para el contexto de entrenamiento regular. Los ingredientes y la contaminación cruzada dependen de la preparación. Las ideas de comidas son flexibles y reutilizan los alimentos del catálogo. Las imágenes del catálogo y las ideas son ilustrativas y se generaron para esta interfaz. Cada registro conserva la fuente, los nutrientes por 100 g y las equivalencias que estaban vigentes al crearlo. El servidor calcula `proteína = cantidad × gramos por unidad × proteína por 100 g / 100` y redondea a dos decimales. La edición usa la misma copia histórica.

## Persistencia y API

La migración aditiva `20261129100000_nutrition` crea perfiles, versiones de referencias, registros y favoritos con claves foráneas al propietario, restricciones e índices. Los alimentos están versionados en código con identificadores FDC estables. Una transacción serializa los cambios de perfil y la creación de referencias. La fecha del historial es la fecha civil del usuario, independiente del huso horario del servidor. Para un día con varias referencias rige la última versión de ese día. Un cambio posterior no modifica días previos. Al volver a consultar el perfil luego de actualizar el peso en «Mi progreso», el módulo actualiza la referencia desde ese día y conserva la anterior.

Todas las rutas se montan en `/api/nutricion` y requieren sesión. La identidad no forma parte de las escrituras de cliente. Las lecturas y mutaciones de registros filtran por propietario. Las respuestas son privadas, sin caché, y los errores de persistencia evitan registrar campos nutricionales.

| Método y ruta | Contrato |
| --- | --- |
| GET, PATCH `/perfil` | Configuración, último peso, fecha local, objetivo y referencia. PATCH recibe la configuración completa y un peso opcional. |
| GET `/alimentos` | Búsqueda, categoría, origen, preferencias, favoritos, orden y paginación. |
| GET `/alimentos/:id` | Nutrientes, porciones y fuente de un alimento. |
| GET `/recomendaciones`, `/comidas` | Selección explicable e ideas flexibles. |
| POST `/aporte`, `/aporte/:id` | Vista previa con catálogo vigente o copia del registro del propietario. |
| GET `/registros?day=AAAA-MM-DD&days=7` | Registros paginados, referencias y estadísticas de un periodo de 1 a 31 días, con filtros de alimento y comida. |
| POST `/registros` | Crea un registro, valida fecha, cantidad y unidad, y calcula proteína. Admite un identificador de solicitud para reintentos. |
| PATCH, DELETE `/registros/:id` | Corrige o elimina el registro del propietario. |
| PUT, DELETE `/favoritos/:id` | Guarda o quita un favorito. Se lista en `/alimentos?favorite=true`. |

Un día sin registros tiene proteína `null`. El promedio excluye esos días. Al desactivar el seguimiento, los registros anteriores quedan disponibles para consulta, edición y eliminación.

## Ejecución y verificación

Configura las variables habituales del repositorio con una base PostgreSQL local y un usuario autenticado de prueba. Desde `backend`:

```sh
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npm run dev
```

Desde `frontend`, configura `BACKEND_URL` y ejecuta `npm run dev`. Abre `/dashboard/nutricion` y comprueba la configuración inicial, el catálogo, un registro y su historial. Las instrucciones generales de configuración se encuentran en el README del repositorio.

Para validar, ejecuta `npm run typecheck` y `npm run build` en backend y `npm run build` en frontend. En backend, las pruebas del dominio se ejecutan con `node --import tsx --test tests/nutrition.test.ts`. Para el flujo real, prepara una base desechable en `127.0.0.1` llamada `jjgym_nutrition_test`, aplica las migraciones, exporta su URL como `JJGYM_NUTRITION_TEST_DATABASE` y ejecuta `node --import tsx --test tests/nutrition.integration.ts`. La comprobación responsive usa Firefox y geckodriver tras compilar el frontend. Compila el frontend con `BACKEND_URL=http://127.0.0.1:19544 npm run build`. Desde la raíz ejecuta `python3 frontend/tests/nutrition_browser.py`.
