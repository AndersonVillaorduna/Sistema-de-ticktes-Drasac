# Correcciones y operación — 29 de septiembre de 2026

La revisión cambió la lógica interna y el backend. Se conservaron las rutas de las pantallas, los controles, las clases de estilo y los temas. Los indicadores de IA y las cifras ahora reflejan datos reales. Las restricciones de acceso se aplican también en la API.

## Correcciones aplicadas

| Hallazgo | Corrección |
| --- | --- |
| Contraseñas de equipos expuestas en tickets y exportaciones de usuarios comunes | Serialización sin credenciales por defecto; detalle y exportación limitados a administradores/técnicos y registrados en auditoría. |
| Acceso de técnicos a tickets fuera de su responsabilidad | Una política común para detalle, comentarios, pasos, exportación y estadísticas por tienda. |
| Equipos ajenos asociados por un usuario | Validación de pertenencia a la tienda y de existencia antes de guardar. |
| Cuenta IA con credenciales conocidas y privilegios administrativos | Cuenta de sistema desactivada para inicio de sesión. Seed prohibido en producción; administración mediante manage.py. |
| Sesiones antiguas válidas después de cambiar contraseña o salir | Revocación persistente y versión de sesión ligada al hash de contraseña. |
| JWT persistido en localStorage | El navegador usa cookies HttpOnly persistentes, protección CSRF y CORS con credenciales para orígenes exactos. Bearer sigue disponible para clientes de API. |
| Adjuntos públicos por UUID | Descargas autenticadas o enlaces firmados temporales ligados a sesión/usuario y permisos vigentes. |
| Extensión de archivo insuficiente y uso de adjuntos ajenos | Verificación de contenido, dimensiones y tamaño; registro de autor; validación de propiedad al adjuntar. |
| Cuota diaria reiniciada al consultar | Contadores en base de datos y bloqueo entre procesos; límites global y por usuario. |
| Validación incompleta | Esquemas activos, límites de longitud, enums y referencias; JSON y errores uniformes. |
| Auditorías perdidas por commits prematuros | Cambios y auditorías en una transacción; creación de tickets y notificaciones atómica. |
| Doble creación por reintentos | Idempotency-Key en frontend/API y registro persistente junto con el ticket. |
| “Gracias, pero no funciona” cerraba tickets | Detección conservadora, negaciones antes que confirmaciones; confirmar IA solo en estado pendiente. |
| Reapertura y cierre sin solución alteraban métricas | Limpieza de datos de resolución al reabrir y separación de cierres sin resolver. |
| Contraseña de equipo imposible de borrar | Null explícito la borra; omitir el campo la conserva. |
| Semanas superpuestas y horas ambiguas | Ventanas disjuntas, timestamps UTC explícitos y exportación en America/Lima. |
| Respuestas antiguas y falta de refresco del chat | Cancelación de vistas previas obsoletas y consulta periódica visible; borradores conservados. |
| Cifrado dependiente de SECRET_KEY y devolución de datos corruptos | Llave independiente, formato versionado y lectura con llaves anteriores; fallo de descifrado no revela texto. |
| SQLite sin integridad referencial y migraciones informales | Foreign keys activas, Alembic y migración aditiva con respaldo previo. |
| Historial con autores eliminados | Cuenta archivada sin acceso para preservar los mensajes; se eliminan solo marcadores de lectura sin referencias válidas. |
| Consultas repetidas y saturación de IA | Carga anticipada, agregaciones, índices, prompts acotados y cupos de IA compartidos entre procesos locales. |
| Respaldos incompletos o limpieza destructiva | ZIP verificado de base + adjuntos; la retención de respaldos no elimina archivos de conversaciones/manuales. |
| Configuración de producción permisiva | Secretos fuertes, CORS exacto HTTPS, Redis obligatorio, debug desactivado, configuración explícita de proxy. |
| Adjuntos y cuotas versionados en Git | Se retiran del índice y se ignoran; los archivos locales permanecen. |
| Dependencias vulnerables | Actualizaciones compatibles, lockfiles y verificación OSV/npm. |
| Accesibilidad del modal y advertencias del frontend | Foco, teclado, ARIA y aislamiento de fondo, sin cambiar su presentación. |

