# Diseño de la app del trabajador — Chambas (Jornal)

Documento de referencia para implementar o corregir las pantallas del rol **trabajador** en el frontend (React + Vite + TypeScript). El diseño sale de un mockup móvil hecho antes del desarrollo: la meta es que la app se vea y se comporte igual en formato móvil.

---

## 0. Instrucciones para Claude Code

1. Lee este documento completo y mira las imágenes de referencia de `docs/diseno/` antes de tocar código.
2. Revisa primero cómo está armado el frontend: rutas, layouts, cliente de API, tipos, solución de estilos (CSS Modules, Tailwind, styled-components u otra) y librería de íconos. **Reutiliza lo que ya existe**: no cambies de solución de estilos ni de router.
3. Antes de cambiar nada, compara lo que hay hoy con este documento y haz una lista corta de diferencias.
4. No inventes endpoints. Usa los servicios y tipos existentes. Si una pantalla necesita un dato que el backend no entrega, usa un dato de ejemplo en un archivo aparte (por ejemplo `src/mocks/trabajador.ts`) y anótalo en el resumen final.
5. Solo cambia vistas del trabajador. No modifiques las de contratante ni administrador; si tienes que ajustar un componente compartido, dilo en el resumen.
6. Antes de agregar una dependencia, comprueba si ya hay algo equivalente. Si agregas alguna, inclúyela en el resumen.
7. Trabaja por partes: tokens y componentes base → Inicio → Detalle de oferta → Modal de nueva oferta. Al terminar cada parte, verifica que compila (`npm run build`) y que pasa el lint.
8. Al final entrega un resumen: archivos cambiados, qué quedó igual al mockup, qué se apartó y por qué, y qué sigue pendiente (sección 10).

### Imágenes de referencia

| Archivo | Contenido |
|---|---|
| `docs/diseno/01-inicio.png` | Inicio del trabajador |
| `docs/diseno/02-nueva-oferta.png` | Modal de nueva oferta entrante |
| `docs/diseno/03-detalle-oferta.png` | Detalle de oferta, parte superior |
| `docs/diseno/04-detalle-oferta-scroll.png` | Detalle de oferta, parte inferior |

El marco del teléfono, la barra de estado (hora 9:41, señal, batería) y la muesca son parte del mockup, **no** de la interfaz: no se implementan.

---

## 1. Principios generales

- **Mobile-first.** Ancho de referencia: 390 px. En pantallas más anchas la app se muestra en una columna centrada de máximo 480 px sobre el fondo gris; no se estira a todo el ancho del escritorio.
- Idioma: español de Colombia. Moneda: pesos colombianos sin decimales.
- Solo tema claro por ahora.
- Fondo general gris muy claro; el contenido va en tarjetas blancas separadas por borde, casi sin sombra.
- La barra de navegación inferior y la barra de acciones fija respetan las zonas seguras del teléfono (`env(safe-area-inset-bottom)`).
- Toda área táctil mide mínimo 44 × 44 px.
- Foco visible al navegar con teclado y respeto de `prefers-reduced-motion`.

---

## 2. Tokens de diseño

Los valores son aproximados, tomados de las capturas. Si aparece el archivo original del mockup, sus valores mandan. Defínelos una sola vez (variables CSS en `:root` o el theme de la solución de estilos del proyecto) y úsalos en todos los componentes: nada de colores sueltos dentro de los componentes.

### 2.1 Colores

