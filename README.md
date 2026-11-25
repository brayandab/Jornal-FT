# trabajoYa — frontend

Aplicación web de **trabajoYa** (F9 del plan en `Jornal-BK/documento.md`). Hay una sola app, pensada primero para móvil, con selector de país e idioma y una vista por rol: cliente, comercio, trabajador y administrador. Se conecta al backend distribuido de `Jornal-BK` siempre a través del gateway.

## Tecnología

| Necesidad | Herramienta |
| --- | --- |
| Framework | React 18 + TypeScript estricto + Vite |
| Rutas | React Router |
| Traducciones | i18next: `src/i18n/locales/{es-CO,pt-BR,en-US,fr-FR,ja-JP,de-DE}.json`, con en-US como respaldo y cambio de idioma sin recargar |
| Formatos | `Intl.NumberFormat` e `Intl.DateTimeFormat` con los datos del perfil del país (`moneyScale`, `hourCycle`, zona IANA). El dinero viaja en unidades menores y solo se convierte al mostrarlo |
| Tiempo real | `@stomp/stompjs` sobre `/subsystems/notifications/ws`, con el JWT en el CONNECT. Temas `/topic/users.<id>` y `/topic/requests.<id>` |
| Mapas | Leaflet con OpenStreetMap (`react-leaflet`) |
| Estilos | CSS propio con variables, modo oscuro, Noto Sans y Noto Sans JP (japonés) |
| Pruebas | Vitest (formatos e idiomas) y Playwright (pedido de punta a punta con capturas) |

Se eligió React en lugar de Angular (D11) porque era lo más rápido de construir y cubre lo mismo que pide F9.

## Cómo correrlo

Requisitos: Node 20 o superior y el backend en marcha.

```bash
# 1. Backend (en Jornal-BK); con --profile full se levantan las 5 regiones
docker compose -f infra/docker-compose.yml up -d --build --wait
./scripts/seed-demo.sh            # usuarios de prueba por país

# 2. Frontend (en Jornal-FT)
npm install
npm run dev                       # http://localhost:4200
```

En desarrollo, Vite reenvía `/api` y `/subsystems` (también el WebSocket) al gateway en `localhost:8000`, que es la configuración que está en `vite.config.ts`. Por eso la app y la API comparten origen y no hace falta CORS; los subsistemas no lo tienen configurado. Si el gateway corre en otra dirección, se usa `GATEWAY_URL=http://host:puerto npm run dev`.

Build de producción: `npm run build`, que deja todo en `dist/`. Ese contenido lo sirve cualquier servidor estático, siempre que reenvíe `/api` y `/subsystems` al gateway.

## Usuarios de prueba

Los crea `scripts/seed-demo.sh` en cada región (`co`, `br`, `us`, `fr`, `jp`):

| Rol | Correo | Clave |
| --- | --- | --- |
| Cliente | `cliente@<país>.jornal.test` | `Demo12345` |
| Comercio | `comercio@<país>.jornal.test` | `Demo12345` |
| Trabajador | `trabajador@<país>.jornal.test` | `Demo12345` |
| Administrador | `admin@<país>.jornal.test` | `Admin12345` |

## Pantallas por rol

| Rol | Pantallas |
| --- | --- |
| Todos | País e idioma, registro con formulario por país, inicio de sesión, perfil, contraseña, consentimiento y avisos en vivo |
| Cliente | Catálogo traducido con precios del país, armado del pedido (cantidad, fecha en la zona del lugar, dirección por país y mapa), cotización con desglose, medios de pago del país, propina según `tipMode`, seguimiento con mapa y estados en vivo, cancelación, confirmación, comprobante imprimible, calificación e historial |
| Comercio | Todo lo del cliente, más el perfil empresarial (razón social, identificación fiscal y dirección de facturación). Los comprobantes salen a su identificación fiscal |
| Trabajador | Disponibilidad, ofertas con cuenta regresiva (aceptar o rechazar), en camino con ubicación cada 7 s (GPS o recorrido simulado), iniciar y terminar, ganancias, perfil con categorías, radio y ubicación base, y calificar al cliente |
| Administrador | Consola de la región (tablero, servicios caídos, colas y enlace a Grafana), usuarios y verificación, pedidos, categorías con traducciones y precios, perfil del país (impuestos, propina, comisión, desplazamiento y festivos), tasas de cambio y reporte consolidado de ingresos |