## Resultado de la instalación local

Se comprobó una copia y después se migró la base local. Se conservaron los **26 tickets, 128 comentarios y 7 equipos**, el contenido de las conversaciones y todas las contraseñas existentes. Se repararon cuatro referencias rotas. El número de cuentas pasó de 7 a 8 por la cuenta archivada, desactivada, necesaria para preservar un comentario cuyo autor ya no existía. No se cambió la contraseña de los usuarios humanos.

Se configuró CORS para localhost:5173, 127.0.0.1:5173 y localhost:4173 y una llave independiente de inventario conservando la llave anterior para lectura. Los archivos físicos de los seis adjuntos retirados de Git siguen presentes. Hay respaldos previos y posteriores en backend/backups; la configuración anterior queda en un archivo .env privado dentro de esa carpeta ignorada.

Verificación final: **50 pruebas backend y 2 frontend**, pip check, lint sin advertencias, build y npm audit sin alertas. En el navegador se verificaron acceso, recarga, creación de ticket, envío de mensaje, inventario y teclado/escritura del modal, con datos ficticios en una base temporal. No se realizó una prueba de carga ni una inferencia real de Ollama.

Para usar los cambios, reiniciar el backend y el frontend que estuvieran abiertos, e iniciar sesión nuevamente si conservaban un token anterior. Los procesos de prueba se cierran al finalizar.

## Verificación reproducible

Desde la raíz, con Python 3.12 y Node 24:

```powershell
backend/venv/Scripts/python.exe -m unittest discover -s backend -p "test_*.py"
backend/venv/Scripts/python.exe -m pip check
cd frontend
npm test
npm run lint -- --deny-warnings
npm run build
npm audit
```

Las pruebas incluyen permisos, cifrado, revocación, cookies/CSRF, archivos, confirmaciones, atomicidad, conservación de credenciales antiguas, restauración de respaldos y cuota bajo dos procesos independientes. Usan bases y directorios temporales. La clasificación con un modelo Ollama real se verifica aparte con `backend/test_ai.py`; las pruebas automatizadas de rutas simulan ese servicio.