| Token | Valor aprox. | Uso |
|---|---|---|
| `--color-primary` | `#4B4FB5` | Botón Aceptar, encabezado del modal, íconos de estadísticas, ítem activo de la navegación, pines y celdas del mapa |
| `--color-primary-soft` | `#ECEDFA` | Píldora del ítem activo de la navegación, cuadro del ícono de la oferta, insignia de categoría (Cotero) |
| `--color-success` | `#1E7A4C` | Interruptor encendido, anillo de compatibilidad, monto "Recibes", punto de Disponible, chulos de requisitos |
| `--color-success-soft` | `#E6F4EC` | Fondo de la tarjeta Disponible, insignia "Paga a tiempo" |
| `--color-success-border` | `#A9D6BC` | Borde de la tarjeta Disponible |
| `--color-warning-soft` | `#FEF3C7` | Fondo de la insignia Urgente |
| `--color-warning-text` | `#A15C07` | Texto e ícono de la insignia Urgente |
| `--color-star` | `#F5B301` | Estrella de calificación |
| `--color-danger` | `#E5484D` | Punto de notificaciones sin leer |
| `--color-text` | `#111827` | Títulos, valores y montos |
| `--color-text-muted` | `#6B7280` | Subtítulos, etiquetas y metadatos |
| `--color-border` | `#E5E7EB` | Bordes de tarjetas, chips, botón Rechazar, separadores |
| `--color-surface` | `#FFFFFF` | Tarjetas, navegación inferior, barra de acciones |
| `--color-surface-muted` | `#F3F4F6` | Recuadros de información (Fecha, Horario…) y píldoras de datos del modal |
| `--color-bg` | `#F5F6F8` | Fondo general de la app |

Mapa: calles principales `#F7E2A8`, manzanas `#E9EBEF`, agua `#CFE3F5`, parques `#D8EDD8`. Celdas hexagonales con relleno `--color-primary` al 15 % de opacidad y borde al 35 %.

### 2.2 Tipografía

Fuente **Inter** (por `@fontsource/inter` o Google Fonts), con respaldo `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

| Uso | Tamaño | Peso |
|---|---|---|
| Nombre en el saludo ("Carlos") | 20 px | 700 |
| Título del detalle de oferta | 22 px | 700 |
| Título del modal de nueva oferta | 20 px | 700 |
| Títulos de sección ("Ofertas para ti", "Requisitos", "Pago") | 17 px | 700 |
| Título de la tarjeta de oferta | 17 px | 700 |
| Monto destacado ("$95.000") | 22–26 px | 800 |
| Valor de estadística ("$503.000") | 18 px | 700 |
| Texto normal | 15 px | 400–500 |
| Etiquetas y metadatos | 13 px | 400–500 |
| Texto de la navegación inferior | 12 px | 500 (600 en el activo) |

Interlineado: 1.25 en títulos, 1.5 en párrafos.

### 2.3 Forma y espacio

- Margen lateral de pantalla: 20 px.
- Separación entre bloques: 16 px. Dentro de una tarjeta: 12 px.
- Radios: tarjetas grandes 20 px; tarjetas pequeñas y recuadros 14–16 px; botones 14 px; chips, insignias y píldoras totalmente redondeados (`999px`); botones de ícono circulares.
- Bordes: 1 px `--color-border`.
- Sombra solo en elementos flotantes (campana, atrás, compartir, "Ver en el mapa") y en el modal: `0 4px 12px rgba(17, 24, 39, 0.08)`.

### 2.4 Íconos

Íconos de línea con trazo de 1.75–2 px; 20 px por defecto, 16–18 px en metadatos y 24 px en la navegación. Los del mockup corresponden a **Lucide** (`lucide-react`):

`TrendingUp`, `Briefcase`, `Star`, `Bell`, `BadgeCheck`, `Map`, `SlidersHorizontal`, `Package`, `Zap`, `MapPin`, `Clock`, `CalendarDays`, `Building2`, `ShieldCheck`, `Share2`, `ChevronLeft`, `CircleCheck`, `House`, `Wallet`, `MessageCircle`, `User`.

Si el proyecto ya usa otra librería de íconos, busca los equivalentes en ella.

---

## 3. Formatos de datos

| Dato | Formato | Ejemplo |
|---|---|---|
| Dinero | `$` pegado al número, punto de miles, sin decimales | `$95.000`, `$11.875/h` |
| Distancia | coma decimal, una cifra | `1,2 km` |
| Hora | 12 horas con "a. m." / "p. m."; rangos con raya (–) entre espacios | `7:00 a. m. – 3:00 p. m.` |
| Duración | `8 h` en tarjetas y modal; `8 horas` en el detalle | |
| Día | relativo cuando aplica | `Hoy`, `Mañana`; si no, fecha corta (`sáb 28 nov`) |
| Calificación | una cifra decimal | `4.8` (ver pendiente 10.1) |
| Compatibilidad | entero con % | `96%` |

`Intl.NumberFormat` con `style: 'currency'` en `es-CO` pone un espacio después del `$` ("$ 95.000"), y el mockup no lo lleva. Por eso se arma a mano:

```ts
// src/utils/format.ts
const miles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
export const formatCOP = (valor: number) => `$${miles.format(valor)}`; // $95.000

