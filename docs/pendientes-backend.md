# Pendientes en el backend: flujo de vacantes

Fecha: 25/11/2026. El frontend ya tiene el flujo de **vacantes**, que reemplaza al pedido con asignación automática. Hoy funciona con una **capa simulada en el navegador** (`src/vacancies/mockStore.ts`), porque el backend (`Jornal-BK`) no tiene vacantes, postulaciones ni selección. Este documento es el contrato para implementarlo. Cuando exista, se reemplaza `mockStore.ts` por llamadas HTTP con la misma forma (los tipos están en `src/vacancies/types.ts`).

## El flujo

1. **Quien contrata** (persona `APPLICANT` o comercio `BUSINESS`) publica una vacante: categoría, título, descripción, requisitos, personas necesarias, primer día, de 1 a 7 días, horario, dirección y punto en el mapa, pago por jornada y si es urgente. Son trabajos informales, sin contrato. **No se cobra nada al publicar.**
2. **El trabajador** ve las vacantes abiertas dentro de su radio, ordenadas por compatibilidad (cercanía y categoría). Le llega una **alerta** cuando se publica una vacante cerca y está disponible. Ve de qué se trata, cuándo es, cuánto le pagan y qué se requiere, y **se postula** o retira su postulación.
3. **Quien contrata** ve a los postulados ordenados por **viabilidad**: cercanía 35 %, calificación 25 %, trabajos completados 20 % y si hace esa categoría 20 %. Revisa su hoja de vida y **selecciona** hasta las personas que necesita. La vacante pasa a **en proceso**.
4. A cada seleccionado se le **avisa** con día, hora y lugar. A los demás se les avisa que no fueron seleccionados.
5. En el **registro**, la vacante en proceso muestra a las personas, más dos botones: **Cancelar proceso** (no asistieron, no terminaron u otro motivo) y **Finalizar proceso**. Finalizar se activa al terminar la última jornada.
6. **Finalizar:** quien contrata elige el **método de pago para cada trabajador** (los del país, `paymentMethods` del perfil regional) y paga lo de los trabajadores más la **comisión de la app** (`commissionBps`). Cada trabajador recibe el aviso del pago.

## Estados

- Vacante: `OPEN` → `IN_PROCESS` (al seleccionar) → `COMPLETED` (al finalizar y pagar), o `CANCELLED` desde `OPEN` o `IN_PROCESS`.
- Postulación: `APPLIED` → `SELECTED` o `NOT_SELECTED`. El trabajador puede pasarla a `WITHDRAWN` mientras está en `APPLIED`.

## Endpoints propuestos (core regional, `/api/{país}`)

| Método y ruta | Rol | Qué hace | Hoy en `mockStore.ts` |
| --- | --- | --- | --- |
| `POST /vacancies` | APPLICANT, BUSINESS | Crea la vacante (`VacancyDraft`). Toma moneda, escala y comisión del perfil regional | `create` |
| `GET /vacancies/mine?status=` | APPLICANT, BUSINESS | Vacantes propias por estado (inicio y registro) | `mine` |
| `GET /vacancies/{id}` | dueño, postulante, ADMIN | Detalle. El dueño ve los postulados con viabilidad; el trabajador ve solo su postulación | `get` |
| `POST /vacancies/{id}/selection` | dueño | `{ workerIds: [] }`, de 1 a `workersNeeded`. Pasa a `IN_PROCESS` y avisa a todos | `select` |
| `POST /vacancies/{id}/cancel` | dueño | `{ reason }`. Avisa a los postulados | `cancel` |
| `POST /vacancies/{id}/finalize` | dueño | `{ payouts: [{ workerId, method }] }`. Solo después de `endsAt`; el monto lo calcula el backend. Pasa a `COMPLETED` | `finalize` |
| `GET /vacancies/nearby` | WORKER | Abiertas dentro de `workRadiusKm` desde su ubicación base, con `distanceKm` y `match` (PostGIS) | `nearby` |
| `POST /vacancies/{id}/applications` | WORKER | Se postula. El backend arma el perfil del postulante con sus datos reales | `apply` |
| `DELETE /vacancies/{id}/applications/me` | WORKER | Retira la postulación (solo en `APPLIED`) | `withdraw` |
| `GET /vacancies/applications/me` | WORKER | Sus postulaciones con su vacante (activas e historial) | `myApplications` |
| `GET /workers/me/earnings` | WORKER | Trabajos pagados, total y de la semana | `workerStats` |
| `PUT /workers/me/resume` y `POST /workers/me/documents` | WORKER | Hoja de vida: experiencia, habilidades, foto y documentos | `saveExtra` |