Los paquetes Python instalados se comprobaron con OSV: 46 paquetes, sin alertas para las versiones consultadas. npm audit inicialmente detectó siete paquetes afectados y terminó sin alertas tras las actualizaciones. Esto refleja los avisos disponibles en la fecha de la revisión. Entre las correcciones estaban [PostCSS](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) y [React Router](https://github.com/advisories/GHSA-qwww-vcr4-c8h2); el aviso de Router corresponde a RSC, que este frontend no utiliza.

## Actualizar una instalación existente

1. Conservar un respaldo de base, adjuntos y configuración. No ejecutar seed sobre datos de trabajo.
2. Instalar `backend/requirements-lock.txt` y ejecutar `npm ci` dentro de frontend.
3. Conservar SECRET_KEY y JWT_SECRET_KEY actuales si son fuertes. No cambiar llaves de cifrado sin conservar las anteriores.
4. Configurar INVENTORY_ENCRYPTION_KEYS con la nueva llave primero y la anterior después. Para instalaciones antiguas, la llave anterior era `base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest()).decode()`. No publicar ese valor.
5. Ejecutar `python backend/manage.py check`: aplica la migración y verifica integridad. SQLite crea un respaldo `backend/backups/pre_security_*.db` antes de la primera migración. Para MySQL/PostgreSQL, obtener primero un dump del servidor.
6. Reiniciar el backend y recompilar/publicar el frontend juntos. Las sesiones anteriores pueden requerir iniciar sesión una vez.

Las migraciones no borran tickets, mensajes ni equipos. Si hay asignaciones duplicadas se detienen para revisión. Los respaldos previos a migración quedan fuera de la limpieza automática. La reversión se hace restaurando el respaldo, no mediante un downgrade destructivo.

## Producción

- Usar HTTPS y un proxy con el frontend y `/api` en el mismo dominio. Compilar con `VITE_API_URL=/api`; hay un ejemplo en `deploy/nginx.conf.example`.
- `FLASK_ENV=production`, `FLASK_DEBUG=0`, secretos aleatorios independientes, `INVENTORY_ENCRYPTION_KEYS` y `CORS_ORIGINS` con el dominio HTTPS exacto.
- `RATELIMIT_STORAGE_URI=redis://...` con una instancia privada. `memory://` queda para desarrollo.
- `TRUSTED_PROXY_COUNT=1` únicamente cuando exista exactamente el proxy confiable del ejemplo. El backend debe permanecer inaccesible directamente desde Internet. Si la cadena cambia, revisar el valor.
- `JWT_COOKIE_SAMESITE=Lax` funciona con el mismo sitio. Para dominios diferentes puede necesitarse `None` y HTTPS; algunos navegadores bloquean cookies de terceros. Un proxy en el mismo dominio evita esa dependencia.
- El servidor local escucha en 127.0.0.1 por defecto. Una publicación en red requiere configurar FLASK_RUN_HOST expresamente y proteger esa red.
- En Linux, desde backend: `gunicorn -c gunicorn.conf.py run:app`. Gunicorn no corre en Windows; el servidor de desarrollo no es el servidor de producción.
- Los bloqueos de cuotas, tickets e IA cubren varios workers en **un host** con el mismo directorio instance. Para varios hosts hacen falta coordinación distribuida y almacenamiento compartido, además de probar la carga real.
- Dimensionar workers, threads y pools según mediciones. WEB_THREADS debe superar OLLAMA_MAX_CONCURRENTES. SQLite queda adecuado para el uso local actual; migrar a PostgreSQL/MySQL requiere una migración de datos y pruebas en ese servidor.
- `python backend/manage.py bootstrap-admin --email correo@dominio` crea un administrador con contraseña ingresada de forma privada. `set-password --email ...` reemplaza una credencial existente y revoca sus sesiones. No usar contraseñas de demostración en producción.
- `/health` verifica la base y devuelve 503 si falla. `/live` comprueba el proceso. Monitorizar errores, cuotas, disco, backups y latencia de Ollama.
- Publicar la CSP del ejemplo también en el host del frontend. Los encabezados del backend no protegen HTML servido por otro proveedor. El ejemplo conserva Inter y estilos dinámicos actuales.

## Respaldos y recuperación

`python backend/manage.py backup` genera un ZIP con base, uploads y manifiesto. SQLite usa su API de backup para incluir datos confirmados del WAL. MySQL/PostgreSQL requieren mysqldump/pg_dump instalados. Las llaves no se incluyen en el ZIP: guardarlas separadamente en un almacén seguro. Los respaldos contienen datos sensibles y deben tener acceso restringido y copia fuera del equipo.

Para recuperar: detener los procesos de la instalación destino, conservar una copia del estado actual, extraer un ZIP verificado a un directorio temporal, restaurar la base y uploads en sus rutas configuradas, restablecer las llaves correspondientes y ejecutar manage.py check antes de iniciar. En SQLite no superponer una base restaurada sobre procesos activos ni conservar archivos WAL/SHM de la base reemplazada. En servidores SQL, seguir la restauración nativa del motor. La prueba automatizada verifica la extracción y consulta de una base restaurada; un simulacro completo del servidor debe hacerse en un entorno separado.

Los adjuntos referenciados por mensajes/manuales se conservan. La limpieza de huérfanos es explícita y respeta la retención. Los enlaces firmados caducan y se renuevan al consultar los recursos.

## Límites y decisiones pendientes

- La aplicación conserva arrays completos por compatibilidad. Tickets e inventario aceptan page/per_page (máximo 200) para integrar paginación más adelante sin perder información. Para historiales muy grandes todavía hace falta paginación visual o consultas analíticas dedicadas.
- El contenido de PDF/Word se verifica por formato y estructura básica, pero no se ejecuta un antivirus. Para archivos de orígenes desconocidos en producción, añadir escaneo antes de su publicación.
- Retirar archivos del índice no elimina copias de commits antiguos ni repositorios clonados. Si contenían información sensible, gestionar su eliminación histórica y rotación fuera de este cambio.
- No se han desplegado Redis, certificados, Nginx ni un servidor SQL externo. Las migraciones portables y los dumps de esos motores deben probarse en la infraestructura elegida.
- No se enviaron notificaciones externas ni se publicaron cambios en servicios remotos. Los cambios quedan disponibles en el workspace para revisión.