const unDecimal = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export const formatKm = (km: number) => `${unDecimal.format(km)} km`; // 1,2 km

export const formatHora = (fecha: Date) =>
  fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }); // 7:00 a. m.

export const formatRangoHoras = (inicio: Date, fin: Date) =>
  `${formatHora(inicio)} – ${formatHora(fin)}`;

export const formatCalificacion = (valor: number) => valor.toFixed(1); // 4.8
```

Comprueba en el navegador que `formatHora` da "7:00 a. m."; si el resultado no coincide, arma el texto a mano.

---

## 4. Estructura y navegación

- **Layout del trabajador** (usa el que exista o crea `TrabajadorLayout`): área de contenido con scroll y navegación inferior fija.
- **Navegación inferior**, 5 ítems con ícono arriba y texto abajo: Inicio (`House`), Mapa (`Map`), Ganancias (`Wallet`), Mensajes (`MessageCircle`), Perfil (`User`).
  - Activo: ícono y texto en `--color-primary`; el ícono va dentro de una píldora `--color-primary-soft` de unos 56 × 32 px.
  - Inactivo: ícono y texto en gris oscuro (`#374151`).
  - Fondo blanco, borde superior de 1 px, alto aproximado de 64 px más la zona segura.
- El mockup solo diseña **Inicio**, el **detalle de oferta** y el **modal de nueva oferta**. Para Mapa, Ganancias, Mensajes y Perfil: si ya existen pantallas, mantenlas y solo aplícales los tokens; si no existen, crea una pantalla simple con título y un estado vacío, sin inventar un diseño.
- El **detalle de oferta** es una ruta propia (por ejemplo `/trabajador/ofertas/:id`, o la que ya use el proyecto), sin navegación inferior y con barra de acciones fija abajo.
- El **modal de nueva oferta** aparece encima de cualquier pantalla del trabajador.

---

## 5. Componentes base

| Componente | Descripción |
|---|---|
| `Button` | Primario: fondo `--color-primary`, texto blanco 600. Secundario: fondo blanco, borde, texto `--color-text`. Alto 52 px, radio 14 px. Estados: presionado un poco más oscuro; deshabilitado al 50 % de opacidad; cargando con spinner, mismo texto y sin poder pulsarse dos veces. |
| `IconButton` | Círculo blanco de 44 px con sombra suave e ícono de 20 px. Siempre con `aria-label` ("Notificaciones", "Volver", "Compartir"). |
| `Card` | Fondo blanco, borde 1 px, radio 20 px (16 px en las pequeñas), padding 16 px. |
| `StatCard` | Ícono primario arriba a la izquierda, valor debajo y etiqueta gris. Tres en fila del mismo ancho (grid de 3 columnas, separación 10 px). |
| `Switch` | 52 × 30 px; pista verde (`--color-success`) encendido y gris (`#D1D5DB`) apagado; perilla blanca. `role="switch"` y `aria-checked`. |
| `Badge` | Píldora de 26 px de alto, texto 13 px 600. Variantes: `urgent` (ícono `Zap` + texto, fondo `--color-warning-soft`, texto `--color-warning-text`), `category` (fondo `--color-primary-soft`, texto primario) y `success` (fondo `--color-success-soft`, texto verde). |
| `Chip` | Botón píldora blanco con borde, 40 px de alto, texto 15 px 500. Puede llevar ícono a la izquierda. |
| `CompatibilityRing` | SVG circular de 48–52 px, trazo de 4 px: pista gris clara y arco verde proporcional al porcentaje, empezando arriba en sentido horario. Porcentaje centrado (13 px, 700). `aria-label="Compatibilidad 96%"`. |
| `CountdownRing` | Igual al anterior pero en blanco sobre el encabezado primario: pista blanca al 30 %, arco blanco que se vacía y número de segundos restantes en el centro. |
| `InfoTile` | Recuadro `--color-surface-muted`, radio 14 px, padding 12–14 px. Arriba la etiqueta (ícono 16 px + texto 13 px gris); abajo el valor (16 px, 700). |
| `MetaRow` | Ícono de 16 px + texto 14 px, ambos en gris. |
| `ActionBar` | Barra blanca fija abajo con borde superior, padding `12px 20px` más la zona segura; contiene Rechazar (secundario) y Aceptar (primario). |