Códigos de error que la interfaz ya traduce (`vac.errors.*`): `VACANCY_NOT_FOUND`, `VACANCY_NOT_OPEN`, `ALREADY_APPLIED`, `CANNOT_WITHDRAW`, `VACANCY_NOT_FINISHED`, `INVALID_SELECTION`, `VACANCY_CLOSED` y `VACANCY_NOT_IN_PROCESS`.

## Mensajería, pagos y avisos (encaje con lo que ya existe)

- **Eventos al broker** desde el Outbox del core: `vacancy.published`, `vacancy.application-created`, `vacancy.selected`, `vacancy.cancelled` y `vacancy.finalized`.
- **Notificaciones:**
  - Reemplazar las plantillas de pedido por las de vacante: `SELECTED`, `NOT_SELECTED`, `CANCELLED`, `PAID`, `NEW_APPLICANT` y `NEARBY` (alerta a trabajadores disponibles dentro del radio).
  - En la interfaz, el texto se arma con `data` en el idioma de quien lo lee.
  - Por WebSocket se publica en `/topic/users.<id>`; hoy la capa simulada usa el evento `storage` del navegador.
- **Pagos:**
  - `finalize` dispara un cobro a quien contrata: el total para los trabajadores más la comisión.
  - Luego se hace un pago (`payout`) a cada trabajador con su método.
  - El libro de movimientos que ya existe registra la comisión y la liquidación.
  - Ya no hay autorización al crear (la empresa paga al final, según lo que se decidió).
- **Facturación:** un comprobante por vacante finalizada, a nombre de quien contrata (razón social e identificación fiscal si es comercio).
- **Asignación (`dispatch`):** la oferta automática secuencial deja de usarse. La cercanía, la calificación y la carga se reutilizan para la viabilidad de los postulados y para el `nearby` del trabajador.

## Otros puntos detenidos

| Punto | Hoy en la app | Qué falta en el backend |
| --- | --- | --- |
| Calificación de quien contrata | Solo la de las empresas de ejemplo | Calificar al terminar la vacante en ambos sentidos (ya existe para pedidos) |
| Zonas por celdas (H3) en el mapa | Siete hexágonos ilustrativos alrededor de la ubicación base | Solo si se decide organizar las zonas por celdas |
| Ubicación real de la vacante en la alerta para trabajadores no conectados | Solo ven la alerta si tienen la app abierta | Notificación push o correo con la plantilla `NEARBY` |

## Datos de ejemplo de la capa simulada

- **Vacantes de ejemplo:** cinco vacantes de empresas ficticias cerca del centro de la región, para que el trabajador vea ofertas aunque nadie haya publicado. Se crean una sola vez por región en el navegador.
- **Postulantes de ejemplo:** al publicar, la vacante recibe tres postulantes simulados (con la insignia "Demo") para poder demostrar la selección sin otra sesión. Los postulantes reales son las cuentas de trabajador que se postulan desde otra pestaña.
- **"Demo: simular que terminó la jornada":** enlace visible solo en desarrollo para habilitar Finalizar sin esperar.
- **Para borrar los datos simulados:** en la consola del navegador, `localStorage.removeItem('trabajoya.mock.vacantes.co')`.