## Cómo se conecta con el backend

- **Región:** la pantalla inicial fija la URL base `/api/{país}`. La lista de países sale de cualquier core que responda.
- **Sesión:** el access token dura 15 minutos y vive solo en memoria. El refresh token se guarda en `sessionStorage`, nunca en `localStorage`. Ante un 401, la app llama a `POST /auth/refresh` una sola vez; si eso falla, cierra la sesión (`src/api/client.ts`).
- **Cabeceras:** cada petición lleva `Authorization`, `Accept-Language` (así los errores del backend llegan traducidos) y `X-Correlation-Id`. Al crear un pedido se agrega `Idempotency-Key`, con la misma clave si se reintenta.
- **Formularios por país:** el registro, las direcciones y el perfil de comercio se arman con `GET /region-profile` (`addressSchema`, `nameOrder`, `documentTypes`, `phonePrefix`, `paymentMethods`, `tipMode`). El código no tiene reglas por país.
- **Errores:** se muestra el `detail` del `ProblemDetail` (ya traducido) con su `code`, y los errores por campo aparecen junto a cada campo.

## Pruebas

```bash
npm run lint                               # ESLint (TypeScript y reglas de hooks)
npm test                                   # unitarias: formatos (U+202F en francés, JPY sin decimales, zonas) y claves de los 6 idiomas
npx playwright install chromium            # solo la primera vez (o usar el navegador instalado: PW_CHANNEL=chrome)
npx playwright test                        # pedido de punta a punta en CO (backend en Docker + seed-demo)
REGIONS=co,br,us,fr,jp npx playwright test e2e/pedido.spec.ts # las 5 regiones (requiere --profile full)
```

La prueba de Playwright (`e2e/pedido.spec.ts`) arma el pedido de prueba D4 (2 jornadas de bodega, desplazamiento y propina) y lo lleva de punta a punta con dos navegadores, uno del cliente y otro del trabajador. Deja capturas del carrito, la oferta, el seguimiento y el comprobante en `docs/evidencias/frontend/`.

Otras pruebas de Playwright:

- `e2e/trabajador.spec.ts`: Inicio, modal de nueva oferta y detalle de oferta del trabajador a 390 px y en escritorio. Deja capturas en `docs/evidencias/trabajador/`.
- `e2e/ancho-movil.spec.ts`: comprueba que no haya scroll horizontal a 360 y 390 px en las pantallas de cada rol, en español, francés, portugués y japonés.

## App del trabajador

El rol trabajador tiene su propio diseño móvil (`documento.md` de este repositorio), en `src/worker/`:

- Columna de máximo 480 px, navegación inferior (Inicio, Mapa, Ganancias, Mensajes y Perfil) y los tokens del mockup en `src/worker/worker.css`.
- Íconos de `lucide-react` y fuente Inter.
- Inicio con disponibilidad, estadísticas, mapa de la zona y ofertas ordenadas por compatibilidad.
- Modal de nueva oferta con cuenta regresiva, y detalle de oferta con barra de acciones fija.

Parte de lo que muestra la oferta todavía no lo entrega el backend (empresa, compatibilidad, requisitos, total a recibir, coordenadas…). Esos datos salen de `src/mocks/trabajador.ts`. La lista de pendientes y el cambio propuesto en el backend para cada uno están en [`docs/pendientes-backend.md`](docs/pendientes-backend.md).