---

## 6. Pantallas

### 6.1 Inicio (`docs/diseno/01-inicio.png`)

Orden de arriba hacia abajo, con margen lateral de 20 px.

**Encabezado**
- Avatar circular de 52 px con la foto del trabajador. Si está verificado, insignia de 18 px abajo a la derecha: círculo primario con chulo blanco (`BadgeCheck`) y borde blanco de 2 px. Sin foto: iniciales sobre `--color-primary-soft`.
- Saludo en dos líneas: "Buenos días," (15 px, gris) y el nombre (20 px, 700). El saludo cambia con la hora: "Buenos días" hasta las 11:59, "Buenas tardes" de 12:00 a 17:59 y "Buenas noches" desde las 18:00.
- A la derecha, `IconButton` con `Bell`. Si hay notificaciones sin leer, punto `--color-danger` de 8–10 px arriba a la derecha del ícono.

**Tarjeta de disponibilidad**
- Fondo `--color-success-soft`, borde `--color-success-border`, radio 18 px, padding 16 px.
- Izquierda: punto verde de 10 px; "Disponible" (16 px, 700) y debajo "Recibiendo ofertas a {radio} km · {zona}" (13 px, gris).
- Derecha: `Switch` encendido. Al cambiarlo se actualiza la disponibilidad en el backend; mientras responde, el interruptor queda deshabilitado y, si falla, vuelve a su estado anterior con un mensaje.
- Apagado: ver pendiente 10.3.

**Estadísticas** (3 `StatCard`)

| Ícono | Valor | Etiqueta |
|---|---|---|
| `TrendingUp` | Ganancias de la semana (`$503.000`) | Esta semana |
| `Briefcase` | Trabajos completados (`142`) | Completados |
| `Star` | Calificación (`4.9`) | Calificación |

**Mapa de la zona**
- Tarjeta a todo el ancho, unos 120 px de alto, radio 20 px, contenido recortado al borde.
- Muestra la ubicación del trabajador (círculo primario de 16 px con borde blanco de 3 px y un halo suave), las celdas hexagonales de su zona, pines en forma de gota de las ofertas cercanas y los nombres de las localidades en mayúsculas pequeñas grises (como en el mockup).
- Píldora blanca flotante abajo a la derecha: ícono `Map` + "Ver en el mapa".
- En Inicio no se puede arrastrar ni hacer zoom; tocar la tarjeta o el botón lleva a la pestaña Mapa.

**Ofertas para ti**
- Encabezado en una fila: "Ofertas para ti" (17 px, 700) a la izquierda y "Por compatibilidad" (13 px, gris) a la derecha, que indica el orden. La lista va de mayor a menor compatibilidad.
- Fila de chips con scroll horizontal, sin barra de scroll visible, que llega hasta el borde derecho de la pantalla: primero "Filtros" con `SlidersHorizontal` (abre los filtros) y luego un chip por categoría (Cotero, Auxiliar de bodega…), que filtra la lista.
- Lista de `OfferCard` con 12 px de separación.

**`OfferCard`** (toda la tarjeta lleva al detalle de la oferta)
- Tarjeta blanca, radio 20 px, padding 16 px.
- Fila superior en tres columnas:
  1. Cuadro de 48 px, fondo `--color-primary-soft`, radio 14 px, con el ícono de la categoría en primario (`Package` en el ejemplo).
  2. Columna central: fila con la insignia Urgente (si aplica) y el día ("Hoy", 13 px, gris); título (17 px, 700, máximo 2 líneas y luego "…"); empresa en gris + " · " + estrella amarilla + calificación (600).
  3. `CompatibilityRing` alineado arriba a la derecha.
- Debajo, desde el borde izquierdo de la tarjeta: `MetaRow` con `MapPin` ("Fontibón · 1,2 km") y `MetaRow` con `Clock` ("7:00 a. m. – 3:00 p. m.").
- Separador de 1 px.
- Pie: a la izquierda "8 h · $11.875/h" (13 px, gris); a la derecha el total "$95.000" (22 px, 800).

### 6.2 Modal de nueva oferta (`docs/diseno/02-nueva-oferta.png`)

Aparece cuando llega una oferta nueva y el trabajador está disponible, por el canal en tiempo real que ya use el proyecto (WebSocket, SSE o consulta periódica).

- Fondo de la pantalla oscurecido (`rgba(17, 24, 39, 0.45)`). Tarjeta con las cuatro esquinas redondeadas (radio 24 px), ancho de la pantalla menos 16 px por lado, centrada (ver pendiente 10.6).
- **Encabezado** fondo `--color-primary`, padding 16 px: `Zap` blanco + "Nueva oferta para ti · {n}% compatible" (15 px, 700, blanco, hasta 2 líneas). A la derecha, `CountdownRing` de 44 px con los segundos que quedan.
- **Cuerpo** blanco, padding 20 px:
  - Título (20 px, 700).
  - Empresa en gris + " · " + estrella + calificación.
  - Dos píldoras `--color-surface-muted` en fila: `MapPin` + distancia ("0,8 km") y `Clock` + duración y día ("6 h · Hoy").
  - Fila: horario a la izquierda (14 px, gris) y monto a la derecha (26 px, 800).
  - Botones en dos columnas iguales: "Rechazar" (secundario) y "Aceptar" (primario), 52 px de alto.
- **Comportamiento**
  - La cuenta regresiva sale de la hora de expiración que envíe el backend (ver pendiente 10.2). Al llegar a 0 el modal se cierra solo y la oferta queda como no respondida.
  - Aceptar: llama al endpoint de aceptar; los dos botones se deshabilitan y Aceptar muestra spinner. Si sale bien, se cierra el modal y aparece la confirmación "Oferta aceptada". Si falla, el modal sigue abierto con el motivo que devuelva el backend (por ejemplo, que otra persona ya la tomó).
  - Rechazar: llama al endpoint de rechazo, cierra el modal y confirma con "Oferta rechazada".
  - Accesibilidad: `role="dialog"`, `aria-modal="true"`, el foco queda dentro del modal mientras está abierto y la cuenta regresiva no se anuncia cada segundo al lector de pantalla.
  - Animación de entrada corta (unos 200 ms, escala y opacidad), desactivada con `prefers-reduced-motion`.

### 6.3 Detalle de oferta (`docs/diseno/03-detalle-oferta.png` y `04-detalle-oferta-scroll.png`)

**Mapa superior**
- A todo el ancho, sin margen, unos 230 px de alto.
- Celdas hexagonales, marcador del lugar de trabajo (cuadrado redondeado primario de 28 px con un ícono blanco), ubicación del trabajador (círculo primario) y una línea corta entre ambos; nombres de localidades.
- Botones flotantes `IconButton`: `ChevronLeft` arriba a la izquierda (vuelve a la pantalla anterior) y `Share2` arriba a la derecha. Compartir usa `navigator.share` con el título y el enlace de la oferta; si el navegador no lo soporta, copia el enlace y muestra "Enlace copiado".

**Contenido** (fondo `--color-bg`, padding 20 px)
1. Insignias en fila: categoría (`category`, "Cotero") y Urgente si aplica.
2. Título (22 px, 700) a la izquierda y `CompatibilityRing` de 52 px a la derecha.
3. Tarjeta de la empresa: cuadro de 48 px `--color-surface-muted` con `Building2`; nombre (16 px, 700) con `ShieldCheck` primario si está verificada; debajo estrella + calificación (600) + número de reseñas en gris ("(214)"); a la derecha, insignia `success` "Paga a tiempo" solo si aplica.
4. Grilla de 2 × 2 `InfoTile` con 10 px de separación:

   | Ícono | Etiqueta | Valor de ejemplo |
   |---|---|---|
   | `CalendarDays` | Fecha | Hoy |
   | `Clock` | Horario | 7:00 a. m. – 3:00 p. m. |
   | `MapPin` | Distancia | 1,2 km · Fontibón |
   | `Clock` | Duración | 8 horas |

5. Dirección: `MapPin` + dirección (14 px, gris), por ejemplo "Cra. 106 #15A-25, Zona Franca".
6. **Descripción**: título de sección y párrafo (15 px, interlineado 1.5).
7. **Requisitos**: título de sección y lista; cada ítem con `CircleCheck` verde de 20 px y texto de 15 px.
8. **Pago**: tarjeta blanca con filas separadas por líneas de 1 px y padding vertical de 14 px; etiqueta en gris a la izquierda, valor a la derecha (500–600).

   | Etiqueta | Valor de ejemplo |
   |---|---|
   | Pago por jornada | $95.000 |
   | Valor por hora | $11.875 |
   | Comisión Chambas | La paga el contratante |
   | **Recibes** (17 px, 700, en negro) | **$95.000** (22 px, 800, `--color-success`) |

   Muestra los valores que entregue el backend. Si solo llegan el pago por jornada y la duración, el valor por hora es el pago dividido entre las horas, redondeado.
9. Nota final (13 px, gris): "El pago se libera a tu saldo al finalizar y confirmar el trabajo."

**Barra de acciones fija**
- `ActionBar` con "Rechazar" (secundario, unos 35 % del ancho) y "Aceptar · $95.000" (primario, el resto).
- El contenido deja abajo un espacio igual a la altura de la barra más 16 px, para que la descripción y la nota final nunca queden tapadas. En la captura 04 la barra aparece a mitad de pantalla y tapa el texto de la descripción por cómo se tomó la captura; lo correcto es que esté siempre fija abajo.
- Aceptar y Rechazar se comportan igual que en el modal (sección 6.2).
- Si la oferta ya no está disponible (expiró o la tomó otra persona), la barra se oculta y en su lugar aparece un aviso que lo explique.

---

## 7. Estados y textos

- **Cargando:** bloques de carga (skeleton) con la forma de las tarjetas; nada de spinners a pantalla completa.
- **Sin ofertas:** si el trabajador está disponible, "No hay ofertas cerca por ahora" y debajo "Te avisaremos cuando llegue una nueva". Si no está disponible: "Activa tu disponibilidad para recibir ofertas".
- **Error al cargar:** qué falló, en una frase, y un botón "Reintentar".
- **Mismo verbo en todo el flujo:** el botón "Aceptar" confirma con "Oferta aceptada"; "Rechazar" con "Oferta rechazada".
- **Movimiento:** solo como respuesta a una acción (abrir el modal, mover el interruptor). Sin animaciones de entrada en cada tarjeta.

---

## 8. Datos que necesita cada pantalla (referencia)

Ajusta los nombres a los DTO reales del backend; esto solo indica qué información usa cada pantalla. No crees endpoints a partir de estos tipos.

```ts
export interface ResumenTrabajador {
  nombre: string;
  fotoUrl?: string;
  verificado: boolean;
  disponible: boolean;
  radioKm: number;              // 5
  zona: string;                 // "Fontibón"
  gananciasSemana: number;      // COP
  trabajosCompletados: number;
  calificacion: number;         // 0 a 5
  notificacionesSinLeer: number;
}

export interface EmpresaResumen {
  nombre: string;
  calificacion: number;
  totalResenas: number;
  verificada: boolean;
  pagaATiempo: boolean;
}

export interface Oferta {
  id: string;
  titulo: string;
  categoria: string;            // "Cotero", "Auxiliar de bodega"
  urgente: boolean;
  compatibilidad: number;       // 0 a 100
  empresa: EmpresaResumen;
  inicio: string;               // ISO 8601
  fin: string;                  // ISO 8601
  duracionHoras: number;
  distanciaKm: number;
  zona: string;
  direccion: string;
  descripcion: string;
  requisitos: string[];
  pagoJornada: number;          // COP
  valorHora: number;            // COP
  comision: { pagadaPor: 'contratante' | 'trabajador'; valor: number };
  montoTrabajador: number;      // lo que recibe el trabajador
  ubicacion: { lat: number; lng: number };
}

export interface OfertaEntrante {
  oferta: Oferta;
  expiraEn: string;             // ISO 8601; de aquí sale la cuenta regresiva
}
```

---

## 9. Lista de verificación

- [ ] Los tokens de la sección 2 están definidos en un solo lugar y los componentes no usan colores sueltos.
- [ ] Con 390 px de ancho, Inicio, el detalle y el modal se ven como las capturas de `docs/diseno/`.
- [ ] En escritorio la app queda en una columna centrada de máximo 480 px.
- [ ] Montos, distancias y horas usan los formatos de la sección 3.
- [ ] La navegación inferior marca el ítem activo y respeta la zona segura.
- [ ] El chip de categoría filtra y la lista va ordenada por compatibilidad.
- [ ] La barra de acciones del detalle queda fija y no tapa contenido.
- [ ] El modal cuenta hacia atrás, se cierra solo al llegar a 0 y maneja aceptar, rechazar y error.
- [ ] Hay estados de carga, vacío y error.
- [ ] Los botones de ícono tienen `aria-label` y el interruptor usa `role="switch"`.
- [ ] `npm run build` y el lint pasan sin errores.

---

## 10. Decisiones pendientes

El mockup no define estos puntos. Mientras no se decidan, aplica lo indicado y menciónalos en el resumen.

1. **Separador decimal de la calificación.** El mockup usa punto en calificaciones (`4.8`) y coma en distancias (`1,2 km`). Por ahora se replica el mockup.
2. **Duración de la cuenta regresiva del modal.** Debe salir de `expiraEn` del backend. Si no llega, usar una constante (`TIEMPO_RESPUESTA_OFERTA_SEG`) en un solo lugar.
3. **Estado "No disponible".** Propuesta: tarjeta blanca con borde normal, punto gris, "No disponible" y subtítulo "Actívalo para recibir ofertas"; no llegan ofertas nuevas.
4. **Color del anillo con compatibilidad baja.** El mockup solo muestra valores altos (verde). Por ahora verde siempre.
5. **Mapa real o ilustración.** El mockup usa una cuadrícula hexagonal. Si el backend organiza las zonas por celdas (por ejemplo, H3), se pueden dibujar con `h3-js` sobre un mapa (Leaflet o MapLibre con OpenStreetMap). Mientras tanto, basta un componente de mapa con la ubicación, la zona y los pines, sin depender de un servicio de pago.
6. **Posición del modal de nueva oferta:** centrado (por defecto) o pegado abajo.
7. **Qué pasa después de aceptar:** quedarse en la pantalla actual con la confirmación (por defecto) o ir a otra pantalla.
8. **Estilo del chip seleccionado.** No aparece en el mockup. Propuesta: fondo `--color-primary-soft`, borde y texto en primario.